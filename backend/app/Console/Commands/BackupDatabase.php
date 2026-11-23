<?php

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Command;

class BackupDatabase extends Command
{
    protected $signature = 'educatrak:backup-database';

    protected $description = 'Create a local MySQL backup (scheduled daily; shares a lock with the Administrator manual backup)';

    public function handle(DatabaseBackupService $backups): int
    {
        $record = $backups->run('scheduled');
        if ($record === null) {
            $this->warn('Another backup is already running.');

            return self::FAILURE;
        }
        if ($record->result !== 'succeeded') {
            $this->error("Backup failed: {$record->error}");

            return self::FAILURE;
        }
        $this->info("Backup {$record->file_name} completed ({$record->size_bytes} bytes).");

        return self::SUCCESS;
    }
}
