<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\DatabaseBackupService;
use App\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Tests\TestCase;

class BackupReadTest extends TestCase
{
    use RefreshDatabase;

    private string $destination;

    protected function setUp(): void
    {
        parent::setUp();
        $this->destination = sys_get_temp_dir().DIRECTORY_SEPARATOR.'educatrak-backup-test-'.uniqid();
        File::ensureDirectoryExists($this->destination);
        $fakeTool = sys_get_temp_dir().DIRECTORY_SEPARATOR.'educatrak-fake-mysqldump.exe';
        File::put($fakeTool, '');
        config([
            'educatrak.backup.mysqldump_path' => $fakeTool,
            'educatrak.backup.destination' => $this->destination,
            'educatrak.backup.connection' => 'mysql',
            'database.connections.mysql.database' => 'educatrak_fictional',
            'database.connections.mysql.password' => 'fictional-secret',
        ]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->destination);
        parent::tearDown();
    }

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
        $this->actingAs(User::factory()->create(['role' => UserRole::SuperAdmin]))->getJson('/api/backups')->assertOk();
    }

    public function test_non_administrators_cannot_view_backup_history(): void
    {
        $this->actingAs(User::factory()->create(['role' => UserRole::Accounting]))
            ->getJson('/api/backups')
            ->assertForbidden();
    }

    public function test_administrator_manual_backup_writes_checked_file_without_exposing_credentials(): void
    {
        $this->fakeDump("-- MySQL dump\nCREATE TABLE fictional (id int);\n-- Dump completed on 2026-11-23\n");
        $administrator = User::factory()->create(['role' => UserRole::Admin]);

        $response = $this->actingAs($administrator)->postJson('/api/backups')
            ->assertCreated()
            ->assertJsonPath('data.trigger', 'manual')
            ->assertJsonPath('data.result', 'succeeded');

        $files = File::files($this->destination);
        $this->assertCount(1, $files);
        $this->assertMatchesRegularExpression('/^educatrak-\d{8}-\d{6}-[a-z0-9]{8}\.sql$/', $files[0]->getFilename());
        $this->assertSame(hash_file('sha256', $files[0]->getPathname()), $response->json('data.checksumSha256'));
        $this->assertStringNotContainsString($this->destination, $response->getContent());
        Process::assertRan(fn (PendingProcess $process): bool => ! str_contains(implode(' ', (array) $process->command), 'fictional-secret')
            && in_array('--single-transaction', (array) $process->command, true));
        $this->assertDatabaseHas('backup_records', ['trigger' => 'manual', 'requested_by' => $administrator->id, 'result' => 'succeeded']);
        $this->assertDatabaseHas('audit_entries', ['action' => 'backup.requested', 'user_id' => $administrator->id]);
        $this->assertDatabaseHas('audit_entries', ['action' => 'backup.succeeded', 'user_id' => $administrator->id]);
    }

    public function test_unconfigured_executor_is_reported_and_manual_run_is_refused_without_running(): void
    {
        Process::fake();
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $this->actingAs($administrator)->getJson('/api/backups')
            ->assertOk()
            ->assertJsonPath('meta.manualBackupAvailable', true)
            ->assertJsonPath('meta.rotationEnabled', false)
            ->assertJsonPath('meta.dailyAt', '21:00');

        config(['educatrak.backup.mysqldump_path' => 'mysqldump']);
        $this->actingAs($administrator)->getJson('/api/backups')
            ->assertJsonPath('meta.manualBackupAvailable', false)
            ->assertJsonPath('meta.unavailableReason', 'The backup tool path is not configured as a full path to an existing mysqldump executable.');
        $this->actingAs($administrator)->postJson('/api/backups')->assertServiceUnavailable();
        Process::assertNothingRan();
        $this->assertDatabaseCount('backup_records', 0);
    }

    public function test_only_administrator_can_run_manual_backup(): void
    {
        Process::fake();
        foreach ([UserRole::SuperAdmin, UserRole::Accounting, UserRole::Cashier, UserRole::Registrar, UserRole::Auditor] as $role) {
            $this->actingAs(User::factory()->create(['role' => $role]))->postJson('/api/backups')->assertForbidden();
        }
        Process::assertNothingRan();
    }

    public function test_incomplete_dump_and_missing_destination_are_recorded_as_sanitized_failures(): void
    {
        $this->fakeDump("-- MySQL dump\nCREATE TABLE fictional (id int);\n");
        $this->artisan('educatrak:backup-database')->assertFailed();
        $this->assertDatabaseHas('backup_records', ['trigger' => 'scheduled', 'result' => 'failed', 'error' => 'The backup file was empty or incomplete.', 'requested_by' => null]);
        $this->assertSame([], File::files($this->destination));

        config(['educatrak.backup.destination' => null]);
        $this->artisan('educatrak:backup-database')->assertFailed();
        $this->assertDatabaseHas('backup_records', ['result' => 'failed', 'error' => 'The backup destination is not configured, does not exist, or is not writable.']);

        config(['educatrak.backup.destination' => base_path('storage')]);
        $this->artisan('educatrak:backup-database')->assertFailed();
        $this->assertDatabaseHas('backup_records', ['result' => 'failed', 'error' => 'The backup destination must be outside the application folder.']);
    }

    public function test_overlapping_backup_is_rejected_by_shared_lock(): void
    {
        Process::fake();
        $lock = Cache::lock(DatabaseBackupService::LockName, 60);
        $lock->get();

        $this->actingAs(User::factory()->create(['role' => UserRole::Admin]))->postJson('/api/backups')->assertConflict();
        $this->artisan('educatrak:backup-database')->assertFailed();
        Process::assertNothingRan();
        $lock->release();
    }

    public function test_rotation_keeps_thirty_daily_and_twelve_monthly_files_when_enabled(): void
    {
        config(['educatrak.backup.rotation_enabled' => true]);
        $day = now('Asia/Manila')->startOfDay()->subDays(1);
        $names = [];
        for ($i = 0; $i < 400; $i++) {
            $names[] = 'educatrak-'.$day->copy()->subDays($i)->format('Ymd').'-210000-aaaaaaaa.sql';
            File::put($this->destination.DIRECTORY_SEPARATOR.end($names), 'old');
        }
        File::put($this->destination.DIRECTORY_SEPARATOR.'unrelated.sql', 'keep me');
        $this->fakeDump("-- Dump completed\n");

        $this->artisan('educatrak:backup-database')->assertSuccessful();

        $remaining = collect(File::files($this->destination))->map->getFilename();
        $this->assertContains('unrelated.sql', $remaining);
        $this->assertContains($names[28], $remaining);
        $this->assertNotContains($names[29], $remaining);
        $dated = $remaining->filter(fn (string $name): bool => str_starts_with($name, 'educatrak-'));
        $this->assertLessThanOrEqual(30 + 12, $dated->count());
        $this->assertSame(12, $dated->map(fn (string $name): string => substr($name, 10, 6))->unique()->count());
    }

    private function fakeDump(string $contents): void
    {
        Process::fake(function (PendingProcess $process) use ($contents) {
            foreach ((array) $process->command as $argument) {
                if (str_starts_with($argument, '--result-file=')) {
                    file_put_contents(substr($argument, strlen('--result-file=')), $contents);
                }
            }

            return Process::result();
        });
    }
}
