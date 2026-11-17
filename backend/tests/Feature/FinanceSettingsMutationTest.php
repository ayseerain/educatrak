<?php

namespace Tests\Feature;

use App\Models\SystemSetting;
use App\Models\User;
use App\UserRole;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FinanceSettingsMutationTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_accounting_synchronizes_new_fees_while_preserving_existing_account_fee_snapshots_on_revision(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $scheduleId = $this->createFeeSchedule();
        $originalId = DB::table('fee_items')->insertGetId([
            'fee_schedule_id' => $scheduleId,
            'name' => 'Tuition (sample)',
            'category' => 'tuition',
            'amount_cents' => 250_000,
            'required' => true,
            'sort_order' => 1,
            'active' => true,
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $billingAccountId = $this->createBillingAccountWithFeeSnapshot($accounting, $scheduleId, $originalId);

        $created = $this->actingAs($accounting)->postJson("/api/settings/finance/fees/{$scheduleId}/items", [
            'name' => 'Laboratory (sample)',
            'category' => 'other',
            'amount_cents' => 50_000,
            'required' => true,
        ]);
        $created->assertCreated()
            ->assertJsonPath('data.name', 'Laboratory (sample)')
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.active', true)
            ->assertJsonPath('data.updatedAccountCount', 1);
        $laboratoryId = (int) $created->json('data.id');

        $this->assertDatabaseHas('billing_account_items', [
            'billing_account_id' => $billingAccountId,
            'fee_item_id' => $laboratoryId,
            'name' => 'Laboratory (sample)',
            'amount_cents' => 50_000,
        ]);
        $this->assertDatabaseHas('billing_accounts', [
            'id' => $billingAccountId,
            'total_due_cents' => 300_000,
            'balance_cents' => 300_000,
        ]);
        $this->assertDatabaseCount('billing_account_items', 2);
        $this->assertDatabaseHas('installments', [
            'billing_account_id' => $billingAccountId,
            'label' => 'Fee: Laboratory (sample)',
            'sequence' => 1,
            'amount_cents' => 50_000,
            'paid_cents' => 0,
            'status' => 'due_soon',
        ]);

        $this->actingAs($accounting)->postJson("/api/settings/finance/fees/{$scheduleId}/items", [
            'name' => 'laboratory (SAMPLE)',
            'category' => 'other',
            'amount_cents' => 50_000,
            'required' => true,
        ])->assertUnprocessable();
        $this->assertDatabaseCount('billing_account_items', 2);

        $revised = $this->actingAs($accounting)->patchJson("/api/settings/finance/fee-items/{$laboratoryId}", [
            'name' => 'Tuition revised (sample)',
            'category' => 'tuition',
            'amount_cents' => 300_000,
            'required' => false,
        ]);
        $revised->assertOk()
            ->assertJsonPath('data.name', 'Tuition revised (sample)')
            ->assertJsonPath('data.version', 2)
            ->assertJsonPath('data.previousVersionId', (string) $laboratoryId)
            ->assertJsonPath('data.active', true);
        $revisedId = (int) $revised->json('data.id');

        $this->assertDatabaseHas('fee_items', [
            'id' => $laboratoryId,
            'name' => 'Laboratory (sample)',
            'amount_cents' => 50_000,
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
        $this->assertDatabaseHas('billing_account_items', [
            'billing_account_id' => $billingAccountId,
            'fee_item_id' => $laboratoryId,
            'name' => 'Laboratory (sample)',
            'amount_cents' => 50_000,
        ]);
        $this->actingAs($accounting)->getJson("/api/billing-accounts/{$billingAccountId}")
            ->assertOk()
            ->assertJsonPath('data.totalDueCents', 300_000);
        $this->assertDatabaseHas('billing_accounts', [
            'id' => $billingAccountId,
            'total_due_cents' => 300_000,
            'balance_cents' => 300_000,
        ]);
        $this->assertDatabaseCount('billing_account_items', 2);
        $this->assertDatabaseCount('installments', 1);

        $this->actingAs($accounting)->postJson("/api/settings/finance/fee-items/{$revisedId}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.active', false)
            ->assertJsonPath('data.version', 2);

        $this->assertDatabaseHas('fee_items', ['id' => $revisedId, 'active' => false]);
        $this->assertDatabaseHas('audit_entries', ['action' => 'finance.fee_item.created', 'entity_id' => (string) $laboratoryId]);
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

    public function test_accounting_can_deactivate_an_active_fee_item_contract(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $scheduleId = $this->createFeeSchedule();
        $feeItemId = DB::table('fee_items')->insertGetId([
            'fee_schedule_id' => $scheduleId, 'name' => 'Library (sample)', 'category' => 'other', 'amount_cents' => 1_500,
            'required' => false, 'sort_order' => 1, 'active' => true, 'version' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->actingAs($accounting)->postJson("/api/settings/finance/fee-items/{$feeItemId}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.id', (string) $feeItemId)
            ->assertJsonPath('data.active', false)
            ->assertJsonPath('data.version', 1);

        $this->assertDatabaseHas('fee_items', ['id' => $feeItemId, 'active' => false]);
        $this->assertDatabaseHas('audit_entries', ['action' => 'finance.fee_item.deactivated', 'entity_id' => (string) $feeItemId]);
        $this->actingAs($accounting)->postJson("/api/settings/finance/fee-items/{$feeItemId}/deactivate")->assertConflict();
    }

    public function test_fee_addition_recalculates_a_paid_account_and_same_day_installment_status(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-13 10:00:00', 'Asia/Manila'));

        try {
            $accounting = User::factory()->create(['role' => UserRole::Accounting]);
            $scheduleId = $this->createFeeSchedule();
            $billingAccountId = $this->createBillingAccountWithFeeSnapshot($accounting, $scheduleId, null);
            DB::table('billing_accounts')->where('id', $billingAccountId)->update(['status' => 'paid']);
            SystemSetting::query()->create(['key' => 'billing.due_soon_days', 'value' => 0]);

            $this->actingAs($accounting)->postJson("/api/settings/finance/fees/{$scheduleId}/items", [
                'name' => 'Same Day Fee (sample)',
                'category' => 'other',
                'amount_cents' => 2_500,
                'required' => true,
            ])->assertCreated()->assertJsonPath('data.updatedAccountCount', 1);

            $this->assertDatabaseHas('billing_accounts', [
                'id' => $billingAccountId,
                'total_due_cents' => 2_500,
                'balance_cents' => 2_500,
                'status' => 'due_soon',
            ]);
            $this->assertDatabaseHas('installments', [
                'billing_account_id' => $billingAccountId,
                'label' => 'Fee: Same Day Fee (sample)',
                'amount_cents' => 2_500,
                'paid_cents' => 0,
                'status' => 'due_soon',
            ]);
            $dueDate = DB::table('installments')
                ->where('billing_account_id', $billingAccountId)
                ->where('label', 'Fee: Same Day Fee (sample)')
                ->value('due_date');
            $this->assertSame('2026-11-13', Carbon::parse((string) $dueDate, 'Asia/Manila')->toDateString());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_accounting_can_apply_new_and_revised_fees_to_all_grade_schedules_without_duplicates(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $scheduleId = $this->createFeeSchedule();
        $schoolYearId = DB::table('fee_schedules')->where('id', $scheduleId)->value('school_year_id');
        $secondGradeId = DB::table('grade_levels')->insertGetId([
            'name' => 'Grade 6', 'sort_order' => 6, 'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $secondScheduleId = DB::table('fee_schedules')->insertGetId([
            'school_year_id' => $schoolYearId, 'grade_level_id' => $secondGradeId, 'name' => 'Grade 6 sample schedule', 'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $firstAccountId = $this->createBillingAccountWithFeeSnapshot($accounting, $scheduleId, null);
        $secondAccountId = $this->createBillingAccountWithFeeSnapshot($accounting, $secondScheduleId, null);

        $created = $this->actingAs($accounting)->postJson("/api/settings/finance/fees/{$scheduleId}/items", [
            'name' => 'Materials (sample)', 'category' => 'other', 'amount_cents' => 1_000, 'required' => false, 'apply_to_all' => true,
        ])->assertCreated();
        $created->assertJsonPath('data.updatedAccountCount', 2);

        $this->assertDatabaseCount('fee_items', 2);
        $this->assertDatabaseHas('billing_account_items', ['billing_account_id' => $firstAccountId, 'name' => 'Materials (sample)', 'amount_cents' => 1_000]);
        $this->assertDatabaseHas('billing_account_items', ['billing_account_id' => $secondAccountId, 'name' => 'Materials (sample)', 'amount_cents' => 1_000]);
        $this->assertDatabaseCount('installments', 2);
        $this->actingAs($accounting)->postJson("/api/settings/finance/fees/{$scheduleId}/items", [
            'name' => 'materials (SAMPLE)', 'category' => 'other', 'amount_cents' => 1_000, 'required' => false, 'apply_to_all' => true,
        ])->assertUnprocessable();
        $this->assertDatabaseCount('fee_items', 2);

        $this->actingAs($accounting)->patchJson('/api/settings/finance/fee-items/'.$created->json('data.id'), [
            'name' => 'Materials revised (sample)', 'category' => 'other', 'amount_cents' => 1_500, 'required' => true, 'apply_to_all' => true,
        ])->assertOk();

        $this->assertDatabaseCount('fee_items', 4);
        $this->assertSame(2, DB::table('fee_items')->where('name', 'Materials revised (sample)')->where('active', true)->count());
        $this->assertDatabaseCount('billing_account_items', 2);
        $this->assertDatabaseCount('installments', 2);
    }

    public function test_all_grade_revision_synchronizes_a_fee_to_existing_accounts_only_for_schedules_missing_it(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $scheduleId = $this->createFeeSchedule();
        $schoolYearId = DB::table('fee_schedules')->where('id', $scheduleId)->value('school_year_id');
        $secondGradeId = DB::table('grade_levels')->insertGetId([
            'name' => 'Grade 7', 'sort_order' => 7, 'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $secondScheduleId = DB::table('fee_schedules')->insertGetId([
            'school_year_id' => $schoolYearId, 'grade_level_id' => $secondGradeId, 'name' => 'Grade 7 sample schedule', 'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $firstAccountId = $this->createBillingAccountWithFeeSnapshot($accounting, $scheduleId, null);
        $secondAccountId = $this->createBillingAccountWithFeeSnapshot($accounting, $secondScheduleId, null);

        $created = $this->actingAs($accounting)->postJson("/api/settings/finance/fees/{$scheduleId}/items", [
            'name' => 'Technology (sample)', 'category' => 'other', 'amount_cents' => 2_000, 'required' => false,
        ])->assertCreated();
        $created->assertJsonPath('data.updatedAccountCount', 1);

        $this->actingAs($accounting)->patchJson('/api/settings/finance/fee-items/'.$created->json('data.id'), [
            'name' => 'Technology revised (sample)', 'category' => 'other', 'amount_cents' => 2_500, 'required' => true, 'apply_to_all' => true,
        ])->assertOk()->assertJsonPath('data.updatedAccountCount', 1);

        $this->assertDatabaseHas('billing_account_items', ['billing_account_id' => $firstAccountId, 'name' => 'Technology (sample)', 'amount_cents' => 2_000]);
        $this->assertDatabaseMissing('billing_account_items', ['billing_account_id' => $firstAccountId, 'name' => 'Technology revised (sample)']);
        $this->assertDatabaseHas('billing_account_items', ['billing_account_id' => $secondAccountId, 'name' => 'Technology revised (sample)', 'amount_cents' => 2_500]);
        $this->assertDatabaseHas('billing_accounts', ['id' => $firstAccountId, 'total_due_cents' => 2_000, 'balance_cents' => 2_000]);
        $this->assertDatabaseHas('billing_accounts', ['id' => $secondAccountId, 'total_due_cents' => 2_500, 'balance_cents' => 2_500]);
        $this->assertDatabaseCount('installments', 2);
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

    private function createBillingAccountWithFeeSnapshot(User $accounting, int $scheduleId, ?int $feeItemId): int
    {
        $schoolYearId = DB::table('fee_schedules')->where('id', $scheduleId)->value('school_year_id');
        $studentId = DB::table('students')->insertGetId([
            'lrn' => '700'.str_pad((string) $scheduleId, 9, '0', STR_PAD_LEFT),
            'full_name' => 'Jordan Sample Student',
            'status' => 'enrolled',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $initialAmountCents = $feeItemId === null ? 0 : 250_000;
        $accountId = DB::table('billing_accounts')->insertGetId([
            'student_id' => $studentId,
            'school_year_id' => $schoolYearId,
            'fee_schedule_id' => $scheduleId,
            'status' => 'current',
            'total_due_cents' => $initialAmountCents,
            'total_paid_cents' => 0,
            'balance_cents' => $initialAmountCents,
            'created_by' => $accounting->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        if ($feeItemId !== null) {
            DB::table('billing_account_items')->insert([
                'billing_account_id' => $accountId,
                'fee_item_id' => $feeItemId,
                'name' => 'Tuition (sample)',
                'category' => 'tuition',
                'amount_cents' => 250_000,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $accountId;
    }
}
