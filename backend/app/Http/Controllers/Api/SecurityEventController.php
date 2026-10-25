<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditEntry;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecurityEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'user' => ['nullable', 'string', 'max:120'],
            'action' => ['nullable', 'string', 'max:120'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50'],
        ]);
        $events = AuditEntry::query()
            ->leftJoin('users as target_users', function ($join): void {
                $join->on('audit_entries.entity_id', '=', 'target_users.id')
                    ->where('audit_entries.entity_type', '=', (new User())->getMorphClass());
            })
            ->leftJoin('users as actor_users', 'audit_entries.user_id', '=', 'actor_users.id')
            ->select([
                'audit_entries.*',
                'target_users.username as target_username',
                'target_users.full_name as target_name',
                'actor_users.full_name as actor_name',
                'actor_users.username as actor_username',
            ])
            ->whereIn('action', [
                'auth.login',
                'auth.login_failed',
                'auth.logout',
                'auth.change_password',
                'user.created',
                'user.updated',
                'user.password_reset',
            ])
            ->when(isset($filters['user']) && trim($filters['user']) !== '', function ($query) use ($filters): void {
                $term = '%' . trim($filters['user']) . '%';
                $query->where(function ($matches) use ($term): void {
                    $matches->where('target_users.username', 'like', $term)
                        ->orWhere('target_users.full_name', 'like', $term)
                        ->orWhere('actor_users.username', 'like', $term)
                        ->orWhere('actor_users.full_name', 'like', $term)
                        ->orWhere('audit_entries.after->username', 'like', $term);
                });
            })
            ->when(isset($filters['action']) && trim($filters['action']) !== '', fn ($query) => $query->where('audit_entries.action', 'like', '%' . trim($filters['action']) . '%'))
            ->when(isset($filters['date_from']), fn ($query) => $query->where('audit_entries.occurred_at', '>=', CarbonImmutable::parse($filters['date_from'], 'Asia/Manila')->startOfDay()->utc()))
            ->when(isset($filters['date_to']), fn ($query) => $query->where('audit_entries.occurred_at', '<', CarbonImmutable::parse($filters['date_to'], 'Asia/Manila')->addDay()->startOfDay()->utc()))
            ->latest('occurred_at')
            ->latest('audit_entries.id')
            ->paginate((int) ($filters['per_page'] ?? 10));

        return response()->json([
            'data' => $events->getCollection()->map(fn (AuditEntry $event): array => [
                'id' => (string) $event->id,
                'action' => $event->action,
                'entityType' => $event->entity_type,
                'entityId' => $event->entity_id,
                'account' => $this->safeString($event->after['username'] ?? null)
                    ?? $event->target_username
                    ?? $event->actor_username,
                'accountName' => $this->safeString($event->after['fullName'] ?? null)
                    ?? $event->target_name,
                'actorName' => $event->actor_name,
                'details' => $this->safeDetails($event->after),
                'occurredAt' => $event->occurred_at->toISOString(),
            ]),
            'meta' => [
                'currentPage' => $events->currentPage(),
                'lastPage' => $events->lastPage(),
                'total' => $events->total(),
                'perPage' => $events->perPage(),
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
        foreach (['username', 'fullName', 'role', 'active', 'must_change_password', 'outcome'] as $key) {
            $value = $details[$key] ?? null;
            $valid = match ($key) {
                'active', 'must_change_password' => is_bool($value),
                default => is_string($value) && $value !== '',
            };

            if ($valid) {
                $safe[$key] = $value;
            }
        }

        return $safe;
    }

    private function safeString(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? $value : null;
    }
}
