<?php

namespace App\Models;

use Database\Factories\BillingAccountItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillingAccountItem extends Model
{
    /** @use HasFactory<BillingAccountItemFactory> */
    use HasFactory;

    protected $fillable = [
        'fee_item_id',
        'name',
        'category',
        'amount_cents',
    ];

    public function feeItem(): BelongsTo
    {
        return $this->belongsTo(FeeItem::class);
    }
}
