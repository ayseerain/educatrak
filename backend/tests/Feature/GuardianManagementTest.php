<?php

namespace Tests\Feature;

use App\Models\GradeLevel;
use App\Models\Guardian;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class GuardianManagementTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_only_registrar_can_create_link_update_and_unlink_guardian_associations(): void
    {
        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $student = $this->student('000000008001');

        $created = $this->actingAs($registrar)->postJson("/api/students/{$student->id}/guardians", [
            'full_name' => 'Robin Guardian (sample)',
            'relationship' => 'Parent',
            'email' => 'robin.guardian@example.test',
            'mobile' => '09175550101',
            'is_primary' => true,
        ])->assertCreated()
            ->assertJsonPath('data.relationship', 'Parent')
            ->assertJsonPath('data.isPrimary', true);

        $guardianId = $created->json('data.id');
        $this->assertDatabaseHas('guardian_student', ['student_id' => $student->id, 'guardian_id' => $guardianId, 'relationship' => 'Parent', 'is_primary' => true]);
        $this->assertDatabaseHas('audit_entries', ['action' => 'guardian.created', 'user_id' => $registrar->id]);

        $this->actingAs($registrar)->patchJson("/api/students/{$student->id}/guardians/{$guardianId}", ['relationship' => 'Legal guardian'])
            ->assertOk()->assertJsonPath('data.relationship', 'Legal guardian');
        $this->assertDatabaseHas('guardian_student', ['student_id' => $student->id, 'guardian_id' => $guardianId, 'relationship' => 'Legal guardian']);

        $this->actingAs($registrar)->deleteJson("/api/students/{$student->id}/guardians/{$guardianId}")->assertUnprocessable();

        foreach ([UserRole::SuperAdmin, UserRole::Admin, UserRole::Cashier, UserRole::Accounting, UserRole::Auditor] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->postJson("/api/students/{$student->id}/guardians", [
                'full_name' => 'Denied Guardian (sample)',
                'relationship' => 'Parent',
                'is_primary' => true,
            ])->assertForbidden();
        }
    }

    public function test_shared_guardian_uses_explicit_links_and_preserves_contact_data(): void
    {
        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $firstStudent = $this->student('000000008002');
        $secondStudent = $this->student('000000008003');
        $guardian = Guardian::query()->create([
            'full_name' => 'Sky Shared Guardian (sample)',
            'relationship' => 'Parent',
            'email' => 'sky.shared@example.test',
            'email_status' => 'verified',
            'mobile' => '09175550102',
        ]);
        $firstStudent->guardians()->attach($guardian->id, ['is_primary' => true, 'relationship' => 'Parent']);

        $this->actingAs($registrar)->postJson("/api/students/{$secondStudent->id}/guardians/link", ['guardian_id' => $guardian->id, 'relationship' => 'Aunt', 'is_primary' => true])
            ->assertCreated()->assertJsonPath('data.relationship', 'Aunt');

        $this->actingAs($registrar)->patchJson("/api/students/{$secondStudent->id}/guardians/{$guardian->id}", ['relationship' => 'Guardian'])->assertOk();
        $this->assertDatabaseHas('guardian_student', ['student_id' => $firstStudent->id, 'guardian_id' => $guardian->id, 'relationship' => 'Parent']);
        $this->assertDatabaseHas('guardian_student', ['student_id' => $secondStudent->id, 'guardian_id' => $guardian->id, 'relationship' => 'Guardian']);

        $this->actingAs($registrar)->patchJson("/api/students/{$secondStudent->id}/guardians/{$guardian->id}", ['email' => 'replacement@example.test'])
            ->assertUnprocessable()->assertJsonValidationErrors('guardian');
        $this->assertSame('sky.shared@example.test', $guardian->fresh()->email);

        $this->actingAs($registrar)->deleteJson("/api/students/{$firstStudent->id}/guardians/{$guardian->id}")
            ->assertUnprocessable()->assertJsonValidationErrors('guardian');
        $this->assertDatabaseHas('guardian_student', ['student_id' => $firstStudent->id, 'guardian_id' => $guardian->id]);
    }

    private function student(string $lrn): Student
    {
        $grade = GradeLevel::query()->where('name', 'Guardian Test Grade')->first()
            ?? GradeLevel::query()->forceCreate(['name' => 'Guardian Test Grade', 'sort_order' => 88]);
        $section = Section::query()->where(['grade_level_id' => $grade->id, 'name' => 'Guardian Test Section'])->first()
            ?? Section::query()->forceCreate(['grade_level_id' => $grade->id, 'name' => 'Guardian Test Section']);

        return Student::query()->create([
            'lrn' => $lrn,
            'full_name' => "Student {$lrn} (sample)",
            'grade_level_id' => $grade->id,
            'section_id' => $section->id,
            'status' => 'enrolled',
        ]);
    }
}
