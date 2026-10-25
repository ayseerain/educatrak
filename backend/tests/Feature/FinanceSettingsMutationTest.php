<?php

namespace Tests\Feature;

use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FinanceSettingsMutationTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_accounting_can_add_revise_and_deactivate_fee_items_without_changing_existing_account_snapshots(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $scheduleId = $this->createFeeSchedule();

        $created = $this->actingAs($accounting)->postJson("/api/settings/finance/fees/{$scheduleId}/items", [
            'name' => 'Tuition (sample)',
            'category' => 'tuition',
            'amount_cents' => 250_000,
            'required' => true,
        ]);
        $created->assertCreated()
            ->assertJsonPath('data.name', 'Tuition (sample)')
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.active', true);
        $originalId = (int) $created->json('data.id');
        $billingAccountId = $this->createBillingAccountWithFeeSnapshot($accounting, $scheduleId, $originalId);

        $revised = $this->actingAs($accounting)->patchJson("/api/settings/finance/fee-items/{$originalId}", [
            'name' => 'Tuition revised (sample)',
            'category' => 'tuition',
            'amount_cents' => 300_000,
            'required' => false,
        ]);
        $revised->assertOk()
            ->assertJsonPath('data.name', 'Tuition revised (sample)')
            ->assertJsonPath('data.version', 2)
            ->assertJsonPath('data.previousVersionId', (string) $originalId)
            ->assertJsonPath('data.active', true);
        $revisedId = (int) $revised->json('data.id');

        $this->assertDatabaseHas('fee_items', [
            'id' => $originalId,
            'name' => 'Tuition (sample)',
            'amount_cents' => 250_000,
            'required' => true,
            'active' => false,
            'version' => 1,
        ]);
        $this->assertDatabaseHas('billing_account_items', [
            'billing_account_id' => $billingAccountId,
            'fee_item_id' => $originalId,
            'name' => 'Tuition (sample)',
            'amount_cents' => 250_000,
        ]);
        $this->actingAs($accounting)->getJson("/api/billing-accounts/{$billingAccountId}")
            ->assertOk()
            ->assertJsonPath('data.items.0.name', 'Tuition (sample)')
            ->assertJsonPath('data.items.0.amountCents', 250_000)
            ->assertJsonPath('data.items.0.required', true);

        $this->actingAs($accounting)->postJson("/api/settings/finance/fee-items/{$revisedId}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.active', false)
            ->assertJsonPath('data.version', 2);

        $this->assertDatabaseHas('fee_items', ['id' => $revisedId, 'active' => false]);
        $this->assertDatabaseHas('audit_entries', ['action' => 'finance.fee_item.created', 'entity_id' => (string) $originalId]);
        $this->assertDatabaseHas('audit_entries', ['action' => 'finance.fee_item.revised', 'entity_id' => (string) $revisedId]);
        $this->assertDatabaseHas('audit_entries', ['action' => 'finance.fee_item.deactivated', 'entity_id' => (string) $revisedId]);
    }

    public function test_only_accounting_can_mutate_fee_items_and_input_uses_the_approved_categories(): void
    {
        $scheduleId = $this->createFeeSchedule();
        $feeItemId = DB::table('fee_items')->insertGetId([
            'fee_schedule_id' => $scheduleId,
            'name' => 'Materials (sample)',
            'category' => 'other',
            'amount_cents' => 1_000,
            'required' => false,
            'sort_order' => 1,
            'active' => true,
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ([UserRole::SuperAdmin, UserRole::Admin, UserRole::Cashier, UserRole::Auditor, UserRole::Registrar] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->postJson("/api/settings/finance/fees/{$scheduleId}/items", [
                'name' => 'Forbidden (sample)',
                'category' => 'other',
                'amount_cents' => 100,
                'required' => true,
            ])->assertForbidden();
            $this->actingAs($user)->patchJson("/api/settings/finance/fee-items/{$feeItemId}", [
                'name' => 'Forbidden (sample)',
                'category' => 'other',
                'amount_cents' => 100,
                'required' => true,
            ])->assertForbidden();
            $this->actingAs($user)->postJson("/api/settings/finance/fee-items/{$feeItemId}/deactivate")->assertForbidden();
        }

        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $this->actingAs($accounting)->postJson("/api/settings/finance/fees/{$scheduleId}/items", [
            'name' => 'Invalid category (sample)',
            'category' => 'discount',
            'amount_cents' => 100,
            'required' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors('category');
    }

    private function createFeeSchedule(): int
    {
        $schoolYearId = DB::table('school_years')->insertGetId([
            'label' => 'SY fee-change sample',
            'starts_on' => '2026-06-01',
            'ends_on' => '2027-05-31',
            'is_current' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $gradeId = DB::table('grade_levels')->insertGetId([
            'name' => 'Grade 5',
            'sort_order' => 5,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('fee_schedules')->insertGetId([
            'school_year_id' => $schoolYearId,
            'grade_level_id' => $gradeId,
            'name' => 'Grade 5 sample schedule',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createBillingAccountWithFeeSnapshot(User $accounting, int $scheduleId, int $feeItemId): int
    {
        $schoolYearId = DB::table('fee_schedules')->where('id', $scheduleId)->value('school_year_id');
        $studentId = DB::table('students')->insertGetId([
            'student_no' => 'SAMPLE-FEE-5001',
            'full_name' => 'Jordan Sample Student',
            'status' => 'enrolled',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $accountId = DB::table('billing_accounts')->insertGetId([
            'student_id' => $studentId,
            'school_year_id' => $schoolYearId,
            'fee_schedule_id' => $scheduleId,
            'status' => 'current',
            'total_due_cents' => 250_000,
            'total_paid_cents' => 0,
            'balance_cents' => 250_000,
            'created_by' => $accounting->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('billing_account_items')->insert([
            'billing_account_id' => $accountId,
            'fee_item_id' => $feeItemId,
            'name' => 'Tuition (sample)',
            'category' => 'tuition',
            'amount_cents' => 250_000,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $accountId;
    }
}
