<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Additive backup attempt metadata (SRS v3.0). Existing history rows keep null values; nothing is backfilled.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('backup_records', function (Blueprint $table) {
            $table->string('trigger', 20)->nullable()->after('id');
            $table->foreignId('requested_by')->nullable()->after('trigger')->constrained('users')->nullOnDelete();
            $table->timestamp('started_at')->nullable()->after('requested_by');
            $table->string('file_name')->nullable()->after('size_bytes');
            $table->char('checksum_sha256', 64)->nullable()->after('file_name');
        });
    }

    public function down(): void
    {
        Schema::table('backup_records', function (Blueprint $table) {
            $table->dropConstrainedForeignId('requested_by');
            $table->dropColumn(['trigger', 'started_at', 'file_name', 'checksum_sha256']);
        });
    }
};
