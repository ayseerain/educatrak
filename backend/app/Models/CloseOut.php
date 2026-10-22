<?php

namespace App\Models;

use Database\Factories\CloseOutFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CloseOut extends Model
{
    /** @use HasFactory<CloseOutFactory> */
    use HasFactory;

    protected $fillable = [
        'business_date',
        'cashier_id',
        'system_totals',
        'counted_cash_cents',
        'variance_cents',
        'variance_reason',
        'submitted_at',
        'signed_off_by',
        'signed_off_at',
    ];

    protected function casts(): array
    {
        return [
            'business_date' => 'date',
            'system_totals' => 'array',
            'submitted_at' => 'datetime',
            'signed_off_at' => 'datetime',
        ];
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function signedOffBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'signed_off_by');
    }
}
