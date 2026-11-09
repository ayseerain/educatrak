<?php

namespace App\Http\Controllers\Api;

use App\Actions\DecideVoidRequestAction;
use App\Actions\RequestVoidAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\DecideVoidRequestRequest;
use App\Http\Requests\StoreVoidRequestRequest;
use App\Models\Payment;
use App\Models\User;
use App\Models\VoidRequest;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VoidRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $voidRequests = VoidRequest::query()
            ->with(['payment.receipt', 'requestedBy'])
            ->when($user->role->value === 'cashier', fn ($query) => $query->where('requested_by', $user->id))
            ->latest('requested_at')
            ->latest('id')
            ->get();

        return response()->json(['data' => $voidRequests->map(fn (VoidRequest $voidRequest): array => $this->voidRequestData($voidRequest))->all()]);
    }

    public function store(
        StoreVoidRequestRequest $request,
        Payment $payment,
        RequestVoidAction $requestVoid,
        AuditLogger $auditLogger,
    ): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if ($user->role->value === 'cashier' && $payment->recorded_by !== $user->id) {
            abort(404);
        }

        $voidRequest = $requestVoid->handle($payment, $user, $request->validated('reason'));
        $auditLogger->record($request, 'payment.void_requested', $payment, ['status' => 'valid'], ['status' => 'void_pending']);

        return response()->json(['data' => $this->voidRequestData($voidRequest)], 201);
    }

    public function update(
        DecideVoidRequestRequest $request,
        VoidRequest $voidRequest,
        DecideVoidRequestAction $decideVoidRequest,
        AuditLogger $auditLogger,
    ): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();
        $resolvedRequest = $decideVoidRequest->handle(
            $voidRequest,
            $user,
            $validated['decision'],
            $validated['decision_note'],
        );
        $action = $validated['decision'] === 'approved' ? 'payment.void_approved' : 'payment.void_rejected';
        $auditLogger->record($request, $action, $resolvedRequest->payment, ['status' => 'void_pending'], ['status' => $resolvedRequest->payment->status]);

        return response()->json(['data' => $this->voidRequestData($resolvedRequest)]);
    }

    /** @return array<string, mixed> */
    private function voidRequestData(VoidRequest $voidRequest): array
    {
        return [
            'id' => (string) $voidRequest->id,
            'payment_id' => (string) $voidRequest->payment_id,
            'receipt_no' => $voidRequest->payment->receipt?->receipt_no,
            'amount_cents' => $voidRequest->payment->amount_cents,
            'reason' => $voidRequest->reason,
            'status' => $voidRequest->status,
            'requested_by' => $voidRequest->requestedBy->full_name,
            'requested_at' => $voidRequest->requested_at->toISOString(),
            'decision_note' => $voidRequest->decision_note,
        ];
    }
}
