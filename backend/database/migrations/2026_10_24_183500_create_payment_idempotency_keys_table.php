<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_idempotency_keys', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('key', 100);
            $table->char('request_hash', 64);
            $table->json('response_body')->nullable();
            $table->unsignedSmallInteger('response_status')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'key']);
        });

        Schema::table('payments', function (Blueprint $table): void {
            $table->unsignedBigInteger('balance_after_cents')->nullable()->after('amount_cents');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->dropColumn('balance_after_cents');
        });
        Schema::dropIfExists('payment_idempotency_keys');
    }
};
