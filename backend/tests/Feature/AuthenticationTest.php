<?php

namespace Tests\Feature;

use App\Models\AuditEntry;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_user_can_log_in_and_read_their_profile(): void
    {
        $user = User::factory()->create([
            'username' => 'fictional.cashier',
            'password' => 'FictionalPass123!',
            'role' => UserRole::Cashier,
        ]);

        $this->postJson('/api/auth/login', [
            'username' => 'fictional.cashier',
            'password' => 'FictionalPass123!',
        ])->assertOk()->assertJsonPath('data.username', 'fictional.cashier');

        $this->actingAs($user)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.role', 'cashier')
            ->assertJsonPath('data.capabilities.0', 'students.manage');
    }

    public function test_inactive_user_cannot_log_in(): void
    {
        User::factory()->inactive()->create([
            'username' => 'fictional.inactive',
            'password' => 'FictionalPass123!',
        ]);

        $this->postJson('/api/auth/login', [
            'username' => 'fictional.inactive',
            'password' => 'FictionalPass123!',
        ])->assertForbidden();
    }

    public function test_failed_login_is_audited_without_a_password(): void
    {
        $this->postJson('/api/auth/login', [
            'username' => 'fictional.unknown',
            'password' => 'IncorrectPass123!',
        ])->assertUnprocessable();

        $entry = AuditEntry::query()->where('action', 'auth.login_failed')->sole();

        $this->assertSame('fictional.unknown', $entry->after['username']);
        $this->assertSame('invalid_credentials', $entry->after['outcome']);
        $this->assertArrayNotHasKey('password', $entry->after);
    }
}
