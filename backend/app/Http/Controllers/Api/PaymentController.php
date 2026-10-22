<?php

namespace App\Http\Controllers\Api;

use App\Actions\RecordPaymentAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Models\BillingAccount;
use App\Models\NotificationLog;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $payments = Payment::query()
            ->with(['receipt', 'student', 'recordedBy'])
            ->when($user->role->value === 'cashier', fn ($query) => $query->where('recorded_by', $user->id))
            ->when($request->filled('student_id'), fn ($query) => $query->where('student_id', $request->integer('student_id')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->value()))
            ->latest('recorded_at')
            ->latest('id')
            ->paginate(25);

        return response()->json([
            'data' => $payments->getCollection()->map(fn (Payment $payment): array => $this->paymentData($payment))->all(),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    public function searchStudents(Request $request): JsonResponse
    {
        $query = trim($request->string('query')->value());

        $students = Student::query()
            ->with(['gradeLevel:id,name', 'section:id,name', 'billingAccounts' => function ($accountQuery): void {
                $accountQuery->whereHas('schoolYear', fn ($yearQuery) => $yearQuery->where('is_current', true))
                    ->select(['id', 'student_id', 'balance_cents']);
            }])
            ->when($query !== '', function ($studentQuery) use ($query): void {
                $studentQuery->where(function ($matchQuery) use ($query): void {
                    $matchQuery->where('full_name', 'like', "%{$query}%")
                        ->orWhere('student_no', 'like', "%{$query}%");
                });
            })
            ->orderBy('full_name')
            ->limit(10)
            ->get();

        return response()->json([
            'data' => $students->map(function (Student $student): array {
                $account = $student->billingAccounts->first();

                return [
                    'id' => (string) $student->id,
                    'number' => $student->student_no,
                    'name' => $student->full_name,
                    'grade' => $student->gradeLevel?->name,
                    'section' => $student->section?->name,
                    'balance_cents' => $account?->balance_cents ?? 0,
                ];
            })->all(),
        ]);
    }

    public function context(Student $student): JsonResponse
    {
        $account = BillingAccount::query()
            ->with(['installments' => fn ($query) => $query->orderBy('due_date')->orderBy('sequence'), 'schoolYear'])
            ->whereBelongsTo($student)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_current', true))
            ->firstOrFail();
        $nextInstallment = $account->installments->first(fn ($installment): bool => $installment->paid_cents < $installment->amount_cents);

        return response()->json([
            'data' => [
                'student' => [
                    'id' => (string) $student->id,
                    'number' => $student->student_no,
                    'name' => $student->full_name,
                ],
                'billing_account_id' => (string) $account->id,
                'balance_cents' => $account->balance_cents,
                'next_installment' => $nextInstallment === null ? null : [
                    'id' => (string) $nextInstallment->id,
                    'label' => $nextInstallment->label,
                    'due_date' => $nextInstallment->due_date->toDateString(),
                    'amount_due_cents' => $nextInstallment->amount_cents - $nextInstallment->paid_cents,
                ],
            ],
        ]);
    }

    public function store(StorePaymentRequest $request, RecordPaymentAction $recordPayment, AuditLogger $auditLogger): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();
        $account = BillingAccount::query()->findOrFail($validated['billing_account_id']);
        $payment = $recordPayment->handle(
            $account,
            $validated['amount_cents'],
            $user,
            $validated['paid_on'],
            $validated['notes'] ?? null,
            $validated['backdate_reason'] ?? null,
            $validated['duplicate_override_reason'] ?? null,
        );
        $payment->loadMissing(['billingAccount', 'receipt', 'student.guardians']);
        $guardian = $payment->student->guardians->firstWhere('pivot.is_primary', true) ?? $payment->student->guardians->first();
        $notificationChannels = $validated['notification_channels'] ?? ['email'];
        $smsLoadFeeCents = $this->smsLoadFeeCents();
        $notificationLogs = [];

        foreach ($notificationChannels as $channel) {
            $isSms = $channel === 'sms';
            $recipient = $isSms ? $guardian?->mobile : $guardian?->email;
            $notificationLogs[$channel] = NotificationLog::query()->create([
                'student_id' => $payment->student_id,
                'payment_id' => $payment->id,
                'guardian_email' => $isSms ? null : $recipient,
                'guardian_mobile' => $isSms ? $recipient : null,
                'channel' => $channel,
                'load_fee_cents' => $isSms && $recipient !== null ? $smsLoadFeeCents : null,
                'kind' => 'payment_confirmation',
                'status' => $recipient === null ? 'not_sent' : 'queued',
                'failure_reason' => $recipient === null
                    ? ($isSms ? 'No guardian mobile number is available.' : 'No guardian email is available.')
                    : null,
            ]);
        }
        $auditLogger->record($request, 'payment.recorded', $payment, null, [
            'amount_cents' => $payment->amount_cents,
            'receipt_no' => $payment->receipt->receipt_no,
        ]);

        return response()->json([
            'data' => [
                ...$this->paymentData($payment),
                'email_queued' => ($notificationLogs['email'] ?? null)?->status === 'queued',
                'sms_queued' => ($notificationLogs['sms'] ?? null)?->status === 'queued',
                'sms_load_fee_cents' => ($notificationLogs['sms'] ?? null)?->load_fee_cents,
            ],
        ], 201);
    }

    public function show(Request $request, Payment $payment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if ($user->role->value === 'cashier' && $payment->recorded_by !== $user->id) {
            abort(404);
        }

        $payment->load(['allocations.installment', 'billingAccount', 'receipt', 'recordedBy', 'student', 'voidRequest']);

        return response()->json(['data' => $this->paymentData($payment, true)]);
    }

    public function reprint(Request $request, Payment $payment, AuditLogger $auditLogger): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if ($user->role->value === 'cashier' && $payment->recorded_by !== $user->id) {
            abort(404);
        }

        $payment->increment('reprint_count');
        $payment->refresh()->load(['receipt', 'student', 'billingAccount']);
        $auditLogger->record($request, 'receipt.reprinted', $payment, null, ['reprint_count' => $payment->reprint_count]);

        return response()->json(['data' => $this->paymentData($payment)]);
    }

    /** @return array<string, mixed> */
    private function paymentData(Payment $payment, bool $includeAllocations = false): array
    {
        $data = [
            'id' => (string) $payment->id,
            'student_id' => (string) $payment->student_id,
            'student_name' => $payment->student?->full_name,
            'billing_account_id' => (string) $payment->billing_account_id,
            'amount_cents' => $payment->amount_cents,
            'method' => $payment->method,
            'paid_on' => $payment->paid_on?->toDateString(),
            'status' => $payment->status,
            'receipt_no' => $payment->receipt?->receipt_no,
            'recorded_at' => $payment->recorded_at?->toISOString(),
            'recorded_by' => $payment->recordedBy?->full_name,
            'reprint_count' => $payment->reprint_count,
            'balance_after_cents' => $payment->billingAccount?->balance_cents,
        ];

        if ($includeAllocations) {
            $data['allocations'] = $payment->allocations->map(fn ($allocation): array => [
                'installment_label' => $allocation->installment->label,
                'amount_cents' => $allocation->amount_cents,
            ])->all();
        }

        return $data;
    }

    private function smsLoadFeeCents(): ?int
    {
        $configuredFee = config('services.sms.load_fee_cents');
        $fee = filter_var($configuredFee, FILTER_VALIDATE_INT);

        return $fee === false || $fee < 0 ? null : $fee;
    }
}
