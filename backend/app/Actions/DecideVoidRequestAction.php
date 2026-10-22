<?php

namespace App\Actions;

use App\Models\BillingAccount;
use App\Models\Installment;
use App\Models\Payment;
use App\Models\User;
use App\Models\VoidRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DecideVoidRequestAction
{
    public function handle(VoidRequest $voidRequest, User $decidedBy, string $decision, string $note): VoidRequest
    {
        return DB::transaction(function () use ($voidRequest, $decidedBy, $decision, $note): VoidRequest {
            $voidRequest = VoidRequest::query()->lockForUpdate()->findOrFail($voidRequest->id);

            if ($voidRequest->status !== 'pending') {
                throw ValidationException::withMessages(['void_request' => 'This void request has already been decided.']);
            }

            $payment = Payment::query()->with('allocations')->lockForUpdate()->findOrFail($voidRequest->payment_id);

            if ($payment->recorded_by === $decidedBy->id) {
                throw ValidationException::withMessages(['void_request' => 'The cashier who recorded a payment cannot approve or reject its void request.']);
            }

            $voidRequest->update([
                'status' => $decision,
                'decided_by' => $decidedBy->id,
                'decided_at' => now(),
                'decision_note' => $note,
            ]);

            if ($decision === 'rejected') {
                $payment->update(['status' => 'valid']);

                return $voidRequest->load(['payment.receipt', 'requestedBy']);
            }

            $account = BillingAccount::query()->lockForUpdate()->findOrFail($payment->billing_account_id);
            foreach ($payment->allocations as $allocation) {
                $installment = Installment::query()->lockForUpdate()->findOrFail($allocation->installment_id);
                $paidCents = max(0, $installment->paid_cents - $allocation->amount_cents);
                $installment->update([
                    'paid_cents' => $paidCents,
                    'status' => $paidCents === 0 && $installment->due_date->isPast() ? 'overdue' : ($paidCents === $installment->amount_cents ? 'paid' : 'current'),
                ]);
            }

            $account->update([
                'total_paid_cents' => max(0, $account->total_paid_cents - $payment->amount_cents),
                'balance_cents' => $account->balance_cents + $payment->amount_cents,
            ]);
            $payment->update(['status' => 'voided']);

            return $voidRequest->load(['payment.receipt', 'requestedBy']);
        });
    }
}
