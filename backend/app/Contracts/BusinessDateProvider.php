<?php

namespace App\Contracts;

use Carbon\CarbonImmutable;

interface BusinessDateProvider
{
    public function current(): CarbonImmutable;

    public function simulatorAvailable(): bool;

    public function simulatedDate(): ?CarbonImmutable;

    public function simulate(CarbonImmutable $date): void;

    public function restore(): void;
}
