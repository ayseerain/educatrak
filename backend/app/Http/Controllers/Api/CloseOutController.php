<?php

namespace App\Http\Controllers\Api;

use App\Actions\SubmitCloseOutAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCloseOutRequest;
use App\Models\CloseOut;
use App\Models\Payment;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CloseOutController extends Controller
{
    public function today(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $businessDate = today('Asia/Manila')->toDateString();
        $systemCashCents = (int) Payment::query()
            ->where('recorded_by', $user->id)
            ->where('paid_on', $businessDate)
            ->where('method', 'cash')
            ->where('status', 'valid')
            ->sum('amount_cents');
        $closeOut = CloseOut::query()
            ->where('cashier_id', $user->id)
            ->where('business_date', $businessDate)
            ->first();

        return response()->json(['data' => [
            'business_date' => $businessDate,
            'system_cash_cents' => $systemCashCents,
            'close_out' => $closeOut === null ? null : $this->closeOutData($closeOut),
        ]]);
    }

    public function store(StoreCloseOutRequest $request, SubmitCloseOutAction $submitCloseOut, AuditLogger $auditLogger): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();
        $closeOut = $submitCloseOut->handle($user, $validated['counted_cash_cents'], $validated['variance_reason'] ?? null);
        $auditLogger->record($request, 'closeout.submitted', $closeOut, null, $this->closeOutData($closeOut));

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
        if ($closeOut->signed_off_at !== null) {
            return response()->json(['message' => 'This close-out is already signed off.'], 422);
        }

        $closeOut->update(['signed_off_by' => $request->user()->id, 'signed_off_at' => now()]);
        $auditLogger->record($request, 'closeout.signed_off', $closeOut);

        return response()->json(['data' => $this->closeOutData($closeOut->fresh(['cashier', 'signedOffBy']))]);
    }

    /** @return array<string, mixed> */
    private function closeOutData(CloseOut $closeOut): array
    {
        return [
            'id' => (string) $closeOut->id,
            'business_date' => $closeOut->business_date->toDateString(),
            'cashier' => $closeOut->cashier?->full_name,
            'system_cash_cents' => $closeOut->system_totals['cash_cents'],
            'counted_cash_cents' => $closeOut->counted_cash_cents,
            'variance_cents' => $closeOut->variance_cents,
            'variance_reason' => $closeOut->variance_reason,
            'submitted_at' => $closeOut->submitted_at->toISOString(),
            'signed_off_at' => $closeOut->signed_off_at?->toISOString(),
        ];
    }
}
