<?php

namespace Tests\Feature;

use App\Models\AuditEntry;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Artisan;
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

    public function test_administrator_cannot_create_or_promote_an_accounting_officer_without_approved_assignment_policy(): void
    {
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);

        $this->actingAs($administrator)
            ->postJson('/api/admin/users', [
                'username' => 'fictional.accounting',
                'full_name' => 'Avery Accounting (sample)',
                'email' => 'avery.accounting@example.test',
                'role' => UserRole::Accounting->value,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        $this->actingAs($administrator)
            ->patchJson("/api/admin/users/{$cashier->id}", ['role' => UserRole::Accounting->value])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');
    }

    public function test_super_admin_can_create_administrators_but_cannot_enter_payment_workflows(): void
    {
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $administrator = User::factory()->create(['role' => UserRole::Admin]);

        $this->actingAs($administrator)
            ->postJson('/api/admin/users', [
                'username' => 'fictional.newadmin',
                'full_name' => 'Jordan Administrator (sample)',
                'role' => UserRole::Admin->value,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        $this->actingAs($superAdmin)
            ->postJson('/api/admin/users', [
                'username' => 'fictional.newadmin',
                'full_name' => 'Jordan Administrator (sample)',
                'role' => UserRole::Admin->value,
            ])
            ->assertCreated()
            ->assertJsonPath('data.role', UserRole::Admin->value);

        $this->actingAs($superAdmin)->postJson('/api/payments', [])->assertForbidden();
        $this->actingAs($superAdmin)->getJson('/api/audit-log')->assertOk();
        $this->actingAs($superAdmin)->getJson('/api/admin/security-events')->assertOk();
    }

    public function test_protected_bootstrap_super_admin_is_hidden_from_administrator_and_cannot_be_changed(): void
    {
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $protected = User::factory()->create(['role' => UserRole::SuperAdmin, 'is_protected' => true]);

        $this->actingAs($administrator)
            ->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonMissing(['username' => $protected->username]);

        $this->actingAs($administrator)->patchJson("/api/admin/users/{$protected->id}", ['active' => false])->assertForbidden();
        $this->actingAs($administrator)->postJson("/api/admin/users/{$protected->id}/reset-password")->assertForbidden();
        $this->actingAs($protected)->patchJson("/api/admin/users/{$protected->id}", ['active' => false])->assertForbidden();
    }

    public function test_non_administrators_cannot_access_administrator_or_security_endpoints(): void
    {
        $target = User::factory()->create(['role' => UserRole::Cashier]);
        foreach ([UserRole::Cashier, UserRole::Accounting, UserRole::Auditor, UserRole::Registrar] as $role) {
            $user = User::factory()->create(['role' => $role]);

            $this->actingAs($user)->getJson('/api/admin/users')->assertForbidden();
            $this->actingAs($user)->postJson('/api/admin/users', [])->assertForbidden();
            $this->actingAs($user)->patchJson("/api/admin/users/{$target->id}", [])->assertForbidden();
            $this->actingAs($user)->postJson("/api/admin/users/{$target->id}/reset-password", [])->assertForbidden();
            $this->actingAs($user)->getJson('/api/admin/security-events')->assertForbidden();
        }
    }

    public function test_administrator_security_log_returns_account_identity_and_excludes_password_fields(): void
    {
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $cashier = User::factory()->create([
            'username' => 'fictional.cashier',
            'full_name' => 'Casey Cashier (sample)',
            'role' => UserRole::Cashier,
        ]);
        AuditEntry::query()->forceCreate([
            'user_id' => $administrator->id,
            'action' => 'user.updated',
            'entity_type' => $cashier->getMorphClass(),
            'entity_id' => (string) $cashier->id,
            'before' => ['active' => true],
            'after' => [
                'username' => $cashier->username,
                'fullName' => $cashier->full_name,
                'role' => 'cashier',
                'active' => true,
                'password' => 'fictional-secret-marker',
                'guardian_email' => 'fictional.guardian@example.test',
            ],
            'occurred_at' => now(),
        ]);

        $this->actingAs($administrator)->getJson('/api/admin/security-events')
            ->assertOk()
            ->assertJsonPath('data.0.account', 'fictional.cashier')
            ->assertJsonPath('data.0.accountName', 'Casey Cashier (sample)')
            ->assertJsonPath('data.0.actorName', $administrator->full_name)
            ->assertJsonMissingPath('data.0.details.password')
            ->assertJsonMissingPath('data.0.details.guardian_email')
            ->assertJsonPath('data.0.details.username', $cashier->username)
            ->assertJsonPath('data.0.details.role', UserRole::Cashier->value);
    }

    public function test_security_log_rejects_nested_values_in_safe_metadata_fields(): void
    {
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $cashier = User::factory()->create([
            'username' => 'fictional.cashier',
            'full_name' => 'Casey Cashier (sample)',
            'role' => UserRole::Cashier,
        ]);
        AuditEntry::query()->forceCreate([
            'user_id' => $administrator->id,
            'action' => 'user.updated',
            'entity_type' => $cashier->getMorphClass(),
            'entity_id' => (string) $cashier->id,
            'after' => [
                'username' => ['password' => 'fictional-nested-secret'],
                'fullName' => ['email' => 'fictional.private@example.test'],
                'role' => ['internal' => 'must-not-appear'],
                'active' => ['debug' => true],
            ],
            'occurred_at' => now(),
        ]);

        $this->actingAs($administrator)->getJson('/api/admin/security-events')
            ->assertOk()
            ->assertJsonPath('data.0.account', $cashier->username)
            ->assertJsonPath('data.0.accountName', $cashier->full_name)
            ->assertJsonMissingPath('data.0.details.username')
            ->assertJsonMissingPath('data.0.details.fullName')
            ->assertJsonMissingPath('data.0.details.role')
            ->assertJsonMissingPath('data.0.details.active');
    }

    public function test_administrator_security_log_filters_by_user_action_and_manila_date(): void
    {
        $administrator = User::factory()->create(['role' => UserRole::Admin, 'username' => 'fictional.admin']);
        $cashier = User::factory()->create(['role' => UserRole::Cashier, 'username' => 'fictional.cashier']);
        $matching = AuditEntry::query()->forceCreate([
            'user_id' => $administrator->id,
            'action' => 'user.updated',
            'entity_type' => $cashier->getMorphClass(),
            'entity_id' => (string) $cashier->id,
            'after' => ['username' => $cashier->username],
            'occurred_at' => '2026-10-24 16:00:00',
        ]);
        AuditEntry::query()->forceCreate([
            'user_id' => $administrator->id,
            'action' => 'user.updated',
            'entity_type' => $cashier->getMorphClass(),
            'entity_id' => (string) $cashier->id,
            'after' => ['username' => $cashier->username],
            'occurred_at' => '2026-10-25 16:00:00',
        ]);
        AuditEntry::query()->forceCreate([
            'user_id' => $administrator->id,
            'action' => 'user.password_reset',
            'entity_type' => $cashier->getMorphClass(),
            'entity_id' => (string) $cashier->id,
            'after' => ['username' => $cashier->username],
            'occurred_at' => '2026-10-24 16:00:00',
        ]);

        $this->actingAs($administrator)
            ->getJson('/api/admin/security-events?user=fictional.cashier&action=user.updated&date_from=2026-10-25&date_to=2026-10-25')
            ->assertOk()
            ->assertJsonPath('data.0.id', (string) $matching->id)
            ->assertJsonPath('data.0.actorName', $administrator->full_name)
            ->assertJsonPath('meta.total', 1);

        $this->actingAs($administrator)
            ->getJson('/api/admin/security-events?user=fictional.admin&action=user.updated&date_from=2026-10-25&date_to=2026-10-25')
            ->assertOk()
            ->assertJsonPath('data.0.id', (string) $matching->id)
            ->assertJsonPath('meta.total', 1);
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

    public function test_administrator_can_archive_and_restore_an_account_during_the_configured_retention_period(): void
    {
        config(['services.user_archive.retention_days' => 30]);
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);

        $this->actingAs($administrator)->postJson("/api/admin/users/{$cashier->id}/archive")
            ->assertOk()
            ->assertJsonPath('data.active', false)
            ->assertJsonPath('data.archivedBy', $administrator->full_name);
        $cashier->refresh();
        $this->assertNotNull($cashier->archived_at);
        $this->assertSame($administrator->id, $cashier->archived_by);
        $this->assertEqualsWithDelta(30, now()->diffInDays($cashier->anonymize_at), 0.001);
        $this->assertDatabaseHas('audit_entries', ['action' => 'user.archived', 'entity_id' => (string) $cashier->id]);
        $this->actingAs($cashier)->getJson('/api/auth/me')->assertUnauthorized();

        $this->actingAs($administrator)->getJson('/api/admin/users?status=archived')
            ->assertOk()
            ->assertJsonPath('data.0.id', (string) $cashier->id)
            ->assertJsonPath('data.0.archivedBy', $administrator->full_name)
            ->assertJsonPath('data.0.anonymizeAt', $cashier->anonymize_at->toISOString());

        $this->actingAs($administrator)->postJson("/api/admin/users/{$cashier->id}/restore")
            ->assertOk()
            ->assertJsonPath('data.active', true)
            ->assertJsonPath('data.archivedAt', null);
        $cashier->refresh();
        $this->assertNull($cashier->archived_at);
        $this->assertNull($cashier->anonymize_at);
        $this->assertDatabaseHas('audit_entries', ['action' => 'user.restored', 'entity_id' => (string) $cashier->id]);
    }

    public function test_archiving_protects_super_admin_self_and_last_active_administrator(): void
    {
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $protected = User::factory()->create(['role' => UserRole::SuperAdmin, 'is_protected' => true]);
        $secondAdministrator = User::factory()->create(['role' => UserRole::Admin]);

        $this->actingAs($administrator)->postJson("/api/admin/users/{$protected->id}/archive")->assertForbidden();
        $this->actingAs($administrator)->postJson("/api/admin/users/{$administrator->id}/archive")->assertUnprocessable()->assertJsonValidationErrors('user');
        $this->actingAs($administrator)->postJson("/api/admin/users/{$secondAdministrator->id}/archive")->assertOk();
        $this->actingAs($administrator)->postJson("/api/admin/users/{$administrator->id}/archive")->assertUnprocessable();
    }

    public function test_expired_archives_are_anonymized_without_deleting_linked_audit_history(): void
    {
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $archived = User::factory()->create([
            'username' => 'fictional.archived',
            'full_name' => 'Taylor Archived (sample)',
            'email' => 'taylor.archived@example.test',
            'role' => UserRole::Cashier,
            'active' => false,
            'archived_at' => now()->subDays(31),
            'archived_by' => $administrator->id,
            'anonymize_at' => now()->subDay(),
        ]);
        $entry = AuditEntry::query()->forceCreate([
            'user_id' => $administrator->id,
            'action' => 'user.archived',
            'entity_type' => $archived->getMorphClass(),
            'entity_id' => (string) $archived->id,
            'before' => ['username' => $archived->username, 'fullName' => $archived->full_name, 'email' => $archived->email],
            'after' => ['username' => $archived->username, 'fullName' => $archived->full_name],
            'occurred_at' => now()->subDays(31),
        ]);

        Artisan::call('educatrak:anonymize-expired-user-archives');

        $archived->refresh();
        $entry->refresh();
        $this->assertSame('archived-' . $archived->id, $archived->username);
        $this->assertSame('Archived account ' . $archived->id, $archived->full_name);
        $this->assertNull($archived->email);
        $this->assertFalse($archived->active);
        $this->assertSame((string) $archived->id, $entry->entity_id);
        $this->assertSame($archived->username, $entry->before['username']);
        $this->assertNull($entry->before['email']);
        $this->assertDatabaseHas('users', ['id' => $archived->id, 'username' => $archived->username]);
        $this->actingAs($administrator)->postJson("/api/admin/users/{$archived->id}/restore")
            ->assertUnprocessable()->assertJsonValidationErrors('user');
    }
}
