<?php

namespace App\Actions;

use App\Models\Payment;
use App\Models\User;

class CalculateCloseOutSystemTotalsAction
{
    /** @return array{cash_cents: int, by_method: array<string, int>} */
    public function handle(User $cashier, string $businessDate): array
    {
        $byMethod = Payment::query()
            ->where('recorded_by', $cashier->id)
            ->whereDate('paid_on', $businessDate)
            ->where('status', 'valid')
            ->selectRaw('method, SUM(amount_cents) as total_cents')
            ->groupBy('method')
            ->orderBy('method')
            ->pluck('total_cents', 'method')
            ->map(static fn ($total): int => (int) $total)
            ->all();

        return [
            'cash_cents' => $byMethod['cash'] ?? 0,
            'by_method' => $byMethod,
        ];
    }
}
