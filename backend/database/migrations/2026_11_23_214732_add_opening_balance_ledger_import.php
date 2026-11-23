<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SRS v3.0 financial ledger import: a one-time, Accounting-confirmed opening-balance conversion.
 * Additive only; existing import_batches rows and financial tables are untouched.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('import_batches', function (Blueprint $table) {
            $table->char('file_sha256', 64)->nullable()->after('filename');
            $table->timestamp('submitted_at')->nullable()->after('rows');
            $table->foreignId('reviewed_by')->nullable()->after('submitted_at')->constrained('users')->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
            $table->string('review_note', 1000)->nullable()->after('reviewed_at');
        });

        Schema::create('opening_balance_conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_batch_id')->constrained()->restrictOnDelete();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('school_year_id')->constrained()->restrictOnDelete();
            $table->string('source_row_id', 64);
            $table->date('as_of_date');
            $table->unsignedBigInteger('total_due_cents');
            $table->unsignedBigInteger('total_paid_cents');
            $table->unsignedBigInteger('balance_cents');
            $table->string('source_reference', 255);
            $table->text('notes')->nullable();
            $table->foreignId('confirmed_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['student_id', 'school_year_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opening_balance_conversions');

        Schema::table('import_batches', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['file_sha256', 'submitted_at', 'reviewed_at', 'review_note']);
        });
    }
};
