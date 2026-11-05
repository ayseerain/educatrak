<?php

namespace App\Http\Controllers\Api;

use App\Contracts\BusinessDateProvider;
use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessDateSimulatorController extends Controller
{
    public function show(BusinessDateProvider $businessDate): JsonResponse
    {
        $this->ensureAvailable($businessDate);

        return response()->json(['data' => $this->data($businessDate)]);
    }

    public function store(Request $request, BusinessDateProvider $businessDate): JsonResponse
    {
        $this->ensureAvailable($businessDate);
        $validated = $request->validate(['business_datetime' => ['required', 'date_format:Y-m-d\\TH:i']]);
        $businessDate->simulate(CarbonImmutable::createFromFormat('Y-m-d\\TH:i', $validated['business_datetime'], 'Asia/Manila'));

        return response()->json(['data' => $this->data($businessDate)]);
    }

    public function destroy(BusinessDateProvider $businessDate): JsonResponse
    {
        $this->ensureAvailable($businessDate);
        $businessDate->restore();

        return response()->json(['data' => $this->data($businessDate)]);
    }

    private function ensureAvailable(BusinessDateProvider $businessDate): void
    {
        abort_unless($businessDate->simulatorAvailable(), 404);
    }

    /** @return array{business_date: string, business_datetime: string, simulated_at: string|null} */
    private function data(BusinessDateProvider $businessDate): array
    {
        return [
            'business_date' => $businessDate->current()->toDateString(),
            'business_datetime' => $businessDate->current()->toIso8601String(),
            'simulated_at' => $businessDate->simulatedDate()?->toIso8601String(),
        ];
    }
}
