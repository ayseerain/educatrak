<?php

namespace Tests\Feature;

use App\Models\AuditEntry;
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
            ->assertConflict()
            ->assertJsonPath('code', 'shared_guardian_confirmation_required')
            ->assertJsonCount(2, 'affectedStudents');
        $this->assertSame('sky.shared@example.test', $guardian->fresh()->email);

        $this->actingAs($registrar)->patchJson("/api/students/{$secondStudent->id}/guardians/{$guardian->id}", [
            'email' => 'replacement@example.test',
            'confirm_shared_contact_update' => true,
        ])->assertOk()->assertJsonPath('data.emailStatus', 'unverified');
        $this->assertSame('replacement@example.test', $guardian->fresh()->email);
        $audit = AuditEntry::query()->where('action', 'guardian.updated')->latest('id')->first();
        $this->assertEqualsCanonicalizing([(string) $firstStudent->id, (string) $secondStudent->id], $audit->after['affected_student_ids']);

        $this->actingAs($registrar)->deleteJson("/api/students/{$firstStudent->id}/guardians/{$guardian->id}")
            ->assertUnprocessable()->assertJsonValidationErrors('replacement_primary_guardian_id');
        $this->assertDatabaseHas('guardian_student', ['student_id' => $firstStudent->id, 'guardian_id' => $guardian->id]);
    }

    public function test_unrelated_edit_keeps_email_status_and_primary_unlink_requires_replacement_in_same_request(): void
    {
        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $student = $this->student('000000008004');
        $primary = Guardian::query()->create(['full_name' => 'Pat Primary (sample)', 'relationship' => 'Parent', 'email' => 'pat@example.test', 'email_status' => 'verified']);
        $secondary = Guardian::query()->create(['full_name' => 'Sam Secondary (sample)', 'relationship' => 'Parent', 'email' => 'sam@example.test', 'email_status' => 'verified']);
        $student->guardians()->attach($primary->id, ['is_primary' => true, 'relationship' => 'Parent']);
        $student->guardians()->attach($secondary->id, ['is_primary' => false, 'relationship' => 'Uncle']);

        $this->actingAs($registrar)->patchJson("/api/students/{$student->id}/guardians/{$primary->id}", ['mobile' => '09175550199', 'email' => 'pat@example.test'])
            ->assertOk()->assertJsonPath('data.emailStatus', 'verified');

        $this->actingAs($registrar)->deleteJson("/api/students/{$student->id}/guardians/{$primary->id}", ['replacement_primary_guardian_id' => $primary->id])
            ->assertUnprocessable()->assertJsonValidationErrors('replacement_primary_guardian_id');

        $this->actingAs($registrar)->deleteJson("/api/students/{$student->id}/guardians/{$primary->id}", ['replacement_primary_guardian_id' => $secondary->id])
            ->assertNoContent();
        $this->assertDatabaseMissing('guardian_student', ['student_id' => $student->id, 'guardian_id' => $primary->id]);
        $this->assertDatabaseHas('guardian_student', ['student_id' => $student->id, 'guardian_id' => $secondary->id, 'is_primary' => true]);
        $this->assertDatabaseHas('guardians', ['id' => $primary->id]);
    }

    public function test_student_form_requires_confirmation_for_shared_contact_and_keeps_primary_flags(): void
    {
        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $student = $this->student('000000008005');
        $sibling = $this->student('000000008006');
        $shared = Guardian::query()->create(['full_name' => 'Lee Shared (sample)', 'relationship' => 'Parent', 'email' => 'lee@example.test', 'email_status' => 'verified']);
        $secondary = Guardian::query()->create(['full_name' => 'Kim Secondary (sample)', 'relationship' => 'Parent', 'email' => 'kim@example.test', 'email_status' => 'verified']);
        $student->guardians()->attach($shared->id, ['is_primary' => true, 'relationship' => 'Parent']);
        $student->guardians()->attach($secondary->id, ['is_primary' => false, 'relationship' => 'Aunt']);
        $sibling->guardians()->attach($shared->id, ['is_primary' => true, 'relationship' => 'Parent']);
        $payload = [
            'lrn' => $student->lrn,
            'full_name' => $student->full_name,
            'grade_level_id' => $student->grade_level_id,
            'section_id' => $student->section_id,
            'status' => 'enrolled',
        ];
        $renamed = ['guardian_id' => $shared->id, 'guardian_name' => 'Lee Renamed (sample)', 'guardian_relationship' => 'Parent', 'guardian_email' => 'lee@example.test'];

        $this->actingAs($registrar)->patchJson("/api/students/{$student->id}", [...$payload, ...$renamed])
            ->assertConflict()->assertJsonPath('code', 'shared_guardian_confirmation_required');
        $this->assertSame('Lee Shared (sample)', $shared->fresh()->full_name);

        $this->actingAs($registrar)->patchJson("/api/students/{$student->id}", [...$payload, ...$renamed, 'confirm_shared_contact_update' => true])
            ->assertOk();
        $this->assertSame('Lee Renamed (sample)', $shared->fresh()->full_name);
        $this->assertSame('verified', $shared->fresh()->email_status);

        $this->actingAs($registrar)->patchJson("/api/students/{$student->id}", [...$payload, 'guardian_id' => $secondary->id, 'guardian_name' => 'Kim Secondary (sample)', 'guardian_relationship' => 'Aunt', 'guardian_email' => 'kim@example.test'])
            ->assertOk();
        $this->assertDatabaseHas('guardian_student', ['student_id' => $student->id, 'guardian_id' => $shared->id, 'is_primary' => true]);
        $this->assertDatabaseHas('guardian_student', ['student_id' => $student->id, 'guardian_id' => $secondary->id, 'is_primary' => false]);
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
