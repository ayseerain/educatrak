<?php

namespace App\Http\Controllers\Api;

use App\Actions\ApplyBillingAdjustmentAction;
use App\Actions\CreateBillingAccountAction;
use App\Http\Controllers\Controller;
use App\Models\Adjustment;
use App\Models\AuditEntry;
use App\Models\BillingAccount;
use App\Models\Payment;
use App\Models\PaymentPlan;
use App\Models\SchoolYear;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BillingAccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'query' => ['nullable', 'string', 'max:120'],
            'school_year' => ['nullable', 'string', 'max:40'],
            'school_year_id' => ['nullable', 'integer', Rule::exists('school_years', 'id')],
            'school_year_scope' => ['nullable', Rule::in(['current', 'all'])],
            'grade' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['current', 'due_soon', 'overdue', 'paid'])],
            'minimum_balance_cents' => ['nullable', 'integer', 'min:0'],
            'maximum_balance_cents' => ['nullable', 'integer', 'min:0'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50'],
        ]);
        $minimumBalance = (int) ($filters['minimum_balance_cents'] ?? 0);
        $maximumBalance = $filters['maximum_balance_cents'] ?? null;
        if ($maximumBalance !== null && (int) $maximumBalance < $minimumBalance) {
            throw ValidationException::withMessages(['maximum_balance_cents' => 'Maximum balance must be greater than or equal to minimum balance.']);
        }
        $currentSchoolYearId = SchoolYear::query()->where('is_current', true)->value('id');
        $accounts = BillingAccount::query()
            ->with(['student.gradeLevel:id,name', 'student.section:id,name', 'schoolYear:id,label'])
            ->when(isset($filters['query']) && trim($filters['query']) !== '', function ($query) use ($filters): void {
                $search = trim($filters['query']);
                $query->whereHas('student', fn ($students) => $students->where('full_name', 'like', "%{$search}%")->orWhere('lrn', 'like', "%{$search}%"));
            })
            ->when(isset($filters['school_year']) && trim($filters['school_year']) !== '', fn ($query) => $query->whereHas('schoolYear', fn ($years) => $years->where('label', 'like', '%'.trim($filters['school_year']).'%')))
            ->when(isset($filters['school_year_id']), fn ($query) => $query->where('school_year_id', $filters['school_year_id']))
            ->when(($filters['school_year_scope'] ?? null) === 'current' && $currentSchoolYearId !== null, fn ($query) => $query->where('school_year_id', $currentSchoolYearId))
            ->when(isset($filters['grade']) && trim($filters['grade']) !== '', fn ($query) => $query->whereHas('student.gradeLevel', fn ($grades) => $grades->where('name', 'like', '%'.trim($filters['grade']).'%')))
            ->when(isset($filters['status']), fn ($query) => $query->where('status', $filters['status']))
            ->when(isset($filters['minimum_balance_cents']), fn ($query) => $query->where('balance_cents', '>=', $minimumBalance))
            ->when($maximumBalance !== null, fn ($query) => $query->where('balance_cents', '<=', (int) $maximumBalance))
            ->latest('id')
            ->paginate((int) ($filters['per_page'] ?? 10));

        return response()->json([
            'data' => $accounts->getCollection()->map(fn (BillingAccount $account): array => $this->accountSummary($account)),
            'meta' => [
                'currentPage' => $accounts->currentPage(), 'lastPage' => $accounts->lastPage(), 'total' => $accounts->total(), 'perPage' => $accounts->perPage(),
                'currentSchoolYearId' => $currentSchoolYearId === null ? null : (string) $currentSchoolYearId,
                'schoolYears' => SchoolYear::query()->orderByDesc('is_current')->orderByDesc('starts_on')->get(['id', 'label'])->map(fn (SchoolYear $year): array => ['id' => (string) $year->id, 'label' => $year->label])->all(),
            ],
        ]);
    }

    public function store(Request $request, CreateBillingAccountAction $createBillingAccount, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $this->validatedAccountCreation($request);
        /** @var User $user */
        $user = $request->user();

        try {
            $account = DB::transaction(function () use ($request, $createBillingAccount, $auditLogger, $validated, $user): BillingAccount {
                $draft = $createBillingAccount->draft($validated, true);
                $account = $createBillingAccount->create($draft, $user);
                $auditLogger->record($request, 'billing_account.created', $account, null, [
                    'student_id' => (int) $account->student_id,
                    'school_year_id' => (int) $account->school_year_id,
                    'fee_schedule_id' => (int) $account->fee_schedule_id,
                    'payment_plan_id' => (int) $account->payment_plan_id,
                    'payment_plan_version' => (int) $draft['plan']->version,
                    'total_due_cents' => (int) $account->total_due_cents,
                    'excluded_fee_item_ids' => $draft['excludedFeeItemIds'],
                    'items' => $draft['items']->map(fn ($item): array => ['fee_item_id' => $item->id, 'name' => $item->name, 'amount_cents' => (int) $item->amount_cents])->all(),
                    'installment_count' => count($draft['installments']),
                    'status' => $account->status,
                ]);

                return $account;
            });
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['student_id' => 'This student already has a billing account for this school year.']);
        }

        return $this->show($account)->setStatusCode(201);
    }

    /**
     * Read-only choices for the Cashier account wizard (owner decision 2026-11-20): the current school year and the
     * active payment plans, so account creators do not need the broader settings.* read capabilities.
     */
    public function creationOptions(): JsonResponse
    {
        $currentYears = SchoolYear::query()->where('is_current', true)->get(['id', 'label']);
        $plans = PaymentPlan::query()
            ->with('installments:id,payment_plan_id,label,sequence,due_day_offset,percent_of_remaining_basis_points')
            ->where('active', true)
            ->orderBy('name')
            ->get();

        return response()->json(['data' => [
            'currentSchoolYear' => $currentYears->count() === 1
                ? ['id' => (string) $currentYears->sole()->id, 'label' => $currentYears->sole()->label]
                : null,
            'paymentPlans' => $plans->map(fn (PaymentPlan $plan): array => [
                'id' => (string) $plan->id,
                'name' => $plan->name,
                'version' => (int) $plan->version,
                'downPaymentType' => $plan->down_payment_type,
                'downPaymentValue' => (int) $plan->down_payment_value,
                'installments' => $plan->installments->sortBy('sequence')->map(fn ($installment): array => [
                    'label' => $installment->label,
                    'sequence' => (int) $installment->sequence,
                    'dueDayOffset' => (int) $installment->due_day_offset,
                    'percentOfRemainingBasisPoints' => (int) $installment->percent_of_remaining_basis_points,
                ])->values()->all(),
            ])->values()->all(),
        ]]);
    }

    public function preview(Request $request, CreateBillingAccountAction $createBillingAccount): JsonResponse
    {
        $draft = $createBillingAccount->draft($this->validatedAccountCreation($request), false);

        return response()->json(['data' => [
            'studentId' => (string) $draft['student']->id,
            'schoolYearId' => (string) $draft['schoolYear']->id,
            'feeScheduleId' => (string) $draft['feeSchedule']->id,
            'paymentPlanId' => (string) $draft['plan']->id,
            'paymentPlanVersion' => (int) $draft['plan']->version,
            'items' => $draft['items']->map(fn ($item): array => [
                'feeItemId' => (string) $item->id,
                'name' => $item->name,
                'category' => $item->category,
                'amountCents' => (int) $item->amount_cents,
                'required' => (bool) $item->required,
            ])->all(),
            'totalDueCents' => $draft['totalDueCents'],
            'installments' => array_map(fn (array $row): array => [
                'label' => $row['label'],
                'sequence' => $row['sequence'],
                'dueDate' => $row['due_date'],
                'amountCents' => $row['amount_cents'],
            ], $draft['installments']),
        ]]);
    }

    /** @return array{student_id: int, school_year_id: int, payment_plan_id: int, excluded_fee_item_ids?: list<int>} */
    private function validatedAccountCreation(Request $request): array
    {
        return $request->validate([
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')],
            'school_year_id' => ['required', 'integer', Rule::exists('school_years', 'id')],
            'payment_plan_id' => ['required', 'integer', Rule::exists('payment_plans', 'id')],
            'excluded_fee_item_ids' => ['sometimes', 'array'],
            'excluded_fee_item_ids.*' => ['integer', 'distinct'],
        ]);
    }

    public function storeAdjustment(Request $request, BillingAccount $billingAccount, ApplyBillingAdjustmentAction $applyAdjustment, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['discount', 'scholarship', 'correction'])],
            'amount_cents' => ['required', 'integer', 'not_in:0'],
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);
        /** @var User $user */
        $user = $request->user();
        $adjustment = DB::transaction(function () use ($request, $billingAccount, $applyAdjustment, $auditLogger, $validated, $user): Adjustment {
            $account = BillingAccount::query()->lockForUpdate()->findOrFail($billingAccount->id);
            $before = ['total_due_cents' => (int) $account->total_due_cents, 'balance_cents' => (int) $account->balance_cents];
            $adjustment = $applyAdjustment->handle($account, $validated['type'], $validated['amount_cents'], $validated['reason'], $user);
            $account = BillingAccount::query()->lockForUpdate()->findOrFail($account->id);
            $auditLogger->record($request, 'adjustment.created', $adjustment, $before, [
                'billing_account_id' => $account->id,
                'type' => $adjustment->type,
                'amount_cents' => (int) $adjustment->amount_cents,
                'reason' => $adjustment->reason,
                'total_due_cents' => (int) $account->total_due_cents,
                'balance_cents' => (int) $account->balance_cents,
            ]);

            return $adjustment;
        });

        return response()->json(['data' => $this->adjustmentData($adjustment)], 201);
    }

    public function show(BillingAccount $billingAccount): JsonResponse
    {
        $account = $billingAccount->load([
            'student.gradeLevel:id,name',
            'student.section:id,name',
            'schoolYear:id,label',
            'createdBy:id,full_name',
            'items:id,billing_account_id,name,category,amount_cents,fee_item_id',
            'items.feeItem:id,required',
            'installments:id,billing_account_id,label,sequence,due_date,amount_cents,paid_cents,status',
            'payments.receipt:id,payment_id,receipt_no',
            'payments.recordedBy:id,username,full_name',
            'payments.allocations.installment:id,label',
            'adjustments.createdBy:id,username,full_name',
        ]);
        $summary = $this->accountSummary($account);
        $summary['items'] = $account->items->map(fn ($item): array => [
            'name' => $item->name,
            'category' => $item->category,
            'amountCents' => (int) $item->amount_cents,
            'required' => $item->fee_item_id === null ? null : (bool) $item->feeItem?->required,
        ])->all();
        $summary['installments'] = $account->installments->sortBy('sequence')->values()->map(fn ($installment): array => [
            'id' => (string) $installment->id,
            'label' => $installment->label,
            'dueDate' => $installment->due_date->toDateString(),
            'amountCents' => (int) $installment->amount_cents,
            'paidCents' => (int) $installment->paid_cents,
            'status' => $installment->status,
        ])->all();
        $summary['payments'] = $account->payments->sortByDesc('paid_on')->values()->map(fn ($payment): array => [
            'id' => (string) $payment->id,
            'receiptNo' => $payment->receipt?->receipt_no,
            'amountCents' => (int) $payment->amount_cents,
            'paidOn' => $payment->paid_on->toDateString(),
            'status' => $payment->status,
            'recordedBy' => $payment->recordedBy?->full_name,
            'allocations' => $payment->allocations->map(fn ($allocation): array => [
                'installment' => $allocation->installment?->label,
                'amountCents' => (int) $allocation->amount_cents,
            ])->all(),
        ])->all();
        $summary['adjustments'] = $account->adjustments->sortByDesc('effective_at')->values()->map(fn ($adjustment): array => [
            'id' => (string) $adjustment->id,
            'type' => $adjustment->type,
            'amountCents' => (int) $adjustment->amount_cents,
            'reason' => $adjustment->reason,
            'effectiveAt' => $adjustment->effective_at?->toISOString(),
            'createdBy' => $adjustment->createdBy?->full_name,
        ])->all();
        $summary['activity'] = $this->accountActivity($account);

        return response()->json(['data' => $summary]);
    }

    /** @return list<array{id: string, action: string, occurredAt: string, actor: ?string, details: array<string, mixed>}> */
    private function accountActivity(BillingAccount $account): array
    {
        $activity = [];

        if ($account->created_at !== null) {
            $activity[] = [
                'id' => 'account-'.$account->id,
                'action' => 'account.created',
                'occurredAt' => $account->created_at->toISOString(),
                'actor' => $account->createdBy?->full_name,
                'details' => [],
            ];
        }

        foreach ($account->payments as $payment) {
            if ($payment->recorded_at === null) {
                continue;
            }

            $activity[] = [
                'id' => 'payment-'.$payment->id,
                'action' => 'payment.recorded',
                'occurredAt' => $payment->recorded_at->toISOString(),
                'actor' => $payment->recordedBy?->full_name,
                'details' => [
                    'amountCents' => (int) $payment->amount_cents,
                    'receiptNo' => $payment->receipt?->receipt_no,
                    'status' => $payment->status,
                ],
            ];
        }

        foreach ($account->adjustments as $adjustment) {
            if ($adjustment->created_at === null) {
                continue;
            }

            $activity[] = [
                'id' => 'adjustment-'.$adjustment->id,
                'action' => 'adjustment.created',
                'occurredAt' => $adjustment->created_at->toISOString(),
                'actor' => $adjustment->createdBy?->full_name,
                'details' => [
                    'adjustmentType' => $adjustment->type,
                    'amountCents' => (int) $adjustment->amount_cents,
                    'reason' => $adjustment->reason,
                ],
            ];
        }

        $paymentIds = $account->payments->modelKeys();
        if ($paymentIds !== []) {
            $paymentType = (new Payment)->getMorphClass();
            $auditEntries = AuditEntry::query()
                ->leftJoin('users as actors', 'audit_entries.user_id', '=', 'actors.id')
                ->where('audit_entries.entity_type', $paymentType)
                ->whereIn('audit_entries.entity_id', array_map('strval', $paymentIds))
                ->where('audit_entries.action', '<>', 'payment.recorded')
                ->orderBy('audit_entries.occurred_at')
                ->orderBy('audit_entries.id')
                ->get(['audit_entries.id', 'audit_entries.action', 'audit_entries.after', 'audit_entries.occurred_at', 'actors.full_name as actor_name']);

            foreach ($auditEntries as $entry) {
                $activity[] = [
                    'id' => 'audit-'.$entry->id,
                    'action' => $entry->action,
                    'occurredAt' => $entry->occurred_at->toISOString(),
                    'actor' => $entry->actor_name,
                    'details' => $this->activityDetails($entry->after),
                ];
            }
        }

        usort($activity, static function (array $left, array $right): int {
            $timeOrder = strcmp($right['occurredAt'], $left['occurredAt']);

            return $timeOrder !== 0 ? $timeOrder : strcmp($right['id'], $left['id']);
        });

        return $activity;
    }

    /** @param array<string, mixed>|null $after
     * @return array<string, mixed>
     */
    private function activityDetails(?array $after): array
    {
        if ($after === null) {
            return [];
        }

        $details = [];
        foreach ([
            'amount_cents' => 'amountCents',
            'receipt_no' => 'receiptNo',
            'status' => 'status',
            'reason' => 'reason',
            'decision' => 'decision',
            'decision_note' => 'decisionNote',
            'reprint_count' => 'reprintCount',
        ] as $source => $target) {
            if (array_key_exists($source, $after) && (is_scalar($after[$source]) || $after[$source] === null)) {
                $details[$target] = $after[$source];
            }
        }

        return $details;
    }

    /** @return array<string, mixed> */
    private function accountSummary(BillingAccount $account): array
    {
        return [
            'id' => (string) $account->id,
            'studentId' => (string) $account->student_id,
            'lrn' => $account->student->lrn,
            'studentName' => $account->student->full_name,
            'gradeLevel' => $account->student->gradeLevel?->name,
            'section' => $account->student->section?->name,
            'schoolYearId' => (string) $account->school_year_id,
            'schoolYear' => $account->schoolYear->label,
            'status' => $account->status,
            'totalDueCents' => (int) $account->total_due_cents,
            'totalPaidCents' => (int) $account->total_paid_cents,
            'balanceCents' => (int) $account->balance_cents,
        ];
    }

    /** @return array<string, mixed> */
    private function adjustmentData(Adjustment $adjustment): array
    {
        return [
            'id' => (string) $adjustment->id,
            'type' => $adjustment->type,
            'amountCents' => (int) $adjustment->amount_cents,
            'reason' => $adjustment->reason,
            'effectiveAt' => $adjustment->effective_at?->toISOString(),
            'createdBy' => $adjustment->createdBy?->full_name,
        ];
    }
}
