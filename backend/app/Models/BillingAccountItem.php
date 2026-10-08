<?php

namespace App\Models;

use Database\Factories\BillingAccountItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BillingAccountItem extends Model
{
    /** @use HasFactory<BillingAccountItemFactory> */
    use HasFactory;
}
