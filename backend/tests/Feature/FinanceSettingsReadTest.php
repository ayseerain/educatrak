<?php

namespace Tests\Feature;

use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FinanceSettingsReadTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_approved_roles_can_read_persisted_fee_schedules_and_payment_plans(): void
    {
        $schoolYearId = DB::table('school_years')->insertGetId([
            'label' => 'SY sample-current',
            'starts_on' => '2026-06-01',
            'ends_on' => '2027-05-31',
            'is_current' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $gradeId = DB::table('grade_levels')->insertGetId([
            'name' => 'Grade 4',
            'sort_order' => 4,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $scheduleId = DB::table('fee_schedules')->insertGetId([
            'school_year_id' => $schoolYearId,
            'grade_level_id' => $gradeId,
            'name' => 'Grade 4 sample schedule',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('fee_items')->insert([
            'fee_schedule_id' => $scheduleId,
            'name' => 'Tuition (sample)',
            'category' => 'tuition',
            'amount_cents' => 250_000,
            'required' => true,
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $planId = DB::table('payment_plans')->insertGetId([
            'name' => 'Two-part sample plan',
            'down_payment_type' => 'amount',
            'down_payment_value' => 25_000,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('payment_plan_installments')->insert([
            'payment_plan_id' => $planId,
            'label' => 'Second installment',
            'sequence' => 2,
            'due_day_offset' => 90,
            'percent_of_remaining_basis_points' => 10_000,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('payment_plan_installments')->insert([
            'payment_plan_id' => $planId,
            'label' => 'First installment',
            'sequence' => 1,
            'due_day_offset' => 30,
            'percent_of_remaining_basis_points' => 10_000,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ([UserRole::Accounting] as $role) {
            $reader = User::factory()->create(['role' => $role]);

            $this->actingAs($reader)->getJson('/api/settings/finance/fees')
                ->assertOk()
                ->assertJsonPath('data.0.schoolYear', 'SY sample-current')
                ->assertJsonPath('data.0.gradeLevel', 'Grade 4')
                ->assertJsonPath('data.0.items.0.amountCents', 250_000);

            $this->actingAs($reader)->getJson('/api/settings/finance/plans')
                ->assertOk()
                ->assertJsonPath('data.0.name', 'Two-part sample plan')
                ->assertJsonPath('data.0.downPaymentValue', 25_000)
                ->assertJsonPath('data.0.installments.0.label', 'First installment')
                ->assertJsonPath('data.0.installments.1.dueDayOffset', 90);
        }
        $auditor = User::factory()->create(['role' => UserRole::Auditor]);
        $this->actingAs($auditor)->getJson('/api/settings/finance/fees')->assertForbidden();
        $this->actingAs($auditor)->getJson('/api/settings/finance/plans')->assertForbidden();
    }

    public function test_cashier_and_registrar_cannot_read_finance_settings(): void
    {
        foreach ([UserRole::Cashier, UserRole::Registrar] as $role) {
            $user = User::factory()->create(['role' => $role]);

            $this->actingAs($user)->getJson('/api/settings/finance/fees')->assertForbidden();
            $this->actingAs($user)->getJson('/api/settings/finance/plans')->assertForbidden();
        }

        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $this->actingAs($administrator)->getJson('/api/settings/finance/fees')->assertForbidden();
        $this->actingAs($administrator)->getJson('/api/settings/finance/plans')->assertForbidden();
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $this->actingAs($superAdmin)->getJson('/api/settings/finance/fees')->assertForbidden();
        $this->actingAs($superAdmin)->getJson('/api/settings/finance/plans')->assertForbidden();
    }
}
