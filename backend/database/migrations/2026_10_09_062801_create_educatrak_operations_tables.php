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
        Schema::create('clearance_rules', function (Blueprint $table) {
            $table->id();
            $table->string('kind');
            $table->foreignId('exam_period_id')->nullable()->constrained()->nullOnDelete();
            $table->json('rule');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('clearance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('school_year_id')->constrained()->restrictOnDelete();
            $table->foreignId('exam_period_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind');
            $table->boolean('cleared')->default(false)->index();
            $table->string('reason');
            $table->timestamp('calculated_at');
            $table->timestamps();
            $table->unique(['student_id', 'school_year_id', 'kind', 'exam_period_id'], 'clearance_records_student_year_kind_exam_unique');
        });

        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('guardian_email')->nullable();
            $table->string('kind');
            $table->string('status')->default('queued')->index();
            $table->string('failure_reason')->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
            $table->index(['student_id', 'created_at']);
        });

        Schema::create('close_outs', function (Blueprint $table) {
            $table->id();
            $table->date('business_date');
            $table->foreignId('cashier_id')->constrained('users')->restrictOnDelete();
            $table->json('system_totals');
            $table->unsignedBigInteger('counted_cash_cents');
            $table->bigInteger('variance_cents');
            $table->string('variance_reason')->nullable();
            $table->timestamp('submitted_at');
            $table->foreignId('signed_off_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('signed_off_at')->nullable();
            $table->timestamps();
            $table->unique(['business_date', 'cashier_id']);
        });

        Schema::create('audit_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('entity_type');
            $table->string('entity_id');
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 1024)->nullable();
            $table->timestamp('occurred_at')->index();
            $table->timestamps();
            $table->index(['entity_type', 'entity_id']);
        });

        Schema::create('backup_records', function (Blueprint $table) {
            $table->id();
            $table->string('result')->index();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('error')->nullable();
            $table->timestamp('completed_at');
            $table->timestamps();
        });

        Schema::create('import_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('filename');
            $table->string('status')->default('previewed')->index();
            $table->json('summary');
            $table->json('rows');
            $table->timestamp('committed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('import_batches');
        Schema::dropIfExists('backup_records');
        Schema::dropIfExists('audit_entries');
        Schema::dropIfExists('close_outs');
        Schema::dropIfExists('notification_logs');
        Schema::dropIfExists('clearance_records');
        Schema::dropIfExists('clearance_rules');
    }
};
