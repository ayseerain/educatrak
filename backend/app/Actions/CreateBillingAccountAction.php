<?php

namespace App\Actions;

use App\Models\BillingAccount;
use App\Models\FeeItem;
use App\Models\FeeSchedule;
use App\Models\PaymentPlan;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * M3.1 account creation. The draft step validates the request against the student's grade-level fee schedule,
 * the current school year and an active plan version, then computes the schedule; it writes nothing, so the
 * wizard preview and the real create share one rule set. Callers run create() inside one transaction.
 */
class CreateBillingAccountAction
{
    public function __construct(
        private readonly ComputeInstallmentScheduleAction $computeSchedule,
        private readonly RecalculateBillingStatusAction $recalculateBillingStatus,
    ) {}

    /**
     * @param  array{student_id: int, school_year_id: int, payment_plan_id: int, excluded_fee_item_ids?: list<int>}  $input
     * @return array{student: Student, schoolYear: SchoolYear, plan: PaymentPlan, feeSchedule: FeeSchedule, items: Collection<int, FeeItem>, excludedFeeItemIds: list<int>, totalDueCents: int, installments: list<array{label: string, sequence: int, due_day_offset: int, due_date: string, amount_cents: int}>}
     */
    public function draft(array $input, bool $lockRows): array
    {
        $student = Student::query()->when($lockRows, fn ($query) => $query->lockForUpdate())->findOrFail($input['student_id']);
        $schoolYear = SchoolYear::query()->when($lockRows, fn ($query) => $query->lockForUpdate())->findOrFail($input['school_year_id']);
        $plan = PaymentPlan::query()->when($lockRows, fn ($query) => $query->lockForUpdate())->findOrFail($input['payment_plan_id']);

        if ($student->status !== 'enrolled') {
            throw ValidationException::withMessages(['student_id' => 'Billing accounts can only be created for enrolled students.']);
        }
        if ($student->grade_level_id === null) {
            throw ValidationException::withMessages(['student_id' => 'The student needs a grade level before a billing account can be created.']);
        }
        if (! $schoolYear->is_current) {
            throw ValidationException::withMessages(['school_year_id' => 'Billing accounts can only be created for the current school year.']);
        }
        if (! $plan->active) {
            throw ValidationException::withMessages(['payment_plan_id' => 'Select an active payment plan.']);
        }
        if (BillingAccount::query()->where('student_id', $student->id)->where('school_year_id', $schoolYear->id)->exists()) {
            throw ValidationException::withMessages(['student_id' => 'This student already has a billing account for this school year.']);
        }

        $schedules = FeeSchedule::query()
            ->where('school_year_id', $schoolYear->id)
            ->where('grade_level_id', $student->grade_level_id)
            ->where('active', true)
            ->get();
        if ($schedules->count() !== 1) {
            throw ValidationException::withMessages(['fee_schedule' => $schedules->isEmpty()
                ? 'No active fee schedule is configured for this grade level and school year.'
                : 'More than one active fee schedule is configured for this grade level and school year; Accounting must keep exactly one active.']);
        }
        $feeSchedule = $schedules->sole();

        $activeItems = FeeItem::query()
            ->where('fee_schedule_id', $feeSchedule->id)
            ->where('active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
        $excludedIds = array_values(array_unique(array_map('intval', $input['excluded_fee_item_ids'] ?? [])));
        foreach ($excludedIds as $excludedId) {
            $item = $activeItems->firstWhere('id', $excludedId);
            if ($item === null) {
                throw ValidationException::withMessages(['excluded_fee_item_ids' => 'Only active fee items from the student fee schedule can be removed.']);
            }
            if ($item->required) {
                throw ValidationException::withMessages(['excluded_fee_item_ids' => "{$item->name} is required and cannot be removed."]);
            }
        }

        $items = $activeItems->reject(fn (FeeItem $item): bool => in_array($item->id, $excludedIds, true))->values();
        $totalDueCents = (int) $items->sum('amount_cents');
        if ($totalDueCents < 1) {
            throw ValidationException::withMessages(['fee_schedule' => 'The selected fees total zero; a billing account needs a positive total due.']);
        }

        return [
            'student' => $student,
            'schoolYear' => $schoolYear,
            'plan' => $plan,
            'feeSchedule' => $feeSchedule,
            'items' => $items,
            'excludedFeeItemIds' => $excludedIds,
            'totalDueCents' => $totalDueCents,
            'installments' => $this->computeSchedule->handle($plan, $totalDueCents, CarbonImmutable::now('Asia/Manila')->startOfDay()),
        ];
    }

    /** @param  array{student: Student, schoolYear: SchoolYear, plan: PaymentPlan, feeSchedule: FeeSchedule, items: Collection<int, FeeItem>, totalDueCents: int, installments: list<array<string, mixed>>}  $draft */
    public function create(array $draft, User $creator): BillingAccount
    {
        $account = BillingAccount::query()->create([
            'student_id' => $draft['student']->id,
            'school_year_id' => $draft['schoolYear']->id,
            'fee_schedule_id' => $draft['feeSchedule']->id,
            'payment_plan_id' => $draft['plan']->id,
            'status' => 'current',
            'total_due_cents' => $draft['totalDueCents'],
            'total_paid_cents' => 0,
            'balance_cents' => $draft['totalDueCents'],
            'created_by' => $creator->id,
        ]);

        foreach ($draft['items'] as $item) {
            $account->items()->create([
                'fee_item_id' => $item->id,
                'name' => $item->name,
                'category' => $item->category,
                'amount_cents' => (int) $item->amount_cents,
            ]);
        }

        foreach ($draft['installments'] as $installment) {
            $account->installments()->create([
                'label' => $installment['label'],
                'sequence' => $installment['sequence'],
                'due_date' => $installment['due_date'],
                'amount_cents' => $installment['amount_cents'],
                'paid_cents' => 0,
                'status' => 'current',
            ]);
        }

        return $this->recalculateBillingStatus->handle($account);
    }
}
