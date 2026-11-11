<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\User;
use App\Models\VoidRequest;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyReportController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
            'page' => ['nullable', 'integer', 'min:1'],
            'void_page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50'],
        ]);
        $perPage = (int) ($filters['per_page'] ?? 10);
        /** @var User $user */
        $user = $request->user();
        $date = $filters['date'] ?? today('Asia/Manila')->toDateString();
        if ($user->role->value === 'cashier' && $date !== today('Asia/Manila')->toDateString()) {
            abort(403);
        }
        $dayStart = CarbonImmutable::parse($date, 'Asia/Manila')->startOfDay()->utc();
        $dayEnd = $dayStart->addDay();
        $payments = Payment::query()
            ->whereDate('paid_on', $date)
            ->when($user->role->value === 'cashier', fn ($query) => $query->where('recorded_by', $user->id));

        $byMethod = (clone $payments)
            ->whereIn('status', ['valid', 'void_pending'])
            ->selectRaw('method, SUM(amount_cents) as total_cents, COUNT(*) as transaction_count')
            ->groupBy('method')
            ->orderBy('method')
            ->get()
            ->map(fn ($row): array => ['method' => $row->method, 'totalCents' => (int) $row->total_cents, 'transactionCount' => (int) $row->transaction_count])
            ->all();

        $byCashier = (clone $payments)
            ->whereIn('status', ['valid', 'void_pending'])
            ->join('users as cashiers', 'payments.recorded_by', '=', 'cashiers.id')
            ->selectRaw('payments.recorded_by, cashiers.full_name, SUM(payments.amount_cents) as total_cents, COUNT(*) as transaction_count')
            ->groupBy('payments.recorded_by', 'cashiers.full_name')
            ->orderBy('cashiers.full_name')
            ->get()
            ->map(fn ($row): array => ['cashierId' => (string) $row->recorded_by, 'cashier' => $row->full_name, 'totalCents' => (int) $row->total_cents, 'transactionCount' => (int) $row->transaction_count])
            ->all();

        $paymentRows = (clone $payments)
            ->with(['student:id,lrn,full_name', 'recordedBy:id,full_name', 'receipt:id,payment_id,receipt_no', 'voidRequest:id,payment_id,status'])
            ->latest('paid_on')
            ->latest('id')
            ->paginate($perPage, ['*'], 'page', (int) ($filters['page'] ?? 1));

        $voidRows = VoidRequest::query()
            ->with(['payment.receipt', 'payment.student', 'requestedBy'])
            ->where(function ($query) use ($dayStart, $dayEnd): void {
                $query->where(function ($requests) use ($dayStart, $dayEnd): void {
                    $requests->where('requested_at', '>=', $dayStart)->where('requested_at', '<', $dayEnd);
                })->orWhere(function ($decisions) use ($dayStart, $dayEnd): void {
                    $decisions->where('decided_at', '>=', $dayStart)->where('decided_at', '<', $dayEnd);
                });
            })
            ->when($user->role->value === 'cashier', fn ($query) => $query->whereHas('payment', fn ($payments) => $payments->where('recorded_by', $user->id)))
            ->latest('requested_at')
            ->latest('id')
            ->paginate($perPage, ['*'], 'void_page', (int) ($filters['void_page'] ?? 1));

        $voids = $voidRows->getCollection()
            ->map(fn (VoidRequest $void): array => [
                'id' => (string) $void->id,
                'paymentId' => (string) $void->payment_id,
                'receiptNo' => $void->payment->receipt?->receipt_no,
                'lrn' => $void->payment->student->lrn,
                'studentName' => $void->payment->student->full_name,
                'amountCents' => (int) $void->payment->amount_cents,
                'status' => $void->status,
                'reason' => $void->reason,
                'requestedBy' => $void->requestedBy->full_name,
                'requestedAt' => $void->requested_at->toISOString(),
                'decidedAt' => $void->decided_at?->toISOString(),
            ])->all();

        return response()->json([
            'data' => [
                'date' => $date,
                'totalCents' => array_sum(array_column($byMethod, 'totalCents')),
                'byMethod' => $byMethod,
                'byCashier' => $byCashier,
                'payments' => $paymentRows->getCollection()->map(fn (Payment $payment): array => [
                    'id' => (string) $payment->id,
                    'lrn' => $payment->student->lrn,
                    'studentName' => $payment->student->full_name,
                    'receiptNo' => $payment->receipt?->receipt_no,
                    'amountCents' => (int) $payment->amount_cents,
                    'method' => $payment->method,
                    'status' => $payment->status,
                    'cashier' => $payment->recordedBy->full_name,
                    'voidStatus' => $payment->voidRequest?->status,
                ])->all(),
                'voids' => $voids,
                'meta' => ['currentPage' => $paymentRows->currentPage(), 'lastPage' => $paymentRows->lastPage(), 'totalPayments' => $paymentRows->total(), 'perPage' => $paymentRows->perPage()],
                'voidMeta' => ['currentPage' => $voidRows->currentPage(), 'lastPage' => $voidRows->lastPage(), 'total' => $voidRows->total(), 'perPage' => $voidRows->perPage()],
            ],
        ]);
    }
}
