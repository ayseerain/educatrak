<?php

namespace Tests\Feature;

use App\Models\BillingAccount;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use App\Services\AuditLogger;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

class SchoolStructureArchiveTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_school_year_archive_restore_preserves_identity_children_and_locks(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $current = $this->year(true);
        $prior = $this->year(false);
        $term = DB::table('terms')->insertGetId(['school_year_id' => $prior->id, 'name' => 'Term (fictional)', 'sequence' => 1, 'created_at' => now(), 'updated_at' => now()]);
        $exam = DB::table('exam_periods')->insertGetId(['term_id' => $term, 'name' => 'Exam (fictional)', 'starts_on' => '2025-09-01', 'created_at' => now(), 'updated_at' => now()]);
        $student = Student::query()->create(['lrn' => '000000005001', 'full_name' => 'Alex Fictional', 'status' => 'enrolled']);
        BillingAccount::query()->create(['student_id' => $student->id, 'school_year_id' => $prior->id, 'status' => 'current', 'total_due_cents' => 10000, 'total_paid_cents' => 0, 'balance_cents' => 10000, 'created_by' => $admin->id]);

        $this->actingAs($admin)->postJson("/api/settings/school-years/{$current->id}/archive")->assertConflict();
        $this->actingAs($admin)->postJson("/api/settings/school-years/{$prior->id}/archive")
            ->assertOk()->assertJsonPath('data.id', (string) $prior->id)->assertJsonPath('data.current', false)->assertJsonPath('data.datesLocked', true);
        $this->actingAs($admin)->postJson("/api/settings/school-years/{$prior->id}/archive")->assertConflict();
        $this->actingAs($admin)->postJson("/api/settings/school-years/{$prior->id}/make-current", ['reason' => 'Fictional archived-year switch.'])->assertConflict();
        $this->actingAs($admin)->getJson('/api/settings/school-years?view=active')->assertJsonMissing(['id' => (string) $prior->id]);
        $this->actingAs($admin)->getJson('/api/settings/school-years?view=archived')
            ->assertJsonPath('data.0.id', (string) $prior->id)->assertJsonPath('data.0.terms.0.id', (string) $term)
            ->assertJsonPath('data.0.terms.0.examPeriods.0.id', (string) $exam);
        $this->actingAs($admin)->getJson('/api/settings/school-years')->assertJsonCount(2, 'data');
        $this->actingAs($admin)->patchJson("/api/settings/school-years/{$prior->id}", ['label' => 'SY 2025-2026 corrected (fictional)'])->assertOk();
        $this->actingAs($admin)->patchJson("/api/settings/school-years/{$prior->id}", ['ends_on' => '2026-04-30'])->assertConflict();
        $this->actingAs($admin)->postJson("/api/settings/school-years/{$prior->id}/terms", ['name' => 'Other term', 'sequence' => 2])->assertConflict();
        $this->actingAs($admin)->patchJson("/api/settings/terms/{$term}", ['name' => 'Other name'])->assertConflict();
        $this->actingAs($admin)->postJson("/api/settings/terms/{$term}/exam-periods", ['name' => 'Other exam', 'starts_on' => '2025-10-01'])->assertConflict();
        $this->actingAs($admin)->patchJson("/api/settings/exam-periods/{$exam}", ['name' => 'Other name'])->assertConflict();

        $this->actingAs($admin)->postJson("/api/settings/school-years/{$prior->id}/restore")
            ->assertOk()->assertJsonPath('data.id', (string) $prior->id)->assertJsonPath('data.current', false)->assertJsonPath('data.archivedAt', null);
        $this->actingAs($admin)->postJson("/api/settings/school-years/{$prior->id}/restore")->assertConflict();
        $this->assertSame([$current->id], SchoolYear::query()->where('is_current', true)->pluck('id')->all());
        $this->assertDatabaseHas('terms', ['id' => $term, 'school_year_id' => $prior->id]);
        $this->assertDatabaseHas('exam_periods', ['id' => $exam, 'term_id' => $term]);
        $this->actingAs($admin)->patchJson("/api/settings/school-years/{$prior->id}", ['ends_on' => '2026-04-30'])->assertUnprocessable()->assertJsonValidationErrors('ends_on');
        $audit = DB::table('audit_entries')->where('action', 'school_year.archived')->first();
        $this->assertSame($admin->id, $audit->user_id);
        $this->assertNull(json_decode($audit->before, true)['archived_at']);
        $this->assertNotNull(json_decode($audit->after, true)['archived_at']);
        $this->assertDatabaseHas('audit_entries', ['action' => 'school_year.restored', 'user_id' => $admin->id]);
    }

    public function test_section_archive_requires_reassignment_and_preserves_inactive_state(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $grade = (int) DB::table('grade_levels')->where('name', 'Grade 7')->value('id');
        $active = DB::table('sections')->insertGetId(['grade_level_id' => $grade, 'name' => 'Orchid (fictional)', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $inactive = DB::table('sections')->insertGetId(['grade_level_id' => $grade, 'name' => 'Maple (fictional)', 'active' => false, 'created_at' => now(), 'updated_at' => now()]);
        $student = Student::query()->create(['lrn' => '000000005002', 'full_name' => 'Blair Fictional', 'grade_level_id' => $grade, 'section_id' => $active, 'status' => 'enrolled']);
        $this->actingAs($admin)->postJson("/api/settings/sections/{$active}/archive")->assertConflict();
        $this->actingAs($registrar)->getJson("/api/students/{$student->id}")->assertJsonPath('data.section', 'Orchid (fictional)');
        $this->actingAs($admin)->postJson("/api/settings/sections/{$inactive}/archive")
            ->assertOk()->assertJsonPath('data.id', (string) $inactive)->assertJsonPath('data.active', false);
        $this->actingAs($admin)->postJson("/api/settings/sections/{$inactive}/archive")->assertConflict();
        $this->actingAs($admin)->getJson('/api/settings/grade-levels?section_view=archived')->assertJsonPath('data.7.sections.0.id', (string) $inactive);
        $this->actingAs($admin)->postJson("/api/settings/grade-levels/{$grade}/sections", ['name' => 'Maple (fictional)'])->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->actingAs($admin)->patchJson("/api/settings/sections/{$inactive}", ['active' => true])->assertConflict();
        $this->actingAs($admin)->patchJson("/api/settings/sections/{$inactive}", ['name' => 'Maple corrected (fictional)'])->assertOk();
        $this->actingAs($admin)->postJson("/api/settings/sections/{$inactive}/restore")
            ->assertOk()->assertJsonPath('data.id', (string) $inactive)->assertJsonPath('data.active', false)->assertJsonPath('data.archivedAt', null);
        $this->actingAs($admin)->postJson("/api/settings/sections/{$inactive}/restore")->assertConflict();
        DB::table('students')->where('id', $student->id)->update(['section_id' => null]);
        $this->actingAs($admin)->postJson("/api/settings/sections/{$active}/archive")->assertOk();
        $activeSections = $this->actingAs($admin)->getJson('/api/settings/grade-levels?section_view=active')->assertOk()->json('data.7.sections');
        $this->assertNotContains((string) $active, array_column($activeSections, 'id'));
        $payload = ['lrn' => '000000005003', 'full_name' => 'Taylor Fictional', 'grade_level_id' => $grade, 'section_id' => $active, 'status' => 'enrolled'];
        $this->actingAs($registrar)->postJson('/api/students', $payload)->assertUnprocessable()->assertJsonValidationErrors('section_id');
        $payload['lrn'] = $student->lrn;
        $this->actingAs($registrar)->patchJson("/api/students/{$student->id}", $payload)->assertUnprocessable()->assertJsonValidationErrors('section_id');
        $this->actingAs($admin)->postJson("/api/settings/sections/{$active}/restore")
            ->assertOk()->assertJsonPath('data.id', (string) $active)->assertJsonPath('data.active', true);
        $this->assertDatabaseHas('audit_entries', ['action' => 'section.archived', 'user_id' => $admin->id]);
        $this->assertDatabaseHas('audit_entries', ['action' => 'section.restored', 'user_id' => $admin->id]);
    }

    public function test_historical_collection_report_and_financial_rows_never_change_with_archive(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $this->year(true);
        $prior = $this->year(false);
        $student = Student::query()->create(['lrn' => '000000005004', 'full_name' => 'Casey Fictional', 'status' => 'enrolled']);
        $account = BillingAccount::query()->create(['student_id' => $student->id, 'school_year_id' => $prior->id, 'status' => 'current', 'total_due_cents' => 30000, 'total_paid_cents' => 15000, 'balance_cents' => 15000, 'created_by' => $cashier->id]);
        foreach ([['valid', 10000], ['void_pending', 5000], ['voided', 3000]] as $index => [$status, $cents]) {
            $payment = Payment::query()->create(['billing_account_id' => $account->id, 'student_id' => $student->id, 'amount_cents' => $cents, 'method' => 'cash', 'paid_on' => '2026-10-24', 'status' => $status, 'recorded_by' => $cashier->id, 'recorded_at' => now()]);
            Receipt::query()->create(['payment_id' => $payment->id, 'sequence' => $index + 1, 'receipt_no' => 'OR-FICTIONAL-'.($index + 1), 'receipt_year' => 2026, 'issued_at' => now()]);
        }
        $report = fn () => $this->actingAs($accounting)->getJson('/api/reports/daily?date=2026-10-24')->assertOk()->json('data');
        $outstanding = fn () => $this->actingAs($accounting)->getJson('/api/reports/outstanding')->assertOk()->json('data');
        $rows = fn () => [DB::table('billing_accounts')->where('id', $account->id)->first(), DB::table('payments')->where('billing_account_id', $account->id)->orderBy('id')->get()->all(), DB::table('receipts')->orderBy('id')->get()->all()];
        $before = $report();
        $beforeOutstanding = $outstanding();
        $beforeRows = $rows();
        $this->assertSame(15000, $before['totalCents']);
        $this->assertSame(3, $before['meta']['totalPayments']);
        $this->assertSame(['voided', 'void_pending', 'valid'], array_column($before['payments'], 'status'));
        $this->actingAs($admin)->postJson("/api/settings/school-years/{$prior->id}/archive")->assertOk();
        $this->assertSame($before, $report());
        $this->assertSame($beforeOutstanding, $outstanding());
        $this->assertEquals($beforeRows, $rows());
        $this->actingAs($admin)->postJson("/api/settings/school-years/{$prior->id}/restore")->assertOk();
        $this->assertSame($before, $report());
        $this->assertSame($beforeOutstanding, $outstanding());
        $this->assertEquals($beforeRows, $rows());
    }

    public function test_permissions_and_failed_audit_prevent_archive_writes(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $this->year(true);
        $prior = $this->year(false);
        $grade = (int) DB::table('grade_levels')->where('name', 'Grade 7')->value('id');
        $section = DB::table('sections')->insertGetId(['grade_level_id' => $grade, 'name' => 'Cedar (fictional)', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->actingAs($accounting)->getJson('/api/settings/school-years?view=archived')->assertOk();
        $this->actingAs($accounting)->getJson('/api/settings/grade-levels?section_view=archived')->assertOk();
        $this->actingAs($accounting)->postJson("/api/settings/school-years/{$prior->id}/archive")->assertForbidden();
        $this->actingAs($accounting)->postJson("/api/settings/sections/{$section}/archive")->assertForbidden();
        foreach ([UserRole::Cashier, UserRole::Registrar, UserRole::Auditor, UserRole::SuperAdmin] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->getJson('/api/settings/school-years?view=archived')->assertForbidden();
            $this->actingAs($user)->postJson("/api/settings/sections/{$section}/archive")->assertForbidden();
        }
        $this->mock(AuditLogger::class, function (MockInterface $mock): void {
            $mock->shouldReceive('record')->once()->andThrow(new RuntimeException('Audit storage failed.'));
        });
        $this->actingAs($admin)->postJson("/api/settings/school-years/{$prior->id}/archive")->assertInternalServerError();
        $this->assertNull(SchoolYear::findOrFail($prior->id)->archived_at);
    }

    public function test_existing_archived_section_link_remains_readable_and_can_be_retained_on_unrelated_edit(): void
    {
        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $grade = (int) DB::table('grade_levels')->where('name', 'Grade 7')->value('id');
        $section = DB::table('sections')->insertGetId(['grade_level_id' => $grade, 'name' => 'Legacy (fictional)', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $student = Student::query()->create(['lrn' => '000000005005', 'full_name' => 'Drew Fictional', 'grade_level_id' => $grade, 'section_id' => $section, 'status' => 'enrolled']);
        DB::table('sections')->where('id', $section)->update(['archived_at' => now()]);
        $this->actingAs($registrar)->patchJson("/api/students/{$student->id}", [
            'lrn' => $student->lrn,
            'full_name' => 'Drew Fictional Corrected',
            'grade_level_id' => $grade,
            'section_id' => $section,
            'status' => 'enrolled',
        ])->assertOk()->assertJsonPath('data.section', 'Legacy (fictional)');
        $this->assertDatabaseHas('students', ['id' => $student->id, 'section_id' => $section]);
        $options = $this->actingAs($registrar)->getJson('/api/student-record-options')->assertOk()->json('data.grades.7.sections');
        $this->assertNotContains((string) $section, array_column($options, 'id'));
    }

    public function test_section_archive_rolls_back_when_audit_storage_fails(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $grade = (int) DB::table('grade_levels')->where('name', 'Grade 7')->value('id');
        $section = DB::table('sections')->insertGetId(['grade_level_id' => $grade, 'name' => 'Birch (fictional)', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->mock(AuditLogger::class, function (MockInterface $mock): void {
            $mock->shouldReceive('record')->once()->andThrow(new RuntimeException('Audit storage failed.'));
        });
        $this->actingAs($admin)->postJson("/api/settings/sections/{$section}/archive")->assertInternalServerError();
        $this->assertDatabaseHas('sections', ['id' => $section, 'active' => true, 'archived_at' => null]);
        $this->assertDatabaseMissing('audit_entries', ['action' => 'section.archived', 'entity_id' => (string) $section]);
    }

    private function year(bool $current): SchoolYear
    {
        return SchoolYear::query()->forceCreate([
            'label' => $current ? 'SY 2026-2027 (fictional)' : 'SY 2025-2026 (fictional)',
            'starts_on' => $current ? '2026-06-01' : '2025-06-01',
            'ends_on' => $current ? '2027-05-31' : '2026-05-31',
            'is_current' => $current,
        ]);
    }
}
