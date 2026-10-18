<?php

namespace App\Services;

use App\Models\AuditEntry;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditLogger
{
    public function record(Request $request, string $action, ?Model $entity = null, ?array $before = null, ?array $after = null): void
    {
        AuditEntry::query()->forceCreate([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'entity_type' => $entity?->getMorphClass() ?? 'session',
            'entity_id' => (string) ($entity?->getKey() ?? 'none'),
            'before' => $before,
            'after' => $after,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'occurred_at' => now(),
        ]);
    }

    public function recordAuthenticationFailure(
        Request $request,
        string $username,
        string $outcome,
        ?User $user = null,
    ): void {
        $this->record(
            $request,
            'auth.login_failed',
            $user,
            null,
            [
                'username' => $username,
                'outcome' => $outcome,
            ],
        );
    }
}
