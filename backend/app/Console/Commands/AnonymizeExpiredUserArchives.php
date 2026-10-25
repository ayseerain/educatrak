<?php

namespace App\Console\Commands;

use App\Models\AuditEntry;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AnonymizeExpiredUserArchives extends Command
{
    protected $signature = 'educatrak:anonymize-expired-user-archives';

    protected $description = 'Anonymize archived user accounts after the configured retention period';

    public function handle(): int
    {
        $count = 0;
        User::query()->whereNotNull('archived_at')->whereNotNull('anonymize_at')->where('anonymize_at', '<=', now())->orderBy('id')->chunkById(100, function ($users) use (&$count): void {
            foreach ($users as $candidate) {
                DB::transaction(function () use ($candidate, &$count): void {
                    $user = User::query()->lockForUpdate()->find($candidate->id);
                    if ($user === null || $user->archived_at === null || $user->anonymize_at === null || $user->anonymize_at->isFuture()) {
                        return;
                    }

                    $username = 'archived-' . $user->id;
                    $fullName = 'Archived account ' . $user->id;
                    $morphType = $user->getMorphClass();
                    AuditEntry::query()->where('entity_type', $morphType)->where('entity_id', (string) $user->id)->chunkById(100, function ($entries) use ($username, $fullName): void {
                        foreach ($entries as $entry) {
                            $entry->forceFill([
                                'before' => $this->anonymizePayload($entry->before, $username, $fullName),
                                'after' => $this->anonymizePayload($entry->after, $username, $fullName),
                            ])->save();
                        }
                    });
                    $user->forceFill([
                        'username' => $username,
                        'full_name' => $fullName,
                        'email' => null,
                        'last_login_at' => null,
                    ])->save();
                    $count++;
                });
            }
        });

        $this->info("Anonymized {$count} expired archived user account(s).");
        return self::SUCCESS;
    }

    /** @param array<string, mixed>|null $payload
     *  @return array<string, mixed>|null
     */
    private function anonymizePayload(?array $payload, string $username, string $fullName): ?array
    {
        if ($payload === null) return null;
        foreach (['username'] as $key) if (array_key_exists($key, $payload)) $payload[$key] = $username;
        foreach (['fullName', 'full_name'] as $key) if (array_key_exists($key, $payload)) $payload[$key] = $fullName;
        foreach (['email', 'mobile', 'phone'] as $key) if (array_key_exists($key, $payload)) $payload[$key] = null;
        return $payload;
    }
}
