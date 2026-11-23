<?php

namespace App\Models;

use Database\Factories\GuardianFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Guardian extends Model
{
    /** @use HasFactory<GuardianFactory> */
    use HasFactory;

    protected $fillable = [
        'full_name',
        'relationship',
        'email',
        'email_status',
        'mobile',
    ];

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class)->withPivot('is_primary', 'relationship')->withTimestamps();
    }
}
