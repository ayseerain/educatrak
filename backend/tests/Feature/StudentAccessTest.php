<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StudentAccessTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_registrar_can_list_the_student_directory_with_financial_context(): void
    {
        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        Student::factory()->create(['student_no' => 'SAMPLE-1000', 'full_name' => 'Rory Sample Student']);

        $this->actingAs($registrar)->getJson('/api/students')
            ->assertOk()
            ->assertJsonPath('data.0.studentNo', 'SAMPLE-1000')
            ->assertJsonPath('data.0.balanceCents', 0)
            ->assertJsonMissingPath('data.0.guardians');
    }

    public function test_only_student_roles_can_open_the_student_directory(): void
    {
        foreach ([UserRole::SuperAdmin, UserRole::Admin, UserRole::Auditor] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->getJson('/api/students?query=SAMPLE')
                ->assertForbidden();
        }
    }

    public function test_registrar_student_search_returns_financial_context_without_guardians(): void
    {
        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $gradeId = DB::table('grade_levels')->insertGetId(['name' => 'Grade 4', 'sort_order' => 4, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $sectionId = DB::table('sections')->insertGetId(['grade_level_id' => $gradeId, 'name' => 'Orchid', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $student = Student::factory()->create([
            'student_no' => 'SAMPLE-4001',
            'full_name' => 'Jordan Sample Student',
            'grade_level_id' => $gradeId,
            'section_id' => $sectionId,
            'status' => 'enrolled',
        ]);

        $this->actingAs($registrar)->getJson('/api/students?query=SAMPLE-4001&grade=Grade%204&section=Orchid')
            ->assertOk()
            ->assertJsonPath('data.0.id', (string) $student->id)
            ->assertJsonPath('data.0.fullName', 'Jordan Sample Student')
            ->assertJsonPath('data.0.gradeLevel', 'Grade 4')
            ->assertJsonPath('data.0.section', 'Orchid')
            ->assertJsonPath('data.0.balanceCents', 0)
            ->assertJsonMissingPath('data.0.guardians');
    }

    public function test_accounting_can_read_student_list_with_active_year_balance_field(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $student = Student::factory()->create([
            'student_no' => 'SAMPLE-2001',
            'full_name' => 'Taylor Sample Student',
            'status' => 'enrolled',
        ]);
        $currentYearId = DB::table('school_years')->insertGetId(['label' => 'SY current', 'is_current' => true, 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'created_at' => now(), 'updated_at' => now()]);
        $previousYearId = DB::table('school_years')->insertGetId(['label' => 'SY previous', 'is_current' => false, 'starts_on' => '2025-06-01', 'ends_on' => '2026-05-31', 'created_at' => now(), 'updated_at' => now()]);
        foreach ([[$currentYearId, 185_000], [$previousYearId, 990_000]] as [$yearId, $balance]) {
            DB::table('billing_accounts')->insert([
                'student_id' => $student->id,
                'school_year_id' => $yearId,
                'status' => 'current',
                'total_due_cents' => $balance,
                'total_paid_cents' => 0,
                'balance_cents' => $balance,
                'created_by' => $accounting->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->actingAs($accounting)->getJson('/api/students?query=SAMPLE-2001')
            ->assertOk()
            ->assertJsonPath('data.0.studentNo', 'SAMPLE-2001')
            ->assertJsonPath('data.0.balanceCents', 185_000);
    }

    public function test_student_list_financial_field_boundary_is_enforced_for_all_six_roles(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $student = Student::factory()->create(['student_no' => 'SAMPLE-2002', 'full_name' => 'Morgan Sample Student']);
        $schoolYearId = DB::table('school_years')->insertGetId([
            'label' => 'SY current',
            'is_current' => true,
            'starts_on' => '2026-06-01',
            'ends_on' => '2027-05-31',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('billing_accounts')->insert([
            'student_id' => $student->id,
            'school_year_id' => $schoolYearId,
            'status' => 'current',
            'total_due_cents' => 12_345,
            'total_paid_cents' => 0,
            'balance_cents' => 12_345,
            'created_by' => $admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ([UserRole::Cashier, UserRole::Accounting, UserRole::Registrar] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $response = $this->actingAs($user)->getJson('/api/students?query=SAMPLE-2002')->assertOk();
            $response->assertJsonPath('data.0.balanceCents', 12_345);
            $response->assertJsonMissingPath('data.0.guardians');
        }
        $auditor = User::factory()->create(['role' => UserRole::Auditor]);
        $this->actingAs($auditor)->getJson('/api/students?query=SAMPLE-2002')->assertForbidden();

        $this->actingAs($admin)->getJson('/api/students?query=SAMPLE-2002')->assertForbidden();
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $this->actingAs($superAdmin)->getJson('/api/students?query=SAMPLE-2002')->assertForbidden();
        $this->actingAs($superAdmin)->getJson('/api/students/'.$student->id)->assertForbidden();
    }

    public function test_approved_roles_receive_guardian_contact_details_on_student_profile(): void
    {
        $student = Student::factory()->create(['student_no' => 'SAMPLE-3001', 'full_name' => 'Morgan Sample Student']);
        $guardianId = DB::table('guardians')->insertGetId([
            'full_name' => 'Jamie Sample Guardian',
            'relationship' => 'Parent',
            'email' => 'jamie.guardian@example.test',
            'email_status' => 'unverified',
            'mobile' => '00000000000',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('guardian_student')->insert([
            'guardian_id' => $guardianId,
            'student_id' => $student->id,
            'is_primary' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ([UserRole::Cashier, UserRole::Accounting, UserRole::Registrar] as $role) {
            $user = User::factory()->create(['role' => $role]);

            $this->actingAs($user)->getJson('/api/students/'.$student->id)
                ->assertOk()
                ->assertJsonPath('data.guardians.0.fullName', 'Jamie Sample Guardian')
                ->assertJsonPath('data.guardians.0.relationship', 'Parent')
                ->assertJsonPath('data.guardians.0.emailStatus', 'unverified');
        }
        $auditor = User::factory()->create(['role' => UserRole::Auditor]);
        $this->actingAs($auditor)->getJson('/api/students/'.$student->id)->assertForbidden();

        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $this->actingAs($administrator)->getJson('/api/students/'.$student->id)->assertForbidden();
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $this->actingAs($superAdmin)->getJson('/api/students/'.$student->id)->assertForbidden();
    }

    public function test_registrar_can_open_student_profiles_with_guardian_and_financial_context(): void
    {
        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $student = Student::factory()->create(['student_no' => 'SAMPLE-3002', 'full_name' => 'Avery Sample Student']);
        $guardianId = DB::table('guardians')->insertGetId([
            'full_name' => 'Alex Sample Guardian',
            'relationship' => 'Parent',
            'email' => 'alex.guardian@example.test',
            'email_status' => 'verified',
            'mobile' => '00000000000',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('guardian_student')->insert([
            'guardian_id' => $guardianId,
            'student_id' => $student->id,
            'is_primary' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($registrar)->getJson('/api/students/'.$student->id)
            ->assertOk()
            ->assertJsonPath('data.fullName', 'Avery Sample Student')
            ->assertJsonPath('data.balanceCents', 0)
            ->assertJsonPath('data.guardians.0.fullName', 'Alex Sample Guardian');
    }

    public function test_registrar_can_create_and_update_a_student_while_cashier_cannot(): void
    {
        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $gradeId = DB::table('grade_levels')->insertGetId(['name' => 'Grade 6', 'sort_order' => 6, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $sectionId = DB::table('sections')->insertGetId(['grade_level_id' => $gradeId, 'name' => 'Cedar', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $payload = ['student_no' => 'SAMPLE-6001', 'full_name' => 'Taylor Sample Student', 'grade_level_id' => $gradeId, 'section_id' => $sectionId, 'status' => 'inactive'];

        $this->actingAs($cashier)->postJson('/api/students', $payload)->assertForbidden();
        $created = $this->actingAs($registrar)->postJson('/api/students', $payload)
            ->assertCreated()
            ->assertJsonPath('data.studentNo', 'SAMPLE-6001')
            ->assertJsonPath('data.status', 'enrolled')
            ->assertJsonPath('data.balanceCents', 0)
            ->json('data.id');

        $this->actingAs($cashier)->patchJson('/api/students/'.$created, [...$payload, 'full_name' => 'Changed by Cashier'])
            ->assertForbidden();
        $this->actingAs($registrar)->patchJson('/api/students/'.$created, [...$payload, 'full_name' => 'Updated Sample Student', 'status' => 'inactive'])
            ->assertOk()
            ->assertJsonPath('data.fullName', 'Updated Sample Student')
            ->assertJsonPath('data.status', 'inactive');

        $this->assertDatabaseHas('audit_entries', ['action' => 'student.created', 'entity_id' => (string) $created, 'user_id' => $registrar->id]);
        $this->assertDatabaseHas('audit_entries', ['action' => 'student.updated', 'entity_id' => (string) $created, 'user_id' => $registrar->id]);
    }
}
