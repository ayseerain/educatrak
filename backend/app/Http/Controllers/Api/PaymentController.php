<?php

namespace App\Http\Controllers\Api;

use App\Actions\RecordPaymentAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Models\AuditEntry;
use App\Models\BillingAccount;
use App\Models\NotificationLog;
use App\Models\Payment;
use App\Models\PaymentIdempotencyKey;
use App\Models\Student;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    /** Relations needed to render a full receipt without lazy loading. */
    private const RECEIPT_RELATIONS = [
        'allocations.installment', 'billingAccount.schoolYear', 'receipt', 'recordedBy', 'student.gradeLevel', 'student.section',
    ];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'query' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['valid', 'void_pending', 'voided'])],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'cashier' => ['nullable', 'string', 'max:100'],
            'method' => ['nullable', 'string', 'max:50'],
            'amount_min_cents' => ['nullable', 'integer', 'min:0'],
            'amount_max_cents' => ['nullable', 'integer', 'min:0'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50'],
        ]);
        if (isset($filters['amount_min_cents'], $filters['amount_max_cents']) && $filters['amount_max_cents'] < $filters['amount_min_cents']) {
            throw \Illuminate\Validation\ValidationException::withMessages(['amount_max_cents' => 'Maximum amount must be greater than or equal to minimum amount.']);
        }
        /** @var User $user */
        $user = $request->user();

        $payments = Payment::query()
            ->with(['receipt', 'student.gradeLevel', 'student.section', 'recordedBy'])
            ->when($user->role->value === 'cashier', fn ($query) => $query->where('recorded_by', $user->id))
            ->when(isset($filters['query']) && trim($filters['query']) !== '', function ($query) use ($filters): void {
                $search = trim($filters['query']);
                $query->where(function ($matching) use ($search): void {
                    $matching->whereHas('student', fn ($studentQuery) => $studentQuery
                        ->where('full_name', 'like', "%{$search}%")
                        ->orWhere('lrn', 'like', "%{$search}%"))
                        ->orWhereHas('receipt', fn ($receiptQuery) => $receiptQuery->where('receipt_no', 'like', "%{$search}%"));
                });
            })
            ->when(isset($filters['status']), fn ($query) => $query->where('status', $filters['status']))
            ->when(isset($filters['date_from']), fn ($query) => $query->whereDate('paid_on', '>=', $filters['date_from']))
            ->when(isset($filters['date_to']), fn ($query) => $query->whereDate('paid_on', '<=', $filters['date_to']))
            ->when(isset($filters['cashier']) && trim($filters['cashier']) !== '', fn ($query) => $query->whereHas('recordedBy', fn ($cashier) => $cashier->where('full_name', 'like', '%' . trim($filters['cashier']) . '%')))
            ->when(isset($filters['method']) && trim($filters['method']) !== '', fn ($query) => $query->where('method', trim($filters['method'])))
            ->when(isset($filters['amount_min_cents']), fn ($query) => $query->where('amount_cents', '>=', $filters['amount_min_cents']))
            ->when(isset($filters['amount_max_cents']), fn ($query) => $query->where('amount_cents', '<=', $filters['amount_max_cents']))
            ->latest('recorded_at')
            ->latest('id')
            ->paginate((int) ($filters['per_page'] ?? 10), ['*'], 'page', (int) ($filters['page'] ?? 1));

        return response()->json([
            'data' => $payments->getCollection()->map(fn (Payment $payment): array => $this->paymentData($payment))->all(),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'total' => $payments->total(),
                'per_page' => $payments->perPage(),
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
                        ->orWhere('lrn', 'like', "%{$query}%");
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
                    'number' => $student->lrn,
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
                    'number' => $student->lrn,
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
        $idempotencyKey = $validated['idempotency_key'];
        unset($validated['idempotency_key']);
        $requestHash = hash('sha256', json_encode($validated, JSON_THROW_ON_ERROR));

        try {
            [$responseBody, $responseStatus] = DB::transaction(function () use ($request, $recordPayment, $auditLogger, $user, $validated, $idempotencyKey, $requestHash): array {
                $idempotency = PaymentIdempotencyKey::query()->create([
                    'user_id' => $user->id,
                    'key' => $idempotencyKey,
                    'request_hash' => $requestHash,
                ]);

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

                $body = ['data' => [
                    ...$this->paymentData($payment),
                    'email_queued' => ($notificationLogs['email'] ?? null)?->status === 'queued',
                    'sms_queued' => ($notificationLogs['sms'] ?? null)?->status === 'queued',
                    'sms_load_fee_cents' => ($notificationLogs['sms'] ?? null)?->load_fee_cents,
                ]];
                $idempotency->forceFill([
                    'response_body' => $body,
                    'response_status' => 201,
                    'completed_at' => now(),
                ])->save();

                return [$body, 201];
            });

            return response()->json($responseBody, $responseStatus);
        } catch (QueryException $exception) {
            $existing = PaymentIdempotencyKey::query()
                ->where('user_id', $user->id)
                ->where('key', $idempotencyKey)
                ->first();

            if ($existing === null) {
                throw $exception;
            }

            if (! hash_equals($existing->request_hash, $requestHash)) {
                return response()->json(['message' => 'This idempotency key was already used for a different payment request.'], 409);
            }

            if ($existing->response_body === null || $existing->response_status === null) {
                return response()->json(['message' => 'A request with this idempotency key is still being processed. Retry shortly.'], 409);
            }

            return response()->json($existing->response_body, $existing->response_status)
                ->header('Idempotency-Replayed', 'true');
        }
    }

    public function show(Request $request, Payment $payment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if ($user->role->value === 'cashier' && $payment->recorded_by !== $user->id) {
            abort(404);
        }

        $payment->load([...self::RECEIPT_RELATIONS, 'voidRequest']);
        $data = $this->paymentData($payment, true);
        $data['notifications'] = NotificationLog::query()
            ->where('payment_id', $payment->id)
            ->orderBy('created_at')
            ->get(['channel', 'status', 'failure_reason', 'created_at'])
            ->map(fn (NotificationLog $notification): array => [
                'channel' => $notification->channel,
                'status' => $notification->status,
                'logged_at' => $notification->created_at?->toISOString(),
            ])->all();
        $data['audit_trail'] = AuditEntry::query()
            ->leftJoin('users as actors', 'audit_entries.user_id', '=', 'actors.id')
            ->where('audit_entries.entity_type', $payment->getMorphClass())
            ->where('audit_entries.entity_id', (string) $payment->id)
            ->orderBy('audit_entries.occurred_at')
            ->orderBy('audit_entries.id')
            ->get(['audit_entries.action', 'audit_entries.occurred_at', 'actors.full_name as actor_name'])
            ->map(fn (AuditEntry $entry): array => [
                'action' => $entry->action,
                'actor_name' => $entry->actor_name,
                'occurred_at' => $entry->occurred_at?->toISOString(),
            ])->all();

        return response()->json(['data' => $data]);
    }

    public function reprint(Request $request, Payment $payment, AuditLogger $auditLogger): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if ($user->role->value === 'cashier' && $payment->recorded_by !== $user->id) {
            abort(404);
        }

        DB::transaction(function () use ($request, $payment, $auditLogger): void {
            $receipt = $payment->receipt()->lockForUpdate()->firstOrFail();
            $firstPrint = $receipt->first_printed_at === null;

            if ($firstPrint) {
                $receipt->forceFill(['first_printed_at' => now()])->save();
            } else {
                $payment->increment('reprint_count');
            }

            $payment->refresh()->load(self::RECEIPT_RELATIONS);
            $auditLogger->record(
                $request,
                $firstPrint ? 'receipt.printed' : 'receipt.reprinted',
                $payment,
                null,
                [
                    'reprint_count' => $payment->reprint_count,
                    'first_printed_at' => $payment->receipt?->first_printed_at?->toISOString(),
                ],
            );
        });

        // The print surface renders this response, so it carries the same receipt detail as show().
        return response()->json(['data' => $this->paymentData($payment, true)]);
    }

    /** @return array<string, mixed> */
    private function paymentData(Payment $payment, bool $includeAllocations = false): array
    {
        $data = [
            'id' => (string) $payment->id,
            'student_id' => (string) $payment->student_id,
            'student_name' => $payment->student?->full_name,
            'lrn' => $payment->student?->lrn,
            'student_grade' => $payment->student?->gradeLevel?->name,
            'student_section' => $payment->student?->section?->name,
            'billing_account_id' => (string) $payment->billing_account_id,
            'amount_cents' => $payment->amount_cents,
            'method' => $payment->method,
            'paid_on' => $payment->paid_on?->toDateString(),
            'status' => $payment->status,
            'receipt_no' => $payment->receipt?->receipt_no,
            'first_printed_at' => $payment->receipt?->first_printed_at?->toISOString(),
            'recorded_at' => $payment->recorded_at?->toISOString(),
            'recorded_by' => $payment->recordedBy?->full_name,
            'reprint_count' => $payment->reprint_count,
            'balance_after_cents' => $payment->balance_after_cents,
        ];

        if ($includeAllocations) {
            $data['school_year'] = $payment->billingAccount?->schoolYear?->label;
            $data['allocations'] =$payment->allocations->map(fn ($allocation): array => [
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
