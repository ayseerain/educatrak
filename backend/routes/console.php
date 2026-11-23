<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('educatrak:recalculate-billing-statuses')
    ->dailyAt('00:05')
    ->timezone('Asia/Manila')
    ->withoutOverlapping();

Schedule::command('educatrak:anonymize-expired-user-archives')
    ->dailyAt('00:15')
    ->timezone('Asia/Manila')
    ->withoutOverlapping();

Schedule::command('educatrak:backup-database')
    ->dailyAt((string) config('educatrak.backup.daily_at'))
    ->timezone('Asia/Manila')
    ->withoutOverlapping();
