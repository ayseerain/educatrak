<?php

namespace App\Actions;

use App\Models\BillingAccount;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecordPaymentAction
{
    public function handle(BillingAccount $account, int $amountCents, User $recordedBy, string $paidOn, ?string $notes = null): Payment
    {
        if ($amountCents < 1) {
            throw ValidationException::withMessages(['amount_cents' => 'Payment amount must be greater than zero.']);
        }

        return DB::transaction(function () use ($account, $amountCents, $recordedBy, $paidOn, $notes): Payment {
            $account = BillingAccount::query()->lockForUpdate()->findOrFail($account->id);

            if ($amountCents > $account->balance_cents) {
                throw ValidationException::withMessages(['amount_cents' => 'Payment cannot exceed the current balance.']);
            }

            $payment = Payment::query()->create([
                'billing_account_id' => $account->id, 'student_id' => $account->student_id,
                'amount_cents' => $amountCents, 'method' => 'cash', 'paid_on' => $paidOn,
                'notes' => $notes, 'recorded_by' => $recordedBy->id, 'recorded_at' => now(),
            ]);
            $remaining = $amountCents;

            foreach ($account->installments()->lockForUpdate()->orderBy('due_date')->orderBy('sequence')->get() as $installment) {
                $allocation = min($remaining, $installment->amount_cents - $installment->paid_cents);
                if ($allocation < 1) {
                    continue;
                }
                $payment->allocations()->create(['installment_id' => $installment->id, 'amount_cents' => $allocation]);
                $installment->increment('paid_cents', $allocation);
                $installment->refresh();
                $installment->update(['status' => $installment->paid_cents === $installment->amount_cents ? 'paid' : 'current']);
                $remaining -= $allocation;
                if ($remaining === 0) {
                    break;
                }
            }

            $account->increment('total_paid_cents', $amountCents);
            $account->decrement('balance_cents', $amountCents);
            $receiptYear = (int) now()->format('Y');
            $sequence = ((int) Receipt::query()->where('receipt_year', $receiptYear)->lockForUpdate()->max('sequence')) + 1;
            Receipt::query()->create(['payment_id' => $payment->id, 'sequence' => $sequence, 'receipt_year' => $receiptYear, 'receipt_no' => sprintf('OR-%d-%06d', $receiptYear, $sequence), 'issued_at' => now()]);

            return $payment->load('allocations');
        });
    }
}
