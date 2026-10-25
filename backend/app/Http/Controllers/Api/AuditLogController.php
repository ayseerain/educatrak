<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditEntry;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    private const SafeDetailKeys = [
        'username', 'role', 'active', 'must_change_password', 'status', 'amount_cents',
        'receipt_no', 'reprint_count', 'business_date', 'cashier', 'system_cash_cents',
        'counted_cash_cents', 'variance_cents', 'variance_reason', 'submitted_at',
        'signed_off_at', 'signed_off_by', 'outcome', 'reason', 'decision', 'decision_note',
    ];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'user' => ['nullable', 'string', 'max:120'],
            'action' => ['nullable', 'string', 'max:120'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'entity_type' => ['nullable', 'string', 'max:120'],
            'entity_id' => ['nullable', 'string', 'max:120'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50'],
        ]);

        $entries = AuditEntry::query()
            ->leftJoin('users as actors', 'audit_entries.user_id', '=', 'actors.id')
            ->select(['audit_entries.*', 'actors.full_name as actor_name', 'actors.username as actor_username'])
            ->when(isset($filters['user']) && trim($filters['user']) !== '', fn ($query) => $query->where(function ($actors) use ($filters): void {
                $term = '%' . trim($filters['user']) . '%';
                $actors->where('actors.full_name', 'like', $term)->orWhere('actors.username', 'like', $term);
            }))
            ->when(isset($filters['action']) && trim($filters['action']) !== '', fn ($query) => $query->where('audit_entries.action', 'like', '%' . trim($filters['action']) . '%'))
            ->when(isset($filters['date_from']), fn ($query) => $query->where('audit_entries.occurred_at', '>=', CarbonImmutable::parse($filters['date_from'], 'Asia/Manila')->startOfDay()->utc()))
            ->when(isset($filters['date_to']), fn ($query) => $query->where('audit_entries.occurred_at', '<', CarbonImmutable::parse($filters['date_to'], 'Asia/Manila')->addDay()->startOfDay()->utc()))
            ->when(isset($filters['entity_type']) && trim($filters['entity_type']) !== '', fn ($query) => $query->where('audit_entries.entity_type', $filters['entity_type']))
            ->when(isset($filters['entity_id']) && trim($filters['entity_id']) !== '', fn ($query) => $query->where('audit_entries.entity_id', $filters['entity_id']))
            ->latest('audit_entries.occurred_at')
            ->latest('audit_entries.id')
            ->paginate((int) ($filters['per_page'] ?? 10));

        return response()->json([
            'data' => $entries->getCollection()->map(fn (AuditEntry $entry): array => [
                'id' => (string) $entry->id,
                'actor' => $entry->actor_name ?: $entry->actor_username,
                'actorId' => $entry->user_id === null ? null : (string) $entry->user_id,
                'action' => $entry->action,
                'entityType' => $entry->entity_type,
                'entityId' => $entry->entity_id,
                'before' => $this->safeDetails($entry->before),
                'after' => $this->safeDetails($entry->after),
                'occurredAt' => $entry->occurred_at->toISOString(),
            ]),
            'meta' => [
                'currentPage' => $entries->currentPage(),
                'lastPage' => $entries->lastPage(),
                'total' => $entries->total(),
                'perPage' => $entries->perPage(),
            ],
        ]);
    }

    /** @param array<string, mixed>|null $details
     *  @return array<string, mixed>|null
     */
    private function safeDetails(?array $details): ?array
    {
        if ($details === null) {
            return null;
        }

        $safe = [];
        foreach (self::SafeDetailKeys as $key) {
            if (array_key_exists($key, $details) && (is_scalar($details[$key]) || $details[$key] === null)) {
                $safe[$key] = $details[$key];
            }
        }

        return $safe;
    }
}
