<?php

namespace App\Models;

use Database\Factories\BillingAccountFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BillingAccount extends Model
{
    /** @use HasFactory<BillingAccountFactory> */
    use HasFactory;
}
