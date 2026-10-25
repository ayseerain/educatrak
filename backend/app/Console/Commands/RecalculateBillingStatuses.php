<?php

namespace App\Console\Commands;

use App\Actions\RecalculateBillingStatusAction;
use App\Models\BillingAccount;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RecalculateBillingStatuses extends Command
{
    protected $signature = 'educatrak:recalculate-billing-statuses';

    protected $description = 'Refresh installment and billing-account statuses from due dates and the configured due-soon window';

    public function handle(RecalculateBillingStatusAction $recalculate): int
    {
        $updated = 0;

        BillingAccount::query()->select('id')->chunkById(100, function ($accounts) use ($recalculate, &$updated): void {
            foreach ($accounts as $account) {
                DB::transaction(function () use ($account, $recalculate, &$updated): void {
                    $recalculate->handle($account);
                    $updated++;
                });
            }
        });

        $this->info("Recalculated statuses for {$updated} billing accounts.");

        return self::SUCCESS;
    }
}
