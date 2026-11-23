<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One Accounting-confirmed opening balance per student and school year, created only by a
 * confirmed ledger import. It is not a Payment or Adjustment and issues no receipt.
 */
class OpeningBalanceConversion extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'as_of_date' => 'date',
            'total_due_cents' => 'integer',
            'total_paid_cents' => 'integer',
            'balance_cents' => 'integer',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
