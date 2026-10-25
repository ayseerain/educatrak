<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentIdempotencyKey extends Model
{
    protected $fillable = [
        'user_id',
        'key',
        'request_hash',
        'response_body',
        'response_status',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'response_body' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
