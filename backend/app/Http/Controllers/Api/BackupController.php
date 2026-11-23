<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BackupRecord;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\DatabaseBackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BackupController extends Controller
{
    public function index(DatabaseBackupService $backups): JsonResponse
    {
        $unavailableReason = $backups->unavailableReason();

        return response()->json([
            'data' => BackupRecord::query()
                ->orderByDesc('completed_at')
                ->get(['id', 'trigger', 'result', 'size_bytes', 'checksum_sha256', 'error', 'started_at', 'completed_at'])
                ->map(fn (BackupRecord $backup): array => $this->backupData($backup)),
            'meta' => [
                'manualBackupAvailable' => $unavailableReason === null,
                'unavailableReason' => $unavailableReason,
                'dailyAt' => (string) config('educatrak.backup.daily_at'),
                'timezone' => 'Asia/Manila',
                'rotationEnabled' => (bool) config('educatrak.backup.rotation_enabled'),
                'destinationFreeBytes' => $backups->destinationFreeBytes(),
                'restoreTestRecorded' => false,
            ],
        ]);
    }

    /** Administrator-only manual backup; shares the scheduled job's lock and backup path. */
    public function store(Request $request, DatabaseBackupService $backups, AuditLogger $auditLogger): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $unavailableReason = $backups->unavailableReason();
        if ($unavailableReason !== null) {
            return response()->json(['message' => $unavailableReason], 503);
        }
        $auditLogger->record($request, 'backup.requested', null, null, ['trigger' => 'manual']);
        $record = $backups->run('manual', $user);
        if ($record === null) {
            return response()->json(['message' => 'A backup is already running. Try again after it finishes.'], 409);
        }

        return response()->json(['data' => $this->backupData($record)], $record->result === 'succeeded' ? 201 : 500);
    }

    /** @return array<string, mixed> */
    private function backupData(BackupRecord $backup): array
    {
        return [
            'id' => (string) $backup->id,
            'trigger' => $backup->trigger,
            'result' => $backup->result,
            'sizeBytes' => $backup->size_bytes,
            'checksumSha256' => $backup->checksum_sha256,
            'error' => $backup->error,
            'startedAt' => $backup->started_at,
            'completedAt' => $backup->completed_at,
        ];
    }
}
