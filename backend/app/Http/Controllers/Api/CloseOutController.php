<?php

namespace App\Http\Controllers\Api;

use App\Actions\CalculateCloseOutSystemTotalsAction;
use App\Actions\SubmitCloseOutAction;
use App\Contracts\BusinessDateProvider;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCloseOutRequest;
use App\Models\CloseOut;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CloseOutController extends Controller
{
    public function today(Request $request, BusinessDateProvider $businessDate, CalculateCloseOutSystemTotalsAction $calculateSystemTotals): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $businessDate = $businessDate->current()->toDateString();
        $systemTotals = $calculateSystemTotals->handle($user, $businessDate);
        $closeOut = CloseOut::query()
            ->with(['cashier', 'signedOffBy'])
            ->where('cashier_id', $user->id)
            ->whereDate('business_date', $businessDate)
            ->first();

        return response()->json(['data' => [
            'business_date' => $businessDate,
            'system_cash_cents' => $systemTotals['cash_cents'],
            'system_totals' => $systemTotals['by_method'],
            'close_out' => $closeOut === null ? null : $this->closeOutData($closeOut),
        ]]);
    }

    public function store(StoreCloseOutRequest $request, SubmitCloseOutAction $submitCloseOut, AuditLogger $auditLogger): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();
        $closeOut = DB::transaction(function () use ($request, $submitCloseOut, $auditLogger, $user, $validated): CloseOut {
            $closeOut = $submitCloseOut->handle($user, $validated['counted_cash_cents'], $validated['variance_reason'] ?? null);
            $auditLogger->record($request, 'closeout.submitted', $closeOut, null, $this->closeOutData($closeOut));

            return $closeOut;
        });

        return response()->json(['data' => $this->closeOutData($closeOut)], 201);
    }

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $closeOuts = CloseOut::query()
            ->with(['cashier', 'signedOffBy'])
            ->when($user->role->value === 'cashier', fn ($query) => $query->where('cashier_id', $user->id))
            ->latest('business_date')
            ->latest('id')
            ->get();

        return response()->json(['data' => $closeOuts->map(fn (CloseOut $closeOut): array => $this->closeOutData($closeOut))->all()]);
    }

    public function signOff(Request $request, CloseOut $closeOut, AuditLogger $auditLogger): JsonResponse
    {
        $signedOff = DB::transaction(function () use ($request, $closeOut, $auditLogger): ?CloseOut {
            $lockedCloseOut = CloseOut::query()
                ->lockForUpdate()
                ->findOrFail($closeOut->id);

            if ($lockedCloseOut->signed_off_at !== null) {
                return null;
            }

            $lockedCloseOut->update([
                'signed_off_by' => $request->user()->id,
                'signed_off_at' => now(),
            ]);
            $auditLogger->record($request, 'closeout.signed_off', $lockedCloseOut);

            return $lockedCloseOut->fresh(['cashier', 'signedOffBy']);
        });

        if ($signedOff === null) {
            return response()->json(['message' => 'This close-out is already signed off.'], 422);
        }

        return response()->json(['data' => $this->closeOutData($signedOff)]);
    }

    /** @return array<string, mixed> */
    private function closeOutData(CloseOut $closeOut): array
    {
        return [
            'id' => (string) $closeOut->id,
            'business_date' => $closeOut->business_date->toDateString(),
            'cashier' => $closeOut->cashier?->full_name,
            'system_cash_cents' => $closeOut->system_totals['cash_cents'],
            'system_totals' => $closeOut->system_totals['by_method'] ?? ['cash' => $closeOut->system_totals['cash_cents']],
            'counted_cash_cents' => $closeOut->counted_cash_cents,
            'variance_cents' => $closeOut->variance_cents,
            'variance_reason' => $closeOut->variance_reason,
            'submitted_at' => $closeOut->submitted_at->toISOString(),
            'signed_off_at' => $closeOut->signed_off_at?->toISOString(),
            'signed_off_by' => $closeOut->signedOffBy?->full_name,
        ];
    }
}
