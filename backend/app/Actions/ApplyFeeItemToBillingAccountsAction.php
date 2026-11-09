<?php

namespace App\Actions;

use App\Models\BillingAccount;
use App\Models\FeeItem;
use App\Models\FeeSchedule;

class ApplyFeeItemToBillingAccountsAction
{
    /** @return list<int> */
    public function handle(FeeSchedule $feeSchedule, FeeItem $feeItem): array
    {
        $updatedAccountIds = [];

        BillingAccount::query()
            ->where('fee_schedule_id', $feeSchedule->id)
            ->lockForUpdate()
            ->each(function (BillingAccount $account) use ($feeItem, &$updatedAccountIds): void {
                $alreadyAssigned = $account->items()
                    ->where(function ($items) use ($feeItem): void {
                        $items->where('fee_item_id', $feeItem->id)
                            ->orWhereRaw('LOWER(name) = ?', [strtolower($feeItem->name)]);
                    })
                    ->exists();

                if ($alreadyAssigned) {
                    return;
                }

                $account->items()->create([
                    'fee_item_id' => $feeItem->id,
                    'name' => $feeItem->name,
                    'category' => $feeItem->category,
                    'amount_cents' => $feeItem->amount_cents,
                ]);
                $account->installments()->create([
                    'label' => 'Fee: '.$feeItem->name,
                    'sequence' => ((int) $account->installments()->max('sequence')) + 1,
                    'due_date' => now('Asia/Manila')->toDateString(),
                    'amount_cents' => $feeItem->amount_cents,
                    'paid_cents' => 0,
                    'status' => 'current',
                ]);
                $account->increment('total_due_cents', $feeItem->amount_cents);
                $account->increment('balance_cents', $feeItem->amount_cents);
                $updatedAccountIds[] = $account->id;
            });

        return $updatedAccountIds;
    }
}
