<?php

namespace App\Actions;

use App\Contracts\BusinessDateProvider;
use App\Models\CloseOut;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmitCloseOutAction
{
    public function __construct(private readonly BusinessDateProvider $businessDate)
    {
    }

    public function handle(User $cashier, int $countedCashCents, ?string $varianceReason): CloseOut
    {
        return DB::transaction(function () use ($cashier, $countedCashCents, $varianceReason): CloseOut {
            $businessDate = $this->businessDate->current()->toDateString();
            $existing = CloseOut::query()
                ->whereDate('business_date', $businessDate)
                ->where('cashier_id', $cashier->id)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                throw ValidationException::withMessages(['close_out' => 'The close-out for this business date has already been submitted and is locked.']);
            }

            $systemCashCents = (int) Payment::query()
                ->where('recorded_by', $cashier->id)
                ->whereDate('paid_on', $businessDate)
                ->where('method', 'cash')
                ->where('status', 'valid')
                ->sum('amount_cents');
            $varianceCents = $countedCashCents - $systemCashCents;

            if ($varianceCents !== 0 && $varianceReason === null) {
                throw ValidationException::withMessages(['variance_reason' => 'Explain the non-zero cash variance before submitting the close-out.']);
            }

            return CloseOut::query()->create([
                'business_date' => $businessDate,
                'cashier_id' => $cashier->id,
                'system_totals' => ['cash_cents' => $systemCashCents],
                'counted_cash_cents' => $countedCashCents,
                'variance_cents' => $varianceCents,
                'variance_reason' => $varianceReason,
                'submitted_at' => now(),
            ]);
        });
    }
}
