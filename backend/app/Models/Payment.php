<?php

namespace App\Models;

use Database\Factories\PaymentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Payment extends Model
{
    /** @use HasFactory<PaymentFactory> */
    use HasFactory;

    protected $fillable = [
        'billing_account_id',
        'student_id',
        'amount_cents',
        'balance_after_cents',
        'method',
        'paid_on',
        'backdate_reason',
        'duplicate_override_reason',
        'notes',
        'status',
        'recorded_by',
        'recorded_at',
        'reprint_count',
    ];

    protected function casts(): array
    {
        return [
            'paid_on' => 'date',
            'recorded_at' => 'datetime',
        ];
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }

    public function billingAccount(): BelongsTo
    {
        return $this->belongsTo(BillingAccount::class);
    }

    public function receipt(): HasOne
    {
        return $this->hasOne(Receipt::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function voidRequest(): HasOne
    {
        return $this->hasOne(VoidRequest::class);
    }
}
