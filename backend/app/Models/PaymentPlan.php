<?php

namespace App\Models;

use Database\Factories\PaymentPlanFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentPlan extends Model
{
    /** @use HasFactory<PaymentPlanFactory> */
    use HasFactory;
}
