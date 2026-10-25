<?php

namespace Tests\Feature;

use App\Models\AuditEntry;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Auth;
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

        $profile = $this->actingAs($user)->getJson('/api/auth/me');
        $profile->assertOk()->assertJsonPath('data.role', 'cashier');
        $this->assertContains('students.view', $profile->json('data.capabilities'));
    }

    public function test_authenticated_user_can_logout_through_the_session_guard(): void
    {
        $user = User::factory()->create(['role' => UserRole::Cashier]);

        $this->actingAs($user, 'web')
            ->postJson('/api/auth/logout')
            ->assertNoContent();

        $this->assertNull(Auth::guard('web')->user());
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

    public function test_deactivated_user_with_an_existing_session_is_logged_out_and_denied(): void
    {
        $user = User::factory()->create([
            'username' => 'fictional.deactivated',
            'role' => UserRole::Cashier,
        ]);

        $this->actingAs($user)->getJson('/api/auth/me')->assertOk();
        $user->forceFill(['active' => false])->save();

        $this->getJson('/api/payments')->assertUnauthorized();
        $this->assertFalse(app('session.store')->has(Auth::guard('web')->getName()));
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_temporary_password_users_are_limited_to_session_and_password_change_until_updated(): void
    {
        $user = User::factory()->create([
            'username' => 'fictional.temporary',
            'password' => 'TempPass123!',
            'role' => UserRole::Cashier,
            'must_change_password' => true,
        ]);

        $this->actingAs($user)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.mustChangePassword', true);
        $this->actingAs($user)->getJson('/api/payments')->assertStatus(423);

        $this->actingAs($user)->postJson('/api/auth/change-password', [
            'current_password' => 'TempPass123!',
            'password' => 'UpdatedSecurePass456!',
            'password_confirmation' => 'UpdatedSecurePass456!',
        ])->assertOk()->assertJsonPath('data.mustChangePassword', false);

        $user->refresh();
        $this->actingAs($user)->getJson('/api/payments')->assertOk();
    }

    public function test_password_change_accepts_the_server_minimum_without_undocumented_character_class_rules(): void
    {
        $user = User::factory()->create([
            'username' => 'fictional.password-policy',
            'password' => 'TempPass123!',
            'role' => UserRole::Cashier,
            'must_change_password' => true,
        ]);

        $this->actingAs($user)->postJson('/api/auth/change-password', [
            'current_password' => 'TempPass123!',
            'password' => 'abcdefghijkl',
            'password_confirmation' => 'abcdefghijkl',
        ])->assertOk()->assertJsonPath('data.mustChangePassword', false);
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

    public function test_login_rate_limit_returns_retry_after_after_repeated_failures(): void
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/auth/login', [
                'username' => 'fictional.throttle-check',
                'password' => 'IncorrectPass123!',
            ])->assertUnprocessable();
        }

        $locked = $this->postJson('/api/auth/login', [
            'username' => 'fictional.throttle-check',
            'password' => 'IncorrectPass123!',
        ]);

        $locked->assertStatus(429)->assertHeader('Retry-After');
        $this->assertMatchesRegularExpression('/^\\d+$/', (string) $locked->headers->get('Retry-After'));
    }
}
