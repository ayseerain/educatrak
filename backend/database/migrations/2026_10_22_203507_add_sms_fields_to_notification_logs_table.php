<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('notification_logs', function (Blueprint $table) {
            $table->string('guardian_mobile', 32)->nullable()->after('guardian_email');
            $table->string('channel')->default('email')->after('guardian_mobile')->index();
            $table->unsignedInteger('load_fee_cents')->nullable()->after('channel');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notification_logs', function (Blueprint $table) {
            $table->dropIndex(['channel']);
            $table->dropColumn(['guardian_mobile', 'channel', 'load_fee_cents']);
        });
    }
};
