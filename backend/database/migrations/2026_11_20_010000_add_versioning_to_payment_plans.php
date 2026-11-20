<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Approved W1b (2026-11-19): payment plans become versioned so a revision applies to new accounts only,
 * and a plan used by a billing account can no longer be deleted.
 *
 * Existing plans become version 1 through the column default; no existing row value is rewritten.
 *
 * SQLite note: altering a foreign key rebuilds the table, and Laravel's foreign_keys pragma toggle is ignored
 * inside the migration transaction. Rebuilding payment_plans would therefore fire the old ON DELETE SET NULL
 * on billing_accounts.payment_plan_id and erase plan links. On SQLite the plan columns are added natively
 * (no rebuild), FK checks are deferred to commit, and down() rebuilds payment_plans only while the billing
 * key is still RESTRICT. MySQL alters these keys natively.
 */
return new class extends Migration
{
    public function up(): void
    {
        $sqlite = DB::getDriverName() === 'sqlite';
        if ($sqlite) {
            DB::statement('PRAGMA defer_foreign_keys = ON');
            DB::statement('ALTER TABLE payment_plans ADD COLUMN version INTEGER NOT NULL DEFAULT 1');
            DB::statement('ALTER TABLE payment_plans ADD COLUMN previous_version_id INTEGER NULL REFERENCES payment_plans(id) ON DELETE RESTRICT');
        }

        Schema::table('payment_plans', function (Blueprint $table) use ($sqlite): void {
            if (! $sqlite) {
                $table->unsignedInteger('version')->default(1);
                $table->foreignId('previous_version_id')->nullable()->constrained('payment_plans')->restrictOnDelete();
            }
            $table->dropUnique(['name']);
            $table->unique(['name', 'version']);
        });

        Schema::table('billing_accounts', function (Blueprint $table): void {
            $table->dropForeign(['payment_plan_id']);
            $table->foreign('payment_plan_id')->references('id')->on('payment_plans')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        if (DB::table('payment_plans')->where('version', '>', 1)->exists()) {
            throw new RuntimeException('Cannot roll back payment-plan versioning while revised plan versions exist; their lineage and unique names would be lost.');
        }

        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA defer_foreign_keys = ON');
        }

        Schema::table('payment_plans', function (Blueprint $table): void {
            $table->dropUnique(['name', 'version']);
            $table->unique('name');
            $table->dropConstrainedForeignId('previous_version_id');
            $table->dropColumn('version');
        });

        Schema::table('billing_accounts', function (Blueprint $table): void {
            $table->dropForeign(['payment_plan_id']);
            $table->foreign('payment_plan_id')->references('id')->on('payment_plans')->nullOnDelete();
        });
    }
};
