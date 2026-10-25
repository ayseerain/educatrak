<?php

namespace Tests\Feature;

use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BackupReadTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_view_backup_history_in_reverse_completion_order(): void
    {
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        DB::table('backup_records')->insert([
            ['result' => 'failed', 'size_bytes' => null, 'error' => 'Storage unavailable', 'completed_at' => '2026-10-24 03:00:00', 'created_at' => now(), 'updated_at' => now()],
            ['result' => 'succeeded', 'size_bytes' => 2048, 'error' => null, 'completed_at' => '2026-10-25 03:00:00', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->actingAs($administrator)->getJson('/api/backups')
            ->assertOk()
            ->assertJsonPath('data.0.result', 'succeeded')
            ->assertJsonPath('data.0.sizeBytes', 2048)
            ->assertJsonPath('data.0.completedAt', '2026-10-25 03:00:00')
            ->assertJsonPath('data.1.error', 'Storage unavailable');
    }

    public function test_non_administrators_cannot_view_backup_history(): void
    {
        $this->actingAs(User::factory()->create(['role' => UserRole::Accounting]))
            ->getJson('/api/backups')
            ->assertForbidden();
    }
}
