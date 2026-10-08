<?php

namespace App\Models;

use Database\Factories\AuditEntryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditEntry extends Model
{
    /** @use HasFactory<AuditEntryFactory> */
    use HasFactory;
}
