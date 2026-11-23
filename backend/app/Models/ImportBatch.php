<?php

namespace App\Models;

use Database\Factories\ImportBatchFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Ledger import batch. Status flow: previewed (Cashier draft) -> submitted -> confirmed | rejected;
 * a draft may be cancelled. Rows and file hash are frozen at upload; changes need a new batch.
 */
class ImportBatch extends Model
{
    /** @use HasFactory<ImportBatchFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'summary' => 'array',
            'rows' => 'array',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'committed_at' => 'datetime',
        ];
    }
}
