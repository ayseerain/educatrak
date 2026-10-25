<?php

namespace Tests\Feature;

use App\Models\AuditEntry;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class AuditLogReadTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_auditor_and_super_admin_can_read_filtered_finance_audit_entries(): void
    {
        $actor = User::factory()->create(['role' => UserRole::Cashier, 'full_name' => 'Taylor Sample Cashier', 'username' => 'sample.cashier']);
        $entry = AuditEntry::query()->forceCreate([
            'user_id' => $actor->id,
            'action' => 'payment.recorded',
            'entity_type' => 'payment',
            'entity_id' => 'sample-payment-1',
            'before' => null,
            'after' => ['amount_cents' => 12500, 'receipt_no' => 'OR-SAMPLE-001', 'password' => 'must-not-appear', 'guardian_email' => 'fictional@example.test'],
            'occurred_at' => now(),
        ]);

        $auditor = User::factory()->create(['role' => UserRole::Auditor]);
        $this->actingAs($auditor)->getJson('/api/audit-log?user=sample.cashier&action=payment.recorded&entity_type=payment&entity_id=sample-payment-1')
            ->assertOk()
            ->assertJsonPath('data.0.id', (string) $entry->id)
            ->assertJsonPath('data.0.actor', 'Taylor Sample Cashier')
            ->assertJsonPath('data.0.after.amount_cents', 12500)
            ->assertJsonPath('data.0.after.receipt_no', 'OR-SAMPLE-001')
            ->assertJsonMissingPath('data.0.after.password')
            ->assertJsonMissingPath('data.0.after.guardian_email');

        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $this->actingAs($superAdmin)->getJson('/api/audit-log?user=sample.cashier&action=payment.recorded&entity_type=payment&entity_id=sample-payment-1')
            ->assertOk()
            ->assertJsonPath('data.0.id', (string) $entry->id)
            ->assertJsonMissingPath('data.0.after.password')
            ->assertJsonMissingPath('data.0.after.guardian_email');

        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $this->actingAs($accounting)->getJson('/api/audit-log')->assertForbidden();
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $this->actingAs($cashier)->getJson('/api/audit-log')->assertForbidden();
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $this->actingAs($administrator)->getJson('/api/audit-log')->assertForbidden();
        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $this->actingAs($registrar)->getJson('/api/audit-log')->assertForbidden();
    }

    public function test_audit_date_filters_and_pagination_metadata_are_returned(): void
    {
        $reader = User::factory()->create(['role' => UserRole::Auditor]);
        $entry = AuditEntry::query()->forceCreate([
            'user_id' => $reader->id,
            'action' => 'closeout.submitted',
            'entity_type' => 'close_out',
            'entity_id' => 'sample-closeout-1',
            'occurred_at' => '2026-10-24 10:00:00',
        ]);

        $this->actingAs($reader)->getJson('/api/audit-log?date_from=2026-10-24&date_to=2026-10-24')
            ->assertOk()
            ->assertJsonPath('data.0.id', (string) $entry->id)
            ->assertJsonPath('meta.total', 1);
    }
}
