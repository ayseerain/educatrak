<?php

namespace App\Actions;

use App\Models\Payment;
use App\Models\User;
use App\Models\VoidRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RequestVoidAction
{
    public function handle(Payment $payment, User $requestedBy, string $reason): VoidRequest
    {
        return DB::transaction(function () use ($payment, $requestedBy, $reason): VoidRequest {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);

            if ($payment->status !== 'valid') {
                throw ValidationException::withMessages(['payment' => 'Only valid payments can be submitted for void approval.']);
            }

            $voidRequest = VoidRequest::query()->create([
                'payment_id' => $payment->id,
                'reason' => $reason,
                'requested_by' => $requestedBy->id,
                'requested_at' => now(),
                'status' => 'pending',
            ]);

            $payment->update(['status' => 'void_pending']);

            return $voidRequest->load(['payment.receipt', 'requestedBy']);
        });
    }
}
