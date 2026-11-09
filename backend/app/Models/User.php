<?php

namespace App\Models;

use App\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['username', 'full_name', 'email', 'role', 'active', 'is_protected', 'must_change_password', 'password'];

    protected $hidden = ['password', 'remember_token'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => UserRole::class,
            'active' => 'boolean',
            'is_protected' => 'boolean',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
            'archived_at' => 'datetime',
            'anonymize_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function archivedBy(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(self::class, 'archived_by');
    }
}
