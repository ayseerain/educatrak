<?php

use App\Support\CanonicalGradeLevels;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Backfill the fixed academic catalogue for databases created before
     * Kindergarten through Grade 12 became the required default.
     */
    public function up(): void
    {
        CanonicalGradeLevels::ensure();
    }

    /**
     * Grade levels may have acquired sections, students, or financial records.
     * A rollback must not remove those records.
     */
    public function down(): void
    {
        // Intentionally non-destructive.
    }
};
