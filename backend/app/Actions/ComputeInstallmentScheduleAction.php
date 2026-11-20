<?php

namespace App\Actions;

use App\Models\PaymentPlan;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

/**
 * Builds an installment schedule from a payment plan in integer centavos.
 *
 * Owner-approved rules (2026-11-19/20): due dates count from the anchor (the account creation business date),
 * the down payment is due on the anchor, a percent down payment is in basis points rounded down, each installment
 * takes floor(remaining x basis points / 10000), and the last installment absorbs the remainder.
 * Zero-amount rows are omitted.
 */
class ComputeInstallmentScheduleAction
{
    /** @return list<array{label: string, sequence: int, due_day_offset: int, due_date: string, amount_cents: int}> */
    public function handle(PaymentPlan $plan, int $totalCents, CarbonImmutable $anchor, string $errorField = 'payment_plan_id'): array
    {
        $plan->loadMissing('installments');
        $downPayment = $plan->down_payment_type === 'percent'
            ? intdiv($totalCents * (int) $plan->down_payment_value, 10_000)
            : (int) $plan->down_payment_value;

        if ($downPayment > $totalCents) {
            throw ValidationException::withMessages([$errorField => 'The plan down payment is larger than the total due.']);
        }

        $rows = [];
        if ($downPayment > 0) {
            $rows[] = ['label' => 'Down payment', 'due_day_offset' => 0, 'amount_cents' => $downPayment];
        }

        $remaining = $totalCents - $downPayment;
        $allocated = 0;
        $lastIndex = $plan->installments->count() - 1;
        foreach ($plan->installments->values() as $index => $installment) {
            $amount = $index === $lastIndex
                ? $remaining - $allocated
                : intdiv($remaining * (int) $installment->percent_of_remaining_basis_points, 10_000);
            $allocated += $amount;
            $rows[] = ['label' => $installment->label, 'due_day_offset' => (int) $installment->due_day_offset, 'amount_cents' => $amount];
        }

        $schedule = [];
        foreach ($rows as $row) {
            if ($row['amount_cents'] <= 0) {
                continue;
            }
            $schedule[] = [
                'label' => $row['label'],
                'sequence' => count($schedule) + 1,
                'due_day_offset' => $row['due_day_offset'],
                'due_date' => $anchor->addDays($row['due_day_offset'])->toDateString(),
                'amount_cents' => $row['amount_cents'],
            ];
        }

        if (array_sum(array_column($schedule, 'amount_cents')) !== $totalCents) {
            throw ValidationException::withMessages([$errorField => 'The selected payment plan does not produce a schedule equal to the total due.']);
        }

        return $schedule;
    }
}
