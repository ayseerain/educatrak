<?php

namespace App\Actions;

use App\Models\Adjustment;
use App\Models\BillingAccount;
use App\Models\Installment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApplyBillingAdjustmentAction
{
    public function __construct(private readonly RecalculateBillingStatusAction $recalculateBillingStatus) {}

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
            $this->redistributeUnpaidInstallments($account, $amountCents);
            $this->recalculateBillingStatus->handle($account);

            return $adjustment->refresh();
        });
    }

    private function redistributeUnpaidInstallments(BillingAccount $account, int $amountCents): void
    {
        $installments = Installment::query()
            ->where('billing_account_id', $account->id)
            ->lockForUpdate()
            ->orderBy('due_date')
            ->orderBy('sequence')
            ->get();
        $unpaidTotal = $installments->sum(fn (Installment $installment): int => max(0, (int) $installment->amount_cents - (int) $installment->paid_cents));

        if ($unpaidTotal === 0) {
            if ($amountCents > 0) {
                $account->installments()->create([
                    'label' => 'Correction',
                    'sequence' => ((int) $installments->max('sequence')) + 1,
                    'due_date' => CarbonImmutable::now('Asia/Manila')->toDateString(),
                    'amount_cents' => $amountCents,
                    'paid_cents' => 0,
                    'status' => 'current',
                ]);
            }

            return;
        }

        $remaining = abs($amountCents);
        foreach ($installments as $installment) {
            $unpaid = max(0, (int) $installment->amount_cents - (int) $installment->paid_cents);
            if ($unpaid === 0) {
                continue;
            }
            $share = intdiv(abs($amountCents) * $unpaid, $unpaidTotal);
            $share = min($share, $remaining);
            $remaining -= $share;
            $installment->update(['amount_cents' => (int) $installment->amount_cents + ($amountCents < 0 ? -$share : $share)]);
        }

        foreach ($installments as $installment) {
            if ($remaining === 0) {
                break;
            }
            // Rounding centavos go to the oldest unpaid installment first; paid installments never change.
            if (max(0, (int) $installment->amount_cents - (int) $installment->paid_cents) === 0) {
                continue;
            }
            $installment->increment('amount_cents', $amountCents < 0 ? -1 : 1);
            $remaining--;
        }
    }
}
