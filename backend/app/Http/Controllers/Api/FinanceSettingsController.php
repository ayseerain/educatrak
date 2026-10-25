<?php

namespace App\Http\Controllers\Api;

use App\Actions\ReviseFeeItemAction;
use App\Http\Controllers\Controller;
use App\Models\FeeItem;
use App\Models\FeeSchedule;
use App\Models\PaymentPlan;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            ->get()
            ->map(fn (PaymentPlan $plan): array => [
                'id' => (string) $plan->id,
                'name' => $plan->name,
                'downPaymentType' => $plan->down_payment_type,
                'downPaymentValue' => (int) $plan->down_payment_value,
                'active' => (bool) $plan->active,
                'installments' => $plan->installments->map(fn ($installment): array => [
                    'label' => $installment->label,
                    'sequence' => (int) $installment->sequence,
                    'dueDayOffset' => (int) $installment->due_day_offset,
                    'percentOfRemainingBasisPoints' => (int) $installment->percent_of_remaining_basis_points,
                ])->values(),
            ]);

        return response()->json(['data' => $plans->values()]);
    }

    public function storeFeeItem(Request $request, FeeSchedule $feeSchedule, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $this->validatedFeeItem($request);
        $feeItem = DB::transaction(function () use ($request, $feeSchedule, $auditLogger, $validated): FeeItem {
            $feeItem = $feeSchedule->items()->create([
                ...$validated,
                'active' => true,
                'version' => 1,
            ]);
            $auditLogger->record($request, 'finance.fee_item.created', $feeItem, null, $this->feeItemData($feeItem));

            return $feeItem;
        });

        return response()->json(['data' => $this->feeItemData($feeItem)], 201);
    }

    public function reviseFeeItem(Request $request, FeeItem $feeItem, ReviseFeeItemAction $reviseFeeItem, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $this->validatedFeeItem($request);
        $revisedFeeItem = DB::transaction(function () use ($request, $feeItem, $reviseFeeItem, $auditLogger, $validated): FeeItem {
            $before = $this->feeItemData($feeItem->fresh());
            $revised = $reviseFeeItem->handle($feeItem, $validated);
            $auditLogger->record($request, 'finance.fee_item.revised', $revised, $before, $this->feeItemData($revised));

            return $revised;
        });

        return response()->json(['data' => $this->feeItemData($revisedFeeItem)]);
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
