<?php

namespace App\Models;

use Database\Factories\FeeItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeeItem extends Model
{
    /** @use HasFactory<FeeItemFactory> */
    use HasFactory;

    protected $fillable = [
        'fee_schedule_id',
        'name',
        'category',
        'amount_cents',
        'required',
        'sort_order',
        'active',
        'version',
        'previous_version_id',
    ];

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'required' => 'boolean',
            'active' => 'boolean',
            'version' => 'integer',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(FeeSchedule::class, 'fee_schedule_id');
    }

    public function previousVersion(): BelongsTo
    {
        return $this->belongsTo(self::class, 'previous_version_id');
    }
}
