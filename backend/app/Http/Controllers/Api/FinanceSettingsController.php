<?php

namespace App\Http\Controllers\Api;

use App\Actions\ApplyFeeItemToBillingAccountsAction;
use App\Actions\ComputeInstallmentScheduleAction;
use App\Actions\ReviseFeeItemAction;
use App\Http\Controllers\Controller;
use App\Models\FeeItem;
use App\Models\FeeSchedule;
use App\Models\PaymentPlan;
use App\Services\AuditLogger;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FinanceSettingsController extends Controller
{
    public function feeSchedules(): JsonResponse
    {
        $schedules = FeeSchedule::query()
            ->with([
                'schoolYear:id,label',
                'gradeLevel:id,name',
                'items' => fn ($items) => $items->orderBy('sort_order')->orderBy('id'),
            ])
            ->orderByDesc('school_year_id')
            ->orderBy('grade_level_id')
            ->orderBy('id')
            ->get()
            ->map(fn (FeeSchedule $schedule): array => [
                'id' => (string) $schedule->id,
                'schoolYear' => $schedule->schoolYear->label,
                'gradeLevel' => $schedule->gradeLevel->name,
                'name' => $schedule->name,
                'active' => (bool) $schedule->active,
                'items' => $schedule->items->map(fn ($item): array => [
                    'id' => (string) $item->id,
                    'name' => $item->name,
                    'category' => $item->category,
                    'amountCents' => (int) $item->amount_cents,
                    'required' => (bool) $item->required,
                    'active' => (bool) $item->active,
                    'version' => (int) $item->version,
                ])->values(),
            ]);

        return response()->json(['data' => $schedules->values()]);
    }

    public function paymentPlans(): JsonResponse
    {
        $plans = PaymentPlan::query()
            ->with('installments:id,payment_plan_id,label,sequence,due_day_offset,percent_of_remaining_basis_points')
            ->orderBy('name')
            ->orderBy('version')
            ->get()
            ->map(fn (PaymentPlan $plan): array => $this->paymentPlanData($plan));

        return response()->json(['data' => $plans->values()]);
    }

    public function storePaymentPlan(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $this->validatedPaymentPlan($request);

        $plan = DB::transaction(function () use ($request, $auditLogger, $validated): PaymentPlan {
            $this->ensurePlanNameAvailable($validated['name']);
            $plan = $this->createPlanVersion($validated, 1, null);
            $auditLogger->record($request, 'finance.payment_plan.created', $plan, null, $this->paymentPlanData($plan));

            return $plan;
        });

        return response()->json(['data' => $this->paymentPlanData($plan)], 201);
    }

    public function revisePaymentPlan(Request $request, PaymentPlan $paymentPlan, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $this->validatedPaymentPlan($request);

        $revised = DB::transaction(function () use ($request, $paymentPlan, $auditLogger, $validated): PaymentPlan {
            $current = PaymentPlan::query()->whereKey($paymentPlan->id)->lockForUpdate()->firstOrFail();
            if (! $current->active) {
                abort(409, 'Only an active payment plan can be revised.');
            }
            if (PaymentPlan::query()->where('previous_version_id', $current->id)->exists()) {
                abort(409, 'Only the latest version of a payment plan can be revised.');
            }
            if (mb_strtolower($validated['name']) !== mb_strtolower($current->name)) {
                $this->ensurePlanNameAvailable($validated['name']);
            }

            $before = $this->paymentPlanData($current->load('installments'));
            $current->forceFill(['active' => false])->save();
            $revised = $this->createPlanVersion($validated, (int) $current->version + 1, $current->id);
            $auditLogger->record($request, 'finance.payment_plan.revised', $revised, $before, $this->paymentPlanData($revised));

            return $revised;
        });

        return response()->json(['data' => $this->paymentPlanData($revised)]);
    }

    public function deactivatePaymentPlan(Request $request, PaymentPlan $paymentPlan, AuditLogger $auditLogger): JsonResponse
    {
        $plan = DB::transaction(function () use ($request, $paymentPlan, $auditLogger): PaymentPlan {
            $plan = PaymentPlan::query()->whereKey($paymentPlan->id)->lockForUpdate()->firstOrFail();
            if (! $plan->active) {
                abort(409, 'This payment plan is already inactive.');
            }

            $before = $this->paymentPlanData($plan->load('installments'));
            $plan->forceFill(['active' => false])->save();
            $auditLogger->record($request, 'finance.payment_plan.deactivated', $plan, $before, $this->paymentPlanData($plan));

            return $plan;
        });

        return response()->json(['data' => $this->paymentPlanData($plan)]);
    }

    public function previewPaymentPlan(Request $request, PaymentPlan $paymentPlan, ComputeInstallmentScheduleAction $computeSchedule): JsonResponse
    {
        $validated = $request->validate([
            'total_cents' => ['required', 'integer', 'min:1'],
        ]);
        $schedule = $computeSchedule->handle($paymentPlan, (int) $validated['total_cents'], CarbonImmutable::now('Asia/Manila')->startOfDay(), 'total_cents');

        return response()->json(['data' => [
            'planId' => (string) $paymentPlan->id,
            'version' => (int) $paymentPlan->version,
            'totalCents' => (int) $validated['total_cents'],
            'installments' => array_map(fn (array $row): array => [
                'label' => $row['label'],
                'sequence' => $row['sequence'],
                'dueDayOffset' => $row['due_day_offset'],
                'dueDate' => $row['due_date'],
                'amountCents' => $row['amount_cents'],
            ], $schedule),
        ]]);
    }

    /** @return array{name: string, down_payment_type: string, down_payment_value: int, installments: list<array{label: string, due_day_offset: int, percent_of_remaining_basis_points: int}>} */
    private function validatedPaymentPlan(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'down_payment_type' => ['required', 'string', 'in:amount,percent'],
            'down_payment_value' => ['required', 'integer', 'min:0'],
            'installments' => ['required', 'array', 'min:1'],
            'installments.*.label' => ['required', 'string', 'max:120'],
            'installments.*.due_day_offset' => ['required', 'integer', 'min:0', 'max:65535'],
            'installments.*.percent_of_remaining_basis_points' => ['required', 'integer', 'min:1', 'max:10000'],
        ]);

        if ($validated['down_payment_type'] === 'percent' && (int) $validated['down_payment_value'] > 10_000) {
            throw ValidationException::withMessages(['down_payment_value' => 'A percent down payment is in basis points and cannot exceed 10000 (100%).']);
        }
        if (array_sum(array_map(fn (array $row): int => (int) $row['percent_of_remaining_basis_points'], $validated['installments'])) !== 10_000) {
            throw ValidationException::withMessages(['installments' => 'Installment percentages must add up to exactly 10000 basis points (100%).']);
        }

        $validated['name'] = trim($validated['name']);

        return $validated;
    }

    /** @param array{name: string, down_payment_type: string, down_payment_value: int, installments: list<array<string, mixed>>} $validated */
    private function createPlanVersion(array $validated, int $version, ?int $previousVersionId): PaymentPlan
    {
        $plan = new PaymentPlan;
        $plan->forceFill([
            'name' => $validated['name'],
            'down_payment_type' => $validated['down_payment_type'],
            'down_payment_value' => (int) $validated['down_payment_value'],
            'active' => true,
            'version' => $version,
            'previous_version_id' => $previousVersionId,
        ])->save();

        foreach (array_values($validated['installments']) as $index => $installment) {
            $plan->installments()->forceCreate([
                'label' => trim($installment['label']),
                'sequence' => $index + 1,
                'due_day_offset' => (int) $installment['due_day_offset'],
                'percent_of_remaining_basis_points' => (int) $installment['percent_of_remaining_basis_points'],
            ]);
        }

        return $plan->load('installments');
    }

    private function ensurePlanNameAvailable(string $name): void
    {
        if (PaymentPlan::query()->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->exists()) {
            throw ValidationException::withMessages(['name' => 'A payment plan with that name already exists.']);
        }
    }

    /** @return array<string, mixed> */
    private function paymentPlanData(PaymentPlan $plan): array
    {
        return [
            'id' => (string) $plan->id,
            'name' => $plan->name,
            'downPaymentType' => $plan->down_payment_type,
            'downPaymentValue' => (int) $plan->down_payment_value,
            'active' => (bool) $plan->active,
            'version' => (int) $plan->version,
            'previousVersionId' => $plan->previous_version_id === null ? null : (string) $plan->previous_version_id,
            'installments' => $plan->installments->map(fn ($installment): array => [
                'label' => $installment->label,
                'sequence' => (int) $installment->sequence,
                'dueDayOffset' => (int) $installment->due_day_offset,
                'percentOfRemainingBasisPoints' => (int) $installment->percent_of_remaining_basis_points,
            ])->values()->all(),
        ];
    }

    public function storeFeeItem(Request $request, FeeSchedule $feeSchedule, ApplyFeeItemToBillingAccountsAction $applyFeeItemToBillingAccounts, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $this->validatedFeeItem($request);
        $applyToAll = $request->boolean('apply_to_all');
        [$feeItem, $updatedAccountCount] = DB::transaction(function () use ($request, $feeSchedule, $applyFeeItemToBillingAccounts, $auditLogger, $validated, $applyToAll): array {
            $created = [];
            $updatedAccountCount = 0;

            foreach ($this->targetSchedules($feeSchedule, $applyToAll) as $schedule) {
                $this->ensureFeeNameAvailable($schedule, $validated['name']);
                $item = $schedule->items()->create([
                    ...$validated,
                    'active' => true,
                    'version' => 1,
                ]);
                $created[] = $item;
                $updatedAccountCount += count($applyFeeItemToBillingAccounts->handle($schedule, $item));
                $auditLogger->record($request, 'finance.fee_item.created', $item, null, $this->feeItemData($item));
            }

            return [$created[0], $updatedAccountCount];
        });

        return response()->json(['data' => [...$this->feeItemData($feeItem), 'updatedAccountCount' => $updatedAccountCount]], 201);
    }

    public function reviseFeeItem(Request $request, FeeItem $feeItem, ApplyFeeItemToBillingAccountsAction $applyFeeItemToBillingAccounts, ReviseFeeItemAction $reviseFeeItem, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $this->validatedFeeItem($request);
        $applyToAll = $request->boolean('apply_to_all');
        [$revisedFeeItem, $updatedAccountCount] = DB::transaction(function () use ($request, $feeItem, $applyFeeItemToBillingAccounts, $reviseFeeItem, $auditLogger, $validated, $applyToAll): array {
            $feeItem->loadMissing('schedule');
            $revisedForSelectedSchedule = null;
            $updatedAccountCount = 0;

            foreach ($this->targetSchedules($feeItem->schedule, $applyToAll) as $schedule) {
                $current = $schedule->id === $feeItem->fee_schedule_id
                    ? FeeItem::query()->whereKey($feeItem->id)->lockForUpdate()->firstOrFail()
                    : FeeItem::query()
                        ->where('fee_schedule_id', $schedule->id)
                        ->where('active', true)
                        ->whereRaw('LOWER(name) = ?', [strtolower($feeItem->name)])
                        ->lockForUpdate()
                        ->first();

                if ($current === null) {
                    $this->ensureFeeNameAvailable($schedule, $validated['name']);
                    $revised = $schedule->items()->create([...$validated, 'active' => true, 'version' => 1]);
                    $updatedAccountCount += count($applyFeeItemToBillingAccounts->handle($schedule, $revised));
                    $before = null;
                } else {
                    $this->ensureFeeNameAvailable($schedule, $validated['name'], $current->id);
                    $before = $this->feeItemData($current);
                    $revised = $reviseFeeItem->handle($current, $validated);
                }

                $auditLogger->record($request, 'finance.fee_item.revised', $revised, $before, $this->feeItemData($revised));
                if ($schedule->id === $feeItem->fee_schedule_id) {
                    $revisedForSelectedSchedule = $revised;
                }
            }

            return [$revisedForSelectedSchedule ?? $feeItem, $updatedAccountCount];
        });

        return response()->json(['data' => [...$this->feeItemData($revisedFeeItem), 'updatedAccountCount' => $updatedAccountCount]]);
    }

    public function deactivateFeeItem(Request $request, FeeItem $feeItem, AuditLogger $auditLogger): JsonResponse
    {
        $deactivated = DB::transaction(function () use ($request, $feeItem, $auditLogger): FeeItem {
            $feeItem = FeeItem::query()->whereKey($feeItem->id)->lockForUpdate()->firstOrFail();
            if (! $feeItem->active) {
                abort(409, 'This fee item is already inactive.');
            }

            $before = $this->feeItemData($feeItem);
            $feeItem->forceFill(['active' => false])->save();
            $auditLogger->record($request, 'finance.fee_item.deactivated', $feeItem, $before, $this->feeItemData($feeItem));

            return $feeItem;
        });

        return response()->json(['data' => $this->feeItemData($deactivated)]);
    }

    /** @return array{name: string, category: string, amount_cents: int, required: bool} */
    private function validatedFeeItem(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'category' => ['required', 'string', 'in:tuition,miscellaneous,other'],
            'amount_cents' => ['required', 'integer', 'min:0'],
            'required' => ['required', 'boolean'],
        ]);
    }

    /** @return Collection<int, FeeSchedule> */
    private function targetSchedules(FeeSchedule $feeSchedule, bool $applyToAll)
    {
        return FeeSchedule::query()
            ->where('school_year_id', $feeSchedule->school_year_id)
            ->when(! $applyToAll, fn ($schedules) => $schedules->whereKey($feeSchedule->id))
            ->where('active', true)
            ->orderBy('id')
            ->lockForUpdate()
            ->get();
    }

    private function ensureFeeNameAvailable(FeeSchedule $schedule, string $name, ?int $exceptId = null): void
    {
        $duplicate = FeeItem::query()
            ->where('fee_schedule_id', $schedule->id)
            ->whereRaw('LOWER(name) = ?', [strtolower(trim($name))])
            ->when($exceptId !== null, fn ($items) => $items->whereKeyNot($exceptId))
            ->exists();

        if ($duplicate) {
            abort(422, "A fee item named {$name} is already configured for {$schedule->gradeLevel->name}.");
        }
    }

    /** @return array<string, mixed> */
    private function feeItemData(FeeItem $feeItem): array
    {
        return [
            'id' => (string) $feeItem->id,
            'scheduleId' => (string) $feeItem->fee_schedule_id,
            'name' => $feeItem->name,
            'category' => $feeItem->category,
            'amountCents' => (int) $feeItem->amount_cents,
            'required' => (bool) $feeItem->required,
            'active' => (bool) $feeItem->active,
            'version' => (int) $feeItem->version,
            'previousVersionId' => $feeItem->previous_version_id === null ? null : (string) $feeItem->previous_version_id,
        ];
    }
}
