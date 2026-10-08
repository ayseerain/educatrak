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
        Schema::create('billing_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('school_year_id')->constrained()->restrictOnDelete();
            $table->foreignId('fee_schedule_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('payment_plan_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('current')->index();
            $table->unsignedBigInteger('total_due_cents')->default(0);
            $table->unsignedBigInteger('total_paid_cents')->default(0);
            $table->unsignedBigInteger('balance_cents')->default(0)->index();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['student_id', 'school_year_id']);
        });

        Schema::create('billing_account_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('billing_account_id')->constrained()->restrictOnDelete();
            $table->foreignId('fee_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('category');
            $table->unsignedBigInteger('amount_cents');
            $table->timestamps();
        });

        Schema::create('adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('billing_account_id')->constrained()->restrictOnDelete();
            $table->string('type');
            $table->bigInteger('amount_cents');
            $table->string('reason');
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('effective_at');
            $table->timestamps();
            $table->index(['billing_account_id', 'effective_at']);
        });

        Schema::create('installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('billing_account_id')->constrained()->restrictOnDelete();
            $table->string('label');
            $table->unsignedSmallInteger('sequence');
            $table->date('due_date');
            $table->unsignedBigInteger('amount_cents');
            $table->unsignedBigInteger('paid_cents')->default(0);
            $table->string('status')->default('current')->index();
            $table->timestamps();
            $table->unique(['billing_account_id', 'sequence']);
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('billing_account_id')->constrained()->restrictOnDelete();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('amount_cents');
            $table->string('method')->default('cash');
            $table->date('paid_on');
            $table->string('backdate_reason')->nullable();
            $table->string('duplicate_override_reason')->nullable();
            $table->string('notes')->nullable();
            $table->string('status')->default('valid')->index();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('recorded_at');
            $table->unsignedInteger('reprint_count')->default(0);
            $table->timestamps();
            $table->index(['student_id', 'amount_cents', 'recorded_at']);
            $table->index(['billing_account_id', 'status']);
        });

        Schema::create('receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->unique()->constrained()->restrictOnDelete();
            $table->unsignedInteger('sequence')->unique();
            $table->string('receipt_no')->unique();
            $table->unsignedSmallInteger('receipt_year');
            $table->timestamp('issued_at');
            $table->timestamps();
        });

        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained()->restrictOnDelete();
            $table->foreignId('installment_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('amount_cents');
            $table->timestamps();
            $table->unique(['payment_id', 'installment_id']);
        });

        Schema::create('void_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->unique()->constrained()->restrictOnDelete();
            $table->string('reason');
            $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('requested_at');
            $table->string('status')->default('pending')->index();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->string('decision_note')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('void_requests');
        Schema::dropIfExists('payment_allocations');
        Schema::dropIfExists('receipts');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('installments');
        Schema::dropIfExists('adjustments');
        Schema::dropIfExists('billing_account_items');
        Schema::dropIfExists('billing_accounts');
    }
};
