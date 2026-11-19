<?php

namespace App\Models;

use Database\Factories\GradeLevelFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GradeLevel extends Model
{
    /** @use HasFactory<GradeLevelFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    public function sections(): HasMany
    {
        return $this->hasMany(Section::class)->orderBy('name');
    }
}
