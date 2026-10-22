<?php

namespace App\Actions;

use App\Models\BillingAccount;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecordPaymentAction
{
    public function handle(
        BillingAccount $account,
        int $amountCents,
        User $recordedBy,
        string $paidOn,
        ?string $notes = null,
        ?string $backdateReason = null,
        ?string $duplicateOverrideReason = null,
    ): Payment
    {
        if ($amountCents < 1) {
            throw ValidationException::withMessages(['amount_cents' => 'Payment amount must be greater than zero.']);
        }

        return DB::transaction(function () use ($account, $amountCents, $recordedBy, $paidOn, $notes, $backdateReason, $duplicateOverrideReason): Payment {
            $account = BillingAccount::query()->lockForUpdate()->findOrFail($account->id);

            if ($amountCents > $account->balance_cents) {
                throw ValidationException::withMessages(['amount_cents' => 'Payment cannot exceed the current balance.']);
            }

            $duplicateExists = Payment::query()
                ->where('student_id', $account->student_id)
                ->where('amount_cents', $amountCents)
                ->where('recorded_at', '>=', now()->subMinutes(10))
                ->whereIn('status', ['valid', 'void_pending'])
                ->exists();

            if ($duplicateExists && $duplicateOverrideReason === null) {
                throw ValidationException::withMessages([
                    'duplicate_override_reason' => 'A payment with the same amount was recorded for this student within the last 10 minutes. Confirm that this is a new payment and provide a reason.',
                ]);
            }

            $payment = Payment::query()->create([
                'billing_account_id' => $account->id, 'student_id' => $account->student_id,
                'amount_cents' => $amountCents, 'method' => 'cash', 'paid_on' => $paidOn,
                'backdate_reason' => $backdateReason, 'duplicate_override_reason' => $duplicateOverrideReason,
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

            if ($remaining !== 0) {
                throw ValidationException::withMessages(['amount_cents' => 'Payment cannot be allocated to the account schedule.']);
            }

            $account->increment('total_paid_cents', $amountCents);
            $account->decrement('balance_cents', $amountCents);
            $receiptYear = (int) CarbonImmutable::parse($paidOn, 'Asia/Manila')->year;
            $sequence = ((int) Receipt::query()->lockForUpdate()->max('sequence')) + 1;
            Receipt::query()->create(['payment_id' => $payment->id, 'sequence' => $sequence, 'receipt_year' => $receiptYear, 'receipt_no' => sprintf('OR-%d-%06d', $receiptYear, $sequence), 'issued_at' => now()]);

            return $payment->load(['allocations.installment', 'receipt']);
        });
    }
}
