<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fee_items', function (Blueprint $table): void {
            $table->boolean('active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('previous_version_id')->nullable()->constrained('fee_items')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('fee_items', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('previous_version_id');
            $table->dropColumn(['active', 'version']);
        });
    }
};
