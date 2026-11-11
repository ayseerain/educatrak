<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationLog;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NotificationLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['queued', 'sent', 'failed', 'not_sent'])],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'student' => ['nullable', 'string', 'max:120'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50'],
        ]);
        $logs = NotificationLog::query()
            ->with('student:id,lrn,full_name')
            ->when(isset($filters['status']), fn ($query) => $query->where('status', $filters['status']))
            ->when(isset($filters['date_from']), fn ($query) => $query->where('created_at', '>=', CarbonImmutable::parse($filters['date_from'], 'Asia/Manila')->startOfDay()->utc()))
            ->when(isset($filters['date_to']), fn ($query) => $query->where('created_at', '<', CarbonImmutable::parse($filters['date_to'], 'Asia/Manila')->addDay()->startOfDay()->utc()))
            ->when(isset($filters['student']) && trim($filters['student']) !== '', fn ($query) => $query->whereHas('student', function ($students) use ($filters): void {
                $term = '%' . trim($filters['student']) . '%';
                $students->where('full_name', 'like', $term)->orWhere('lrn', 'like', $term);
            }))
            ->latest('created_at')
            ->latest('id')
            ->paginate((int) ($filters['per_page'] ?? 10));

        return response()->json([
            'data' => $logs->getCollection()->map(fn (NotificationLog $log): array => [
                'id' => (string) $log->id,
                'studentId' => (string) $log->student_id,
                'lrn' => $log->student?->lrn,
                'studentName' => $log->student?->full_name,
                'paymentId' => $log->payment_id === null ? null : (string) $log->payment_id,
                'channel' => $log->channel,
                'recipient' => $log->guardian_email ?? $log->guardian_mobile,
                'type' => $log->kind,
                'status' => $log->status,
                'attempts' => (int) $log->attempts,
                'failureReason' => $log->failure_reason,
                'loadFeeCents' => $log->load_fee_cents === null ? null : (int) $log->load_fee_cents,
                'createdAt' => $log->created_at->toISOString(),
                'sentAt' => $log->sent_at?->toISOString(),
            ]),
            'meta' => [
                'currentPage' => $logs->currentPage(),
                'lastPage' => $logs->lastPage(),
                'total' => $logs->total(),
                'perPage' => $logs->perPage(),
            ],
        ]);
    }
}
