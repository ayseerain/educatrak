<?php

namespace App\Models;

use Database\Factories\BillingAccountFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BillingAccount extends Model
{
    /** @use HasFactory<BillingAccountFactory> */
    use HasFactory;

    protected $guarded = [];

    public function installments(): HasMany
    {
        return $this->hasMany(Installment::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
