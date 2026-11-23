<?php

namespace App\Services;

use App\Models\AuditEntry;
use App\Models\BackupRecord;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * One local MySQL backup path shared by the daily schedule and the Administrator's manual request
 * (SRS v3.0, owner decision 2026-11-23). Writes a temporary file, checks it, then renames it.
 * Never exposes credentials, absolute paths, or raw tool output in history or audit records.
 */
class DatabaseBackupService
{
    public const LockName = 'educatrak-database-backup';

    /**
     * Configuration check for the manual "Run backup now" control. Null means the executor is
     * configured; it does not prove a dump has succeeded (see backup history for that).
     */
    public function unavailableReason(): ?string
    {
        try {
            $this->destination();
            $this->connection();
        } catch (RuntimeException $exception) {
            return $exception->getMessage();
        }
        if (! is_file((string) config('educatrak.backup.mysqldump_path'))) {
            return 'The backup tool path is not configured as a full path to an existing mysqldump executable.';
        }

        return null;
    }

    /** Free space at the destination, for capacity monitoring; null when unknown. */
    public function destinationFreeBytes(): ?int
    {
        try {
            $free = disk_free_space($this->destination());
        } catch (RuntimeException) {
            return null;
        }

        return $free === false ? null : (int) $free;
    }

    /** Returns null when another backup holds the shared lock. */
    public function run(string $trigger, ?User $requestedBy = null): ?BackupRecord
    {
        $timeout = (int) config('educatrak.backup.timeout_seconds');
        $lock = Cache::lock(self::LockName, $timeout + 60);
        if (! $lock->get()) {
            return null;
        }

        try {
            return $this->backUp($trigger, $requestedBy, $timeout);
        } finally {
            $lock->release();
        }
    }

    private function backUp(string $trigger, ?User $requestedBy, int $timeout): BackupRecord
    {
        $startedAt = now();
        $temporaryPath = null;
        $credentialsPath = null;

        try {
            $destination = $this->destination();
            $connection = $this->connection();
            $fileName = 'educatrak-'.now('Asia/Manila')->format('Ymd-His').'-'.Str::lower(Str::random(8)).'.sql';
            $finalPath = $destination.DIRECTORY_SEPARATOR.$fileName;
            $temporaryPath = $finalPath.'.partial';
            $credentialsPath = $this->writeCredentialsFile($connection);

            $result = Process::timeout($timeout)->run([
                (string) config('educatrak.backup.mysqldump_path'),
                '--defaults-extra-file='.$credentialsPath,
                '--single-transaction',
                '--routines',
                '--triggers',
                '--hex-blob',
                '--no-tablespaces',
                '--result-file='.$temporaryPath,
                (string) $connection['database'],
            ]);
            if ($result->failed()) {
                throw new RuntimeException('The backup tool exited with code '.($result->exitCode() ?? 'unknown').'.');
            }
            $size = is_file($temporaryPath) ? (int) filesize($temporaryPath) : 0;
            if ($size === 0 || ! $this->dumpCompleted($temporaryPath)) {
                throw new RuntimeException('The backup file was empty or incomplete.');
            }
            $checksum = hash_file('sha256', $temporaryPath);
            if (! rename($temporaryPath, $finalPath)) {
                throw new RuntimeException('The backup file could not be finalized.');
            }
            $temporaryPath = null;
            $this->rotate($destination);

            return $this->record($trigger, $requestedBy, $startedAt, 'succeeded', null, $size, $fileName, $checksum);
        } catch (Throwable $exception) {
            $message = $exception instanceof RuntimeException ? $exception->getMessage() : 'The backup could not be completed.';

            return $this->record($trigger, $requestedBy, $startedAt, 'failed', $message);
        } finally {
            foreach ([$temporaryPath, $credentialsPath] as $path) {
                if ($path !== null && is_file($path)) {
                    @unlink($path);
                }
            }
        }
    }

