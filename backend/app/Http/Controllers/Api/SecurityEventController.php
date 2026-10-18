<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecurityEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $events = AuditEntry::query()
            ->whereIn('action', [
                'auth.login',
                'auth.login_failed',
                'auth.logout',
                'auth.change_password',
                'user.created',
                'user.updated',
                'user.password_reset',
            ])
            ->latest('occurred_at')
            ->paginate(50);

        return response()->json([
            'data' => $events->getCollection()->map(fn (AuditEntry $event): array => [
                'id' => (string) $event->id,
                'action' => $event->action,
                'entityType' => $event->entity_type,
                'entityId' => $event->entity_id,
                'details' => $event->after,
                'occurredAt' => $event->occurred_at->toISOString(),
            ]),
            'meta' => [
                'currentPage' => $events->currentPage(),
                'lastPage' => $events->lastPage(),
                'total' => $events->total(),
            ],
        ]);
    }
}
