<?php

namespace App\Models;

use Database\Factories\ExamPeriodFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamPeriod extends Model
{
    /** @use HasFactory<ExamPeriodFactory> */
    use HasFactory;

    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class);
    }
}
