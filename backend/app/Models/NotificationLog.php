<?php

namespace App\Models;

use Database\Factories\NotificationLogFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationLog extends Model
{
    /** @use HasFactory<NotificationLogFactory> */
    use HasFactory;

    protected $fillable = [
        'student_id',
        'payment_id',
        'guardian_email',
        'kind',
        'status',
        'failure_reason',
        'attempts',
        'sent_at',
    ];
}