    private function destination(): string
    {
        $configured = (string) config('educatrak.backup.destination');
        $destination = $configured === '' ? false : realpath($configured);
        if ($destination === false || ! is_dir($destination) || ! is_writable($destination)) {
            throw new RuntimeException('The backup destination is not configured, does not exist, or is not writable.');
        }
        $applicationRoot = realpath(base_path());
        if ($applicationRoot !== false && str_starts_with(strtolower($destination.DIRECTORY_SEPARATOR), strtolower($applicationRoot.DIRECTORY_SEPARATOR))) {
            throw new RuntimeException('The backup destination must be outside the application folder.');
        }

        return $destination;
    }

    /** @return array<string, mixed> */
    private function connection(): array
    {
        $connection = config('database.connections.'.config('educatrak.backup.connection'));
        if (! is_array($connection) || ! in_array($connection['driver'] ?? null, ['mysql', 'mariadb'], true) || blank($connection['database'] ?? null)) {
            throw new RuntimeException('Backups require a configured MySQL database connection.');
        }

        return $connection;
    }

    /**
     * Credentials go in a short-lived option file instead of process arguments, so they never
     * appear in process listings.
     *
     * @param  array<string, mixed>  $connection
     */
    private function writeCredentialsFile(array $connection): string
    {
        $path = tempnam(sys_get_temp_dir(), 'edtk');
        if ($path === false) {
            throw new RuntimeException('A temporary credentials file could not be created.');
        }
        @chmod($path, 0600);
        $quote = fn (mixed $value): string => '"'.addcslashes((string) $value, '"\\').'"';
        file_put_contents($path, implode("\n", [
            '[client]',
            'user='.$quote($connection['username'] ?? ''),
            'password='.$quote($connection['password'] ?? ''),
            'host='.$quote($connection['host'] ?? '127.0.0.1'),
            'port='.$quote($connection['port'] ?? 3306),
            '',
        ]));

        return $path;
    }

    private function dumpCompleted(string $path): bool
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            return false;
        }
        fseek($handle, -512, SEEK_END);
        $tail = (string) stream_get_contents($handle);
        fclose($handle);

        return str_contains($tail, '-- Dump completed');
    }

    /**
     * Recovery-copy rotation: keep the 30 newest daily files plus the newest file of each of the
     * 12 most recent months. Only files this service created are considered. Disabled unless
     * BACKUP_ROTATION_ENABLED is true.
     */
    private function rotate(string $destination): void
    {
        if (! config('educatrak.backup.rotation_enabled')) {
            return;
        }
        $files = collect(scandir($destination) ?: [])
            ->filter(fn (string $file): bool => preg_match('/^educatrak-\d{8}-\d{6}-[a-z0-9]{8}\.sql$/', $file) === 1)
            ->sortDesc()
            ->values();
        $keep = $files->take((int) config('educatrak.backup.keep_daily'))
            ->merge($files->groupBy(fn (string $file): string => substr($file, 10, 6))->map->first()->take((int) config('educatrak.backup.keep_monthly')))
            ->unique();
        $files->diff($keep)->each(fn (string $file) => @unlink($destination.DIRECTORY_SEPARATOR.$file));
    }

    private function record(string $trigger, ?User $requestedBy, mixed $startedAt, string $result, ?string $error, ?int $size = null, ?string $fileName = null, ?string $checksum = null): BackupRecord
    {
        $record = BackupRecord::query()->forceCreate([
            'trigger' => $trigger,
            'requested_by' => $requestedBy?->id,
            'started_at' => $startedAt,
            'result' => $result,
            'size_bytes' => $size,
            'file_name' => $fileName,
            'checksum_sha256' => $checksum,
            'error' => $error === null ? null : Str::limit($error, 250),
            'completed_at' => now(),
        ]);
        AuditEntry::query()->forceCreate([
            'user_id' => $requestedBy?->id,
            'action' => "backup.{$result}",
            'entity_type' => $record->getMorphClass(),
            'entity_id' => (string) $record->id,
            'after' => ['trigger' => $trigger, 'size_bytes' => $size, 'checksum_sha256' => $checksum, 'error' => $record->error],
            'occurred_at' => now(),
        ]);

        return $record;
    }
}
