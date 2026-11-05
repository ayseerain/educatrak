<?php

namespace App\Services;

use App\Contracts\BusinessDateProvider;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Session\Session;

class SessionBusinessDateProvider implements BusinessDateProvider
{
    private const SESSION_KEY = 'educatrak.business_datetime_simulator';

    public function __construct(
        private readonly Session $session,
    ) {
    }

    public function current(): CarbonImmutable
    {
        return $this->simulatedDate() ?? CarbonImmutable::now('Asia/Manila');
    }

    public function simulatorAvailable(): bool
    {
        return in_array(config('app.env'), ['local', 'testing'], true)
            && (bool) config('business_date_simulator.enabled');
    }

    public function simulatedDate(): ?CarbonImmutable
    {
        if (! $this->simulatorAvailable()) {
            return null;
        }

        $dateTime = $this->session->get(self::SESSION_KEY);

        return is_string($dateTime) ? CarbonImmutable::parse($dateTime, 'Asia/Manila') : null;
    }

    public function simulate(CarbonImmutable $date): void
    {
        if (! $this->simulatorAvailable()) {
            abort(404);
        }

        $this->session->put(self::SESSION_KEY, $date->toIso8601String());
    }

    public function restore(): void
    {
        if (! $this->simulatorAvailable()) {
            abort(404);
        }

        $this->session->forget(self::SESSION_KEY);
    }
}
