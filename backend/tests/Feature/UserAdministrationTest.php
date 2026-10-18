<?php

namespace Tests\Feature;

use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\Fluent\AssertableJson;
use Tests\TestCase;

class UserAdministrationTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_administrator_can_create_a_staff_account_with_a_one_time_temporary_password(): void
    {
        $administrator = User::factory()->create(['role' => UserRole::Admin]);

        $response = $this->actingAs($administrator)->postJson('/api/admin/users', [
            'username' => 'fictional.registrar',
            'full_name' => 'Riley Registrar (sample)',
            'email' => 'riley.registrar@example.test',
            'role' => UserRole::Registrar->value,
        ]);

        $response->assertCreated()
            ->assertJson(fn (AssertableJson $json) => $json
                ->where('data.username', 'fictional.registrar')
                ->where('data.mustChangePassword', true)
                ->has('temporaryPassword')
            );

        $user = User::query()->where('username', 'fictional.registrar')->sole();
        $temporaryPassword = $response->json('temporaryPassword');

        $this->assertTrue(Hash::check($temporaryPassword, $user->password));
        $this->assertNotSame($temporaryPassword, $user->password);
        $this->assertDatabaseHas('audit_entries', ['action' => 'user.created', 'entity_id' => (string) $user->id]);
    }

    public function test_administrator_can_reset_a_password_and_must_require_a_change(): void
    {
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $staffUser = User::factory()->create([
            'role' => UserRole::Cashier,
            'must_change_password' => false,
        ]);

        $response = $this->actingAs($administrator)->postJson("/api/admin/users/{$staffUser->id}/reset-password");

        $response->assertOk()->assertJsonPath('data.mustChangePassword', true);
        $temporaryPassword = $response->json('temporaryPassword');
        $staffUser->refresh();

        $this->assertTrue(Hash::check($temporaryPassword, $staffUser->password));
        $this->assertDatabaseHas('audit_entries', ['action' => 'user.password_reset', 'entity_id' => (string) $staffUser->id]);
    }

    public function test_cashier_cannot_access_administrator_or_security_endpoints(): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);

        $this->actingAs($cashier)->getJson('/api/admin/users')->assertForbidden();
        $this->actingAs($cashier)->getJson('/api/admin/security-events')->assertForbidden();
    }

    public function test_administrator_cannot_deactivate_their_own_account_or_the_last_active_administrator(): void
    {
        $administrator = User::factory()->create(['role' => UserRole::Admin]);

        $this->actingAs($administrator)
            ->patchJson("/api/admin/users/{$administrator->id}", ['active' => false])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('active');

        $this->actingAs($administrator)
            ->patchJson("/api/admin/users/{$administrator->id}", ['role' => UserRole::Cashier->value])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');
    }
}
