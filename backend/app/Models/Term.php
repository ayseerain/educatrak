<?php

namespace App\Models;

use Database\Factories\TermFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Term extends Model
{
    /** @use HasFactory<TermFactory> */
    use HasFactory;
}
