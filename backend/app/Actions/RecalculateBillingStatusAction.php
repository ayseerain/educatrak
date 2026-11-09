<?php

namespace App\Actions;

use App\Models\BillingAccount;
use App\Models\Installment;
use App\Models\SystemSetting;
use Carbon\CarbonImmutable;

class RecalculateBillingStatusAction
{
    private const DUE_SOON_DAYS_SETTING = 'billing.due_soon_days';

    private const DEFAULT_DUE_SOON_DAYS = 7;

    public function handle(BillingAccount $billingAccount): BillingAccount
    {
        $account = BillingAccount::query()->lockForUpdate()->findOrFail($billingAccount->id);
        $today = CarbonImmutable::now('Asia/Manila')->startOfDay();
        $dueSoonThrough = $today->addDays($this->dueSoonDays());
        $statuses = [];

        $installments = Installment::query()
            ->where('billing_account_id', $account->id)
            ->lockForUpdate()
            ->get();

        foreach ($installments as $installment) {
            $dueDate = CarbonImmutable::parse($installment->due_date->toDateString(), 'Asia/Manila')->startOfDay();
            $paidCents = (int) $installment->paid_cents;
            $amountCents = (int) $installment->amount_cents;
            $status = match (true) {
                $paidCents >= $amountCents => 'paid',
                $dueDate->lt($today) => 'overdue',
                $dueDate->lte($dueSoonThrough) => 'due_soon',
                default => 'current',
            };

            if ($installment->status !== $status) {
                $installment->update(['status' => $status]);
            }

            $statuses[] = $status;
        }

        $rank = ['paid' => 0, 'current' => 1, 'due_soon' => 2, 'overdue' => 3];
        $accountStatus = $statuses === []
            ? ((int) $account->balance_cents === 0 ? 'paid' : 'current')
            : collect($statuses)->sortByDesc(fn (string $status): int => $rank[$status])->first();

        if ($account->status !== $accountStatus) {
            $account->update(['status' => $accountStatus]);
        }

        return $account->refresh();
    }

    private function dueSoonDays(): int
    {
        $value = SystemSetting::query()
            ->where('key', self::DUE_SOON_DAYS_SETTING)
            ->value('value');

        if (is_int($value) && $value >= 0) {
            return $value;
        }

        if (is_string($value) && ctype_digit($value)) {
            return (int) $value;
        }

        return self::DEFAULT_DUE_SOON_DAYS;
    }
}
