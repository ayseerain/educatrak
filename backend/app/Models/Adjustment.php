<?php

namespace App\Models;

use Database\Factories\AdjustmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Adjustment extends Model
{
    /** @use HasFactory<AdjustmentFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'effective_at' => 'datetime',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
