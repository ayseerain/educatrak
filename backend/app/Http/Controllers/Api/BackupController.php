<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BackupRecord;
use Illuminate\Http\JsonResponse;

class BackupController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => BackupRecord::query()
                ->orderByDesc('completed_at')
                ->get(['id', 'result', 'size_bytes', 'error', 'completed_at'])
                ->map(fn (BackupRecord $backup): array => [
                    'id' => (string) $backup->id,
                    'result' => $backup->result,
                    'sizeBytes' => $backup->size_bytes,
                    'error' => $backup->error,
                    'completedAt' => $backup->completed_at,
                ]),
        ]);
    }
}
