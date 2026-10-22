<?php

namespace App\Models;

use Database\Factories\BillingAccountFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillingAccount extends Model
{
    /** @use HasFactory<BillingAccountFactory> */
    use HasFactory;

    protected $fillable = [
        'student_id',
        'school_year_id',
        'fee_schedule_id',
        'payment_plan_id',
        'status',
        'total_due_cents',
        'total_paid_cents',
        'balance_cents',
        'created_by',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function installments(): HasMany
    {
        return $this->hasMany(Installment::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }
}
