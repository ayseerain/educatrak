<?php

namespace Tests\Feature;

use App\Models\SchoolYear;
use App\Models\User;
use App\Services\AuditLogger;
use App\Support\CanonicalGradeLevels;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

class SchoolStructureSettingsTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_administrator_creates_school_years_and_the_first_becomes_current(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);

        $first = $this->actingAs($admin)->postJson('/api/settings/school-years', [
            'label' => 'SY 2026-2027 (sample)',
            'starts_on' => '2026-06-01',
            'ends_on' => '2027-05-31',
        ]);
        $first->assertCreated()
            ->assertJsonPath('data.label', 'SY 2026-2027 (sample)')
            ->assertJsonPath('data.current', true)
            ->assertJsonPath('data.startsOn', '2026-06-01')
            ->assertJsonPath('data.datesLocked', false);

        $this->actingAs($admin)->postJson('/api/settings/school-years', [
            'label' => 'SY 2027-2028 (sample)',
            'starts_on' => '2027-06-01',
            'ends_on' => '2028-05-31',
        ])->assertCreated()->assertJsonPath('data.current', false);

        $this->assertSame(1, SchoolYear::query()->where('is_current', true)->count());
        $this->assertDatabaseHas('audit_entries', ['action' => 'school_year.created', 'user_id' => $admin->id]);
    }

    public function test_school_year_validation_rejects_bad_order_overlap_and_duplicate_labels(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $this->createSchoolYear('SY 2026-2027 (sample)', '2026-06-01', '2027-05-31', true);

        $this->actingAs($admin)->postJson('/api/settings/school-years', [
            'label' => 'SY backwards (sample)',
            'starts_on' => '2028-06-01',
            'ends_on' => '2028-05-31',
        ])->assertUnprocessable()->assertJsonValidationErrors('ends_on')->assertJsonStructure(['message', 'errors']);

        $this->actingAs($admin)->postJson('/api/settings/school-years', [
            'label' => 'SY overlap (sample)',
            'starts_on' => '2027-05-01',
            'ends_on' => '2028-04-30',
        ])->assertUnprocessable()->assertJsonValidationErrors('starts_on');

        $this->actingAs($admin)->postJson('/api/settings/school-years', [
            'label' => 'sy 2026-2027 (SAMPLE)',
            'starts_on' => '2030-06-01',
            'ends_on' => '2031-05-31',
        ])->assertUnprocessable()->assertJsonValidationErrors('label');

        $this->assertDatabaseCount('school_years', 1);
    }

    public function test_make_current_requires_a_reason_and_keeps_exactly_one_current_year(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $old = $this->createSchoolYear('SY 2026-2027 (sample)', '2026-06-01', '2027-05-31', true);
        $next = $this->createSchoolYear('SY 2027-2028 (sample)', '2027-06-01', '2028-05-31', false);

        $this->actingAs($admin)->postJson("/api/settings/school-years/{$next}/make-current", ['reason' => 'short'])
            ->assertUnprocessable()->assertJsonValidationErrors('reason');
        $this->actingAs($admin)->postJson("/api/settings/school-years/{$next}/make-current", [])
            ->assertUnprocessable()->assertJsonValidationErrors('reason');

        $this->actingAs($admin)->postJson("/api/settings/school-years/{$next}/make-current", [
            'reason' => 'Fictional mid-year switch for testing.',
        ])->assertOk()->assertJsonPath('data.current', true);

        $this->assertSame([$next], SchoolYear::query()->where('is_current', true)->pluck('id')->all());
        $entry = DB::table('audit_entries')->where('action', 'school_year.current_changed')->first();
        $this->assertSame($old, json_decode($entry->before, true)['current_school_year_id']);
        $this->assertSame($next, json_decode($entry->after, true)['current_school_year_id']);
        $this->assertSame('Fictional mid-year switch for testing.', json_decode($entry->after, true)['reason']);

        $this->actingAs($admin)->postJson("/api/settings/school-years/{$next}/make-current", [
            'reason' => 'Fictional repeated switch for testing.',
        ])->assertConflict()->assertJsonStructure(['message']);
    }

    public function test_make_current_rolls_back_when_audit_recording_fails(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $old = $this->createSchoolYear('SY 2026-2027 (sample)', '2026-06-01', '2027-05-31', true);
        $next = $this->createSchoolYear('SY 2027-2028 (sample)', '2027-06-01', '2028-05-31', false);
        $this->failAuditRecording();

        $this->actingAs($admin)->postJson("/api/settings/school-years/{$next}/make-current", [
            'reason' => 'Fictional switch that must roll back.',
        ])->assertInternalServerError();

        $this->assertSame([$old], SchoolYear::query()->where('is_current', true)->pluck('id')->all());
    }

    public function test_school_year_creation_rolls_back_when_audit_recording_fails(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $this->failAuditRecording();

        $this->actingAs($admin)->postJson('/api/settings/school-years', [
            'label' => 'SY 2026-2027 (sample)',
            'starts_on' => '2026-06-01',
            'ends_on' => '2027-05-31',
        ])->assertInternalServerError();

        $this->assertDatabaseCount('school_years', 0);
    }

    public function test_dates_lock_once_a_billing_account_exists_but_labels_stay_editable(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $yearId = $this->createSchoolYear('SY 2026-2027 (sample)', '2026-06-01', '2027-05-31', true);
        $termId = DB::table('terms')->insertGetId(['school_year_id' => $yearId, 'name' => 'First term (sample)', 'sequence' => 1, 'starts_on' => '2026-06-01', 'ends_on' => '2026-10-31', 'created_at' => now(), 'updated_at' => now()]);

        $this->actingAs($admin)->patchJson("/api/settings/school-years/{$yearId}", ['ends_on' => '2027-04-30'])
            ->assertOk()->assertJsonPath('data.endsOn', '2027-04-30');

        $this->createBillingAccount($yearId);

        $this->actingAs($admin)->patchJson("/api/settings/school-years/{$yearId}", ['ends_on' => '2027-05-31'])
            ->assertUnprocessable()->assertJsonValidationErrors('ends_on');
        $this->actingAs($admin)->patchJson("/api/settings/terms/{$termId}", ['starts_on' => '2026-06-15'])
            ->assertUnprocessable()->assertJsonValidationErrors('starts_on');
        $this->actingAs($admin)->postJson("/api/settings/school-years/{$yearId}/terms", ['name' => 'Second term (sample)', 'sequence' => 2, 'starts_on' => '2026-11-01'])
            ->assertUnprocessable()->assertJsonValidationErrors('starts_on');

        $this->actingAs($admin)->patchJson("/api/settings/school-years/{$yearId}", ['label' => 'SY 2026-2027 corrected (sample)'])
            ->assertOk()->assertJsonPath('data.label', 'SY 2026-2027 corrected (sample)')->assertJsonPath('data.datesLocked', true);
        $this->actingAs($admin)->patchJson("/api/settings/terms/{$termId}", ['name' => 'Term one (sample)'])
            ->assertOk()->assertJsonPath('data.name', 'Term one (sample)');

        $this->assertDatabaseHas('school_years', ['id' => $yearId, 'ends_on' => '2027-04-30']);
        $this->assertSame(2, DB::table('audit_entries')->where('action', 'school_year.updated')->count());
    }

    public function test_terms_and_exam_periods_can_be_added_and_edited(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $yearId = $this->createSchoolYear('SY 2026-2027 (sample)', '2026-06-01', '2027-05-31', true);

        $term = $this->actingAs($admin)->postJson("/api/settings/school-years/{$yearId}/terms", [
            'name' => 'First term (sample)',
            'sequence' => 1,
            'starts_on' => '2026-06-01',
            'ends_on' => '2026-10-31',
        ])->assertCreated()->assertJsonPath('data.sequence', 1);
        $termId = $term->json('data.id');

        $this->actingAs($admin)->postJson("/api/settings/school-years/{$yearId}/terms", ['name' => 'Duplicate (sample)', 'sequence' => 1])
            ->assertUnprocessable()->assertJsonValidationErrors('sequence');

        $exam = $this->actingAs($admin)->postJson("/api/settings/terms/{$termId}/exam-periods", [
            'name' => 'Midterms (sample)',
            'starts_on' => '2026-08-10',
        ])->assertCreated()->assertJsonPath('data.endsOn', null);
        $this->actingAs($admin)->postJson("/api/settings/terms/{$termId}/exam-periods", [
            'name' => 'Backwards (sample)',
            'starts_on' => '2026-08-10',
            'ends_on' => '2026-08-01',
        ])->assertUnprocessable()->assertJsonValidationErrors('ends_on');

        $this->actingAs($admin)->patchJson('/api/settings/exam-periods/'.$exam->json('data.id'), ['name' => 'Midterm exams (sample)', 'ends_on' => '2026-08-14'])
            ->assertOk()->assertJsonPath('data.endsOn', '2026-08-14');

        $this->actingAs($admin)->getJson('/api/settings/school-years')
            ->assertOk()
            ->assertJsonPath('data.0.terms.0.name', 'First term (sample)')
            ->assertJsonPath('data.0.terms.0.examPeriods.0.name', 'Midterm exams (sample)');
        $this->assertDatabaseHas('audit_entries', ['action' => 'exam_period.updated']);
    }

    public function test_grade_levels_are_fixed_and_sections_remain_manageable(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $grade = DB::table('grade_levels')->where('name', 'Grade 7')->first();

        $this->assertNotNull($grade);
        $this->assertDatabaseCount('grade_levels', 13);
        $this->assertDatabaseHas('grade_levels', ['name' => 'Kinder', 'sort_order' => 0, 'active' => true]);
        $this->assertDatabaseHas('grade_levels', ['name' => 'Grade 12', 'sort_order' => 12, 'active' => true]);
        CanonicalGradeLevels::ensure();
        $this->assertDatabaseCount('grade_levels', 13);
        $this->assertSame($grade->id, DB::table('grade_levels')->where('name', 'Grade 7')->value('id'));
        $this->actingAs($admin)->getJson('/api/settings/grade-levels')
            ->assertOk()->assertJsonPath('data.0.name', 'Kinder')->assertJsonPath('data.12.name', 'Grade 12');

        DB::table('grade_levels')->where('name', 'Grade 1')->delete();
        $this->assertDatabaseCount('grade_levels', 12);
        $this->actingAs($admin)->getJson('/api/settings/grade-levels')
            ->assertOk()->assertJsonPath('data.1.name', 'Grade 1');
        $this->assertDatabaseCount('grade_levels', 13);

        $this->actingAs($admin)->postJson('/api/settings/grade-levels', ['name' => 'Preparatory (sample)', 'sort_order' => 14])
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->actingAs($admin)->patchJson("/api/settings/grade-levels/{$grade->id}", ['name' => 'Grade Seven (sample)'])
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->actingAs($admin)->patchJson("/api/settings/grade-levels/{$grade->id}", ['active' => false])
            ->assertUnprocessable();
        $this->assertDatabaseHas('grade_levels', ['id' => $grade->id, 'active' => true]);

        $section = $this->actingAs($admin)->postJson("/api/settings/grade-levels/{$grade->id}/sections", ['name' => 'Olive (sample)'])
            ->assertCreated();
        $this->actingAs($admin)->postJson("/api/settings/grade-levels/{$grade->id}/sections", ['name' => 'olive (sample)'])
            ->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->actingAs($admin)->patchJson('/api/settings/sections/'.$section->json('data.id'), ['name' => 'Maple (sample)', 'active' => false])
            ->assertOk()->assertJsonPath('data.name', 'Maple (sample)')->assertJsonPath('data.active', false);
        $this->actingAs($admin)->getJson('/api/settings/grade-levels')
            ->assertOk()->assertJsonPath('data.7.sections.0.name', 'Maple (sample)');
        $this->assertDatabaseCount('grade_levels', 13);
        $this->assertDatabaseCount('sections', 1);
        $this->assertDatabaseHas('audit_entries', ['action' => 'section.updated']);
    }

    public function test_only_administrator_manages_and_accounting_only_reads_school_structure(): void
    {
        $yearId = $this->createSchoolYear('SY 2026-2027 (sample)', '2026-06-01', '2027-05-31', true);
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);

        $this->actingAs($accounting)->getJson('/api/settings/school-years')->assertOk();
        $this->actingAs($accounting)->getJson('/api/settings/grade-levels')->assertOk();
        $this->actingAs($accounting)->postJson('/api/settings/grade-levels', ['name' => 'Grade 1 (sample)', 'sort_order' => 1])->assertForbidden();
        $this->actingAs($accounting)->postJson("/api/settings/school-years/{$yearId}/make-current", ['reason' => 'Fictional denied switch.'])->assertForbidden();

        foreach ([UserRole::Cashier, UserRole::Registrar, UserRole::Auditor, UserRole::SuperAdmin] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->getJson('/api/settings/school-years')->assertForbidden();
            $this->actingAs($user)->getJson('/api/settings/grade-levels')->assertForbidden();
            $this->actingAs($user)->postJson('/api/settings/school-years', ['label' => 'SY denied (sample)', 'starts_on' => '2030-06-01', 'ends_on' => '2031-05-31'])->assertForbidden();
            $this->actingAs($user)->patchJson("/api/settings/school-years/{$yearId}", ['label' => 'Denied (sample)'])->assertForbidden();
        }

        $this->assertDatabaseCount('school_years', 1);
        $this->assertDatabaseCount('grade_levels', 13);
    }

    private function failAuditRecording(): void
    {
        $this->mock(AuditLogger::class, function (MockInterface $mock): void {
            $mock->shouldReceive('record')->once()->andThrow(new RuntimeException('Audit storage failed.'));
        });
    }

    private function createSchoolYear(string $label, string $startsOn, string $endsOn, bool $current): int
    {
        return DB::table('school_years')->insertGetId([
            'label' => $label,
            'starts_on' => $startsOn,
            'ends_on' => $endsOn,
            'is_current' => $current,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createBillingAccount(int $schoolYearId): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $studentId = DB::table('students')->insertGetId([
            'lrn' => '000000000901',
            'full_name' => 'Fictional Student (sample)',
            'status' => 'enrolled',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('billing_accounts')->insert([
            'student_id' => $studentId,
            'school_year_id' => $schoolYearId,
            'status' => 'current',
            'total_due_cents' => 100_000,
            'total_paid_cents' => 0,
            'balance_cents' => 100_000,
            'created_by' => $cashier->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
