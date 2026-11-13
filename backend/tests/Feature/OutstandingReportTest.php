<?php

namespace Tests\Feature;

use App\Models\BillingAccount;
use App\Models\GradeLevel;
use App\Models\Installment;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class OutstandingReportTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_current_year_outstanding_report_applies_grade_section_minimum_and_overdue_filters(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $grade = GradeLevel::query()->forceCreate(['name' => 'Grade 4', 'sort_order' => 4]);
        $section = Section::query()->forceCreate(['grade_level_id' => $grade->id, 'name' => 'Orchid']);
        $overdueStudent = Student::query()->create(['lrn' => 'SAMPLE-9201', 'full_name' => 'Avery Sample Student', 'grade_level_id' => $grade->id, 'section_id' => $section->id, 'status' => 'enrolled']);
        $overdue = $this->createAccount($overdueStudent, $year, $admin, 15_000);
        Installment::query()->create(['billing_account_id' => $overdue->id, 'label' => 'Past installment', 'sequence' => 1, 'due_date' => today('Asia/Manila')->subDay()->toDateString(), 'amount_cents' => 20_000, 'paid_cents' => 5_000, 'status' => 'overdue']);

        $upcomingStudent = Student::query()->create(['lrn' => 'SAMPLE-9202', 'full_name' => 'Robin Sample Student', 'grade_level_id' => $grade->id, 'section_id' => $section->id, 'status' => 'enrolled']);
        $upcoming = $this->createAccount($upcomingStudent, $year, $admin, 25_000);
        Installment::query()->create(['billing_account_id' => $upcoming->id, 'label' => 'Upcoming installment', 'sequence' => 1, 'due_date' => today('Asia/Manila')->addMonth()->toDateString(), 'amount_cents' => 25_000, 'paid_cents' => 0, 'status' => 'current']);

        $auditor = User::factory()->create(['role' => UserRole::Auditor]);
        $this->actingAs($auditor)->getJson('/api/reports/outstanding?grade=Grade%204&section=Orchid&minimum_balance_cents=10000&overdue_only=1')
            ->assertForbidden();

        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $this->actingAs($cashier)->getJson('/api/reports/outstanding')->assertForbidden();
        $this->actingAs($admin)->getJson('/api/reports/outstanding')->assertForbidden();

        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $this->actingAs($accounting)->getJson('/api/reports/outstanding?grade=Grade%204&section=Orchid&minimum_balance_cents=10000&overdue_only=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.lrn', 'SAMPLE-9201');

        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $this->actingAs($registrar)->getJson('/api/reports/outstanding')->assertForbidden();

        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $this->actingAs($superAdmin)->getJson('/api/reports/outstanding')->assertForbidden();
    }

    public function test_outstanding_report_orders_equal_balances_by_account_id_for_stable_pagination(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2027-2028', 'starts_on' => '2027-06-01', 'ends_on' => '2028-05-31', 'is_current' => true]);
        $grade = GradeLevel::query()->forceCreate(['name' => 'Grade 5', 'sort_order' => 5]);
        $section = Section::query()->forceCreate(['grade_level_id' => $grade->id, 'name' => 'Jasmine']);
        $firstStudent = Student::query()->create(['lrn' => 'SAMPLE-9203', 'full_name' => 'Jordan Sample Student', 'grade_level_id' => $grade->id, 'section_id' => $section->id, 'status' => 'enrolled']);
        $secondStudent = Student::query()->create(['lrn' => 'SAMPLE-9204', 'full_name' => 'Casey Sample Student', 'grade_level_id' => $grade->id, 'section_id' => $section->id, 'status' => 'enrolled']);
        $firstAccount = $this->createAccount($firstStudent, $year, $admin, 15_000);
        $secondAccount = $this->createAccount($secondStudent, $year, $admin, 15_000);

        $this->actingAs($accounting)->getJson('/api/reports/outstanding?per_page=10')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.id', (string) $firstAccount->id)
            ->assertJsonPath('data.1.id', (string) $secondAccount->id);
    }

    private function createAccount(Student $student, SchoolYear $year, User $admin, int $balance): BillingAccount
    {
        return BillingAccount::query()->create([
            'student_id' => $student->id,
            'school_year_id' => $year->id,
            'status' => 'overdue',
            'total_due_cents' => $balance,
            'total_paid_cents' => 0,
            'balance_cents' => $balance,
            'created_by' => $admin->id,
        ]);
    }
}
