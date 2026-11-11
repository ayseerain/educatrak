<?php

namespace Tests\Feature;

use App\Models\NotificationLog;
use App\Models\Student;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class NotificationLogReadTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_approved_roles_can_filter_persisted_notification_attempts_and_registrar_cannot(): void
    {
        $student = Student::query()->create(['lrn' => 'SAMPLE-8001', 'full_name' => 'Casey Sample Student', 'status' => 'enrolled']);
        $log = NotificationLog::query()->create([
            'student_id' => $student->id,
            'guardian_email' => 'guardian@example.test',
            'channel' => 'email',
            'kind' => 'payment_confirmation',
            'status' => 'queued',
            'attempts' => 1,
        ]);

        foreach ([UserRole::Cashier, UserRole::Accounting] as $role) {
            $reader = User::factory()->create(['role' => $role]);
            $this->actingAs($reader)->getJson('/api/notifications?status=queued&student=SAMPLE-8001')
                ->assertOk()
                ->assertJsonPath('data.0.id', (string) $log->id)
                ->assertJsonPath('data.0.studentName', 'Casey Sample Student')
                ->assertJsonPath('data.0.recipient', 'guardian@example.test')
                ->assertJsonPath('data.0.status', 'queued');
        }
        $auditor = User::factory()->create(['role' => UserRole::Auditor]);
        $this->actingAs($auditor)->getJson('/api/notifications')->assertForbidden();

        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $this->actingAs($registrar)->getJson('/api/notifications')->assertForbidden();
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $this->actingAs($administrator)->getJson('/api/notifications')->assertForbidden();
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $this->actingAs($superAdmin)->getJson('/api/notifications')->assertForbidden();
    }
}
