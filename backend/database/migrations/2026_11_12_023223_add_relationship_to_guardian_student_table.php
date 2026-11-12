<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('guardian_student', function (Blueprint $table): void {
            $table->string('relationship', 100)->nullable()->after('is_primary');
        });

        DB::table('guardian_student')
            ->join('guardians', 'guardians.id', '=', 'guardian_student.guardian_id')
            ->orderBy('guardian_student.guardian_id')
            ->orderBy('guardian_student.student_id')
            ->select(['guardian_student.guardian_id', 'guardian_student.student_id', 'guardians.relationship'])
            ->cursor()
            ->each(function (object $link): void {
                DB::table('guardian_student')
                    ->where('guardian_id', $link->guardian_id)
                    ->where('student_id', $link->student_id)
                    ->update(['relationship' => $link->relationship]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Link-specific values may have diverged from guardian-wide history.
        // Retain the column rather than destructively remove persisted data.
    }
};
