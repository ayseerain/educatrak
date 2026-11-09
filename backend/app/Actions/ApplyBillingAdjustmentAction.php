<?php

namespace App\Actions;

use App\Models\Adjustment;
use App\Models\BillingAccount;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApplyBillingAdjustmentAction
{
    public function handle(BillingAccount $billingAccount, string $type, int $amountCents, string $reason, User $createdBy): Adjustment
    {
        if ($amountCents === 0) {
            throw ValidationException::withMessages(['amount_cents' => 'Adjustment amount cannot be zero.']);
        }

        if (in_array($type, ['discount', 'scholarship'], true) && $amountCents > 0) {
            throw ValidationException::withMessages(['amount_cents' => 'Discounts and scholarships must reduce the balance.']);
        }

        return DB::transaction(function () use ($billingAccount, $type, $amountCents, $reason, $createdBy): Adjustment {
            $account = BillingAccount::query()->lockForUpdate()->findOrFail($billingAccount->id);
            $totalDue = (int) $account->total_due_cents + $amountCents;
            $balance = (int) $account->balance_cents + $amountCents;

            if ($totalDue < (int) $account->total_paid_cents || $balance < 0) {
                throw ValidationException::withMessages(['amount_cents' => 'Adjustment cannot reduce the total below payments already recorded.']);
            }

            $adjustment = Adjustment::query()->forceCreate([
                'billing_account_id' => $account->id,
                'type' => $type,
                'amount_cents' => $amountCents,
                'reason' => $reason,
                'created_by' => $createdBy->id,
                'effective_at' => now('Asia/Manila'),
            ]);
            $account->update(['total_due_cents' => $totalDue, 'balance_cents' => $balance]);

            return $adjustment->refresh();
        });
    }
}
