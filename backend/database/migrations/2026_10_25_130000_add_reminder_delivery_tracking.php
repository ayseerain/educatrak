<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notification_logs', function (Blueprint $table): void {
            $table->foreignId('installment_id')->nullable()->after('payment_id')->constrained()->nullOnDelete();
            $table->string('delivery_key', 64)->nullable()->unique()->after('attempts');
            $table->string('provider_message_sid')->nullable()->index()->after('delivery_key');
        });
    }

    public function down(): void
    {
        Schema::table('notification_logs', function (Blueprint $table): void {
            $table->dropUnique(['delivery_key']);
            $table->dropIndex(['provider_message_sid']);
            $table->dropColumn('provider_message_sid');
            $table->dropConstrainedForeignId('installment_id');
            $table->dropColumn('delivery_key');
        });
    }
};
