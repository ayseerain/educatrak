<?php

namespace App\Models;

use Database\Factories\AuditEntryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditEntry extends Model
{
    /** @use HasFactory<AuditEntryFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'before' => 'array',
            'after' => 'array',
            'occurred_at' => 'datetime',
        ];
    }
}
