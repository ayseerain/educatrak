<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AuditLogger;
use App\UserRole;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

class BillingAccountCreationTest extends TestCase
{
    use LazilyRefreshDatabase;

    /** @var array{year: int, grade: int, student: int, schedule: int, tuition: int, laboratory: int, inactive: int, plan: int} */
    private array $ids;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-20 10:00:00', 'Asia/Manila'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_cashier_creates_an_account_with_fee_snapshots_and_an_exact_installment_schedule(): void
    {
        $this->seedConfiguration();
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);

        $response = $this->actingAs($cashier)->postJson('/api/billing-accounts', $this->payload(['excluded_fee_item_ids' => [$this->ids['laboratory']]]));

        $response->assertCreated()
            ->assertJsonPath('data.studentId', (string) $this->ids['student'])
            ->assertJsonPath('data.totalDueCents', 1_000_001)
            ->assertJsonPath('data.totalPaidCents', 0)
            ->assertJsonPath('data.balanceCents', 1_000_001)
            ->assertJsonPath('data.status', 'due_soon')
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.name', 'Tuition (sample)')
            ->assertJsonPath('data.items.0.required', true)
            ->assertJsonCount(4, 'data.installments')
            ->assertJsonPath('data.installments.0.label', 'Down payment')
            ->assertJsonPath('data.installments.0.dueDate', '2026-11-20')
            ->assertJsonPath('data.installments.0.amountCents', 150_000)
            ->assertJsonPath('data.installments.0.status', 'due_soon')
            ->assertJsonPath('data.installments.1.amountCents', 283_305)
            ->assertJsonPath('data.installments.1.dueDate', '2026-12-20')
            ->assertJsonPath('data.installments.2.amountCents', 283_305)
            ->assertJsonPath('data.installments.3.amountCents', 283_391)
            ->assertJsonPath('data.installments.3.dueDate', '2027-02-18')
            ->assertJsonPath('data.installments.3.status', 'current');

        $accountId = (int) $response->json('data.id');
        $this->assertDatabaseHas('billing_accounts', [
            'id' => $accountId,
            'fee_schedule_id' => $this->ids['schedule'],
            'payment_plan_id' => $this->ids['plan'],
            'created_by' => $cashier->id,
        ]);
        $this->assertDatabaseHas('billing_account_items', ['billing_account_id' => $accountId, 'fee_item_id' => $this->ids['tuition'], 'amount_cents' => 1_000_001]);
        $this->assertDatabaseMissing('billing_account_items', ['fee_item_id' => $this->ids['laboratory']]);
        $this->assertDatabaseMissing('billing_account_items', ['fee_item_id' => $this->ids['inactive']]);
        $this->assertSame(1_000_001, (int) DB::table('installments')->where('billing_account_id', $accountId)->sum('amount_cents'));

        $audit = DB::table('audit_entries')->where('action', 'billing_account.created')->sole();
        $after = json_decode($audit->after, true);
        $this->assertSame((string) $accountId, $audit->entity_id);
        $this->assertSame(1_000_001, $after['total_due_cents']);
        $this->assertSame([$this->ids['laboratory']], $after['excluded_fee_item_ids']);
        $this->assertSame(1, $after['payment_plan_version']);
    }

    public function test_optional_fees_are_included_unless_removed_and_rounding_lands_on_the_last_installment(): void
    {
        $this->seedConfiguration();
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);

        $this->actingAs($cashier)->postJson('/api/billing-accounts', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.totalDueCents', 1_050_001)
            ->assertJsonCount(2, 'data.items')
            ->assertJsonPath('data.installments.0.amountCents', 157_500)
            ->assertJsonPath('data.installments.1.amountCents', 297_470)
            ->assertJsonPath('data.installments.2.amountCents', 297_470)
            ->assertJsonPath('data.installments.3.amountCents', 297_561);
    }

    public function test_duplicate_account_and_invalid_fee_removals_are_rejected(): void
    {
        $this->seedConfiguration();
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);

        $this->actingAs($cashier)->postJson('/api/billing-accounts', $this->payload(['excluded_fee_item_ids' => [$this->ids['tuition']]]))
            ->assertUnprocessable()->assertJsonValidationErrors('excluded_fee_item_ids')->assertJsonStructure(['message', 'errors']);
        $this->actingAs($cashier)->postJson('/api/billing-accounts', $this->payload(['excluded_fee_item_ids' => [$this->ids['inactive']]]))
            ->assertUnprocessable()->assertJsonValidationErrors('excluded_fee_item_ids');

        $this->actingAs($cashier)->postJson('/api/billing-accounts', $this->payload())->assertCreated();
        $this->actingAs($cashier)->postJson('/api/billing-accounts', $this->payload())
            ->assertUnprocessable()->assertJsonValidationErrors('student_id');

        $this->assertDatabaseCount('billing_accounts', 1);
    }

    public function test_inactive_student_non_current_year_inactive_plan_and_ambiguous_schedules_are_rejected(): void
    {
        $this->seedConfiguration();
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);

        DB::table('students')->where('id', $this->ids['student'])->update(['status' => 'inactive']);
        $this->actingAs($cashier)->postJson('/api/billing-accounts', $this->payload())->assertUnprocessable()->assertJsonValidationErrors('student_id');
        DB::table('students')->where('id', $this->ids['student'])->update(['status' => 'enrolled']);

        DB::table('school_years')->where('id', $this->ids['year'])->update(['is_current' => false]);
        $this->actingAs($cashier)->postJson('/api/billing-accounts', $this->payload())->assertUnprocessable()->assertJsonValidationErrors('school_year_id');
        DB::table('school_years')->where('id', $this->ids['year'])->update(['is_current' => true]);

        DB::table('payment_plans')->where('id', $this->ids['plan'])->update(['active' => false]);
        $this->actingAs($cashier)->postJson('/api/billing-accounts', $this->payload())->assertUnprocessable()->assertJsonValidationErrors('payment_plan_id');
        DB::table('payment_plans')->where('id', $this->ids['plan'])->update(['active' => true]);

        DB::table('fee_schedules')->insert(['school_year_id' => $this->ids['year'], 'grade_level_id' => $this->ids['grade'], 'name' => 'Second schedule (sample)', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->actingAs($cashier)->postJson('/api/billing-accounts', $this->payload())->assertUnprocessable()->assertJsonValidationErrors('fee_schedule');

        DB::table('fee_schedules')->update(['active' => false]);
        $this->actingAs($cashier)->postJson('/api/billing-accounts', $this->payload())->assertUnprocessable()->assertJsonValidationErrors('fee_schedule');

        $this->assertDatabaseCount('billing_accounts', 0);
    }

    public function test_preview_returns_the_schedule_without_writing(): void
    {
        $this->seedConfiguration();
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);

        $this->actingAs($cashier)->postJson('/api/billing-accounts/preview', $this->payload(['excluded_fee_item_ids' => [$this->ids['laboratory']]]))
            ->assertOk()
            ->assertJsonPath('data.totalDueCents', 1_000_001)
            ->assertJsonPath('data.items.0.required', true)
            ->assertJsonPath('data.installments.3.amountCents', 283_391)
            ->assertJsonPath('data.paymentPlanVersion', 1);

        $this->assertDatabaseCount('billing_accounts', 0);
        $this->assertDatabaseCount('installments', 0);
        $this->assertDatabaseCount('audit_entries', 0);
    }

    public function test_account_creation_rolls_back_when_audit_recording_fails(): void
    {
        $this->seedConfiguration();
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $this->mock(AuditLogger::class, function (MockInterface $mock): void {
            $mock->shouldReceive('record')->once()->andThrow(new RuntimeException('Audit storage failed.'));
        });

        $this->actingAs($cashier)->postJson('/api/billing-accounts', $this->payload())->assertInternalServerError();

        $this->assertDatabaseCount('billing_accounts', 0);
        $this->assertDatabaseCount('billing_account_items', 0);
        $this->assertDatabaseCount('installments', 0);
    }

    public function test_only_cashier_can_create_or_preview_accounts(): void
    {
        $this->seedConfiguration();

        foreach ([UserRole::Accounting, UserRole::Registrar, UserRole::Admin, UserRole::Auditor, UserRole::SuperAdmin] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->postJson('/api/billing-accounts', $this->payload())->assertForbidden();
            $this->actingAs($user)->postJson('/api/billing-accounts/preview', $this->payload())->assertForbidden();
            $this->actingAs($user)->getJson('/api/billing-accounts/creation-options')->assertForbidden();
        }

        $this->assertDatabaseCount('billing_accounts', 0);
    }

    public function test_creation_options_list_the_current_year_and_only_active_plans(): void
    {
        $this->seedConfiguration();
        $now = now();
        DB::table('school_years')->insert(['label' => 'SY 2025-2026 (sample)', 'is_current' => false, 'starts_on' => '2025-06-01', 'ends_on' => '2026-05-31', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('payment_plans')->insert(['name' => 'Retired (sample)', 'down_payment_type' => 'amount', 'down_payment_value' => 0, 'active' => false, 'version' => 1, 'created_at' => $now, 'updated_at' => $now]);
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);

        $this->actingAs($cashier)->getJson('/api/billing-accounts/creation-options')
            ->assertOk()
            ->assertJsonPath('data.currentSchoolYear.id', (string) $this->ids['year'])
            ->assertJsonPath('data.currentSchoolYear.label', 'SY 2026-2027 (sample)')
            ->assertJsonCount(1, 'data.paymentPlans')
            ->assertJsonPath('data.paymentPlans.0.id', (string) $this->ids['plan'])
            ->assertJsonPath('data.paymentPlans.0.version', 1)
            ->assertJsonPath('data.paymentPlans.0.downPaymentType', 'percent')
            ->assertJsonPath('data.paymentPlans.0.downPaymentValue', 1_500)
            ->assertJsonCount(3, 'data.paymentPlans.0.installments')
            ->assertJsonPath('data.paymentPlans.0.installments.2.percentOfRemainingBasisPoints', 3_334);

        DB::table('school_years')->update(['is_current' => false]);
        $this->actingAs($cashier)->getJson('/api/billing-accounts/creation-options')
            ->assertOk()
            ->assertJsonPath('data.currentSchoolYear', null);
    }

    public function test_a_payment_can_be_recorded_against_a_new_account(): void
    {
        $this->seedConfiguration();
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $accountId = $this->actingAs($cashier)->postJson('/api/billing-accounts', $this->payload(['excluded_fee_item_ids' => [$this->ids['laboratory']]]))->json('data.id');

        $this->actingAs($cashier)->withHeader('Idempotency-Key', 'new-account-payment-001')->postJson('/api/payments', [
            'billing_account_id' => (int) $accountId,
            'amount_cents' => 150_000,
            'paid_on' => '2026-11-20',
        ])->assertCreated();

        $this->assertDatabaseHas('billing_accounts', ['id' => $accountId, 'total_paid_cents' => 150_000, 'balance_cents' => 850_001]);
        $this->assertDatabaseHas('installments', ['billing_account_id' => $accountId, 'sequence' => 1, 'paid_cents' => 150_000, 'status' => 'paid']);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'student_id' => $this->ids['student'],
            'school_year_id' => $this->ids['year'],
            'payment_plan_id' => $this->ids['plan'],
            ...$overrides,
        ];
    }

    private function seedConfiguration(): void
    {
        $now = now();
        $year = DB::table('school_years')->insertGetId(['label' => 'SY 2026-2027 (sample)', 'is_current' => true, 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'created_at' => $now, 'updated_at' => $now]);
        $grade = (int) DB::table('grade_levels')->where('name', 'Grade 7')->value('id');
        $student = DB::table('students')->insertGetId(['lrn' => '000000000903', 'full_name' => 'Account Student (sample)', 'grade_level_id' => $grade, 'status' => 'enrolled', 'created_at' => $now, 'updated_at' => $now]);
        $schedule = DB::table('fee_schedules')->insertGetId(['school_year_id' => $year, 'grade_level_id' => $grade, 'name' => 'Grade 7 fees (sample)', 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
        $item = fn (string $name, int $amount, bool $required, bool $active, int $sort): int => DB::table('fee_items')->insertGetId([
            'fee_schedule_id' => $schedule, 'name' => $name, 'category' => 'tuition', 'amount_cents' => $amount, 'required' => $required,
            'sort_order' => $sort, 'active' => $active, 'version' => 1, 'created_at' => $now, 'updated_at' => $now,
        ]);
        $plan = DB::table('payment_plans')->insertGetId(['name' => 'Quarterly (sample)', 'down_payment_type' => 'percent', 'down_payment_value' => 1_500, 'active' => true, 'version' => 1, 'created_at' => $now, 'updated_at' => $now]);
        foreach ([[1, 30, 3_333], [2, 60, 3_333], [3, 90, 3_334]] as [$sequence, $offset, $points]) {
            DB::table('payment_plan_installments')->insert(['payment_plan_id' => $plan, 'label' => "Installment {$sequence}", 'sequence' => $sequence, 'due_day_offset' => $offset, 'percent_of_remaining_basis_points' => $points, 'created_at' => $now, 'updated_at' => $now]);
        }

        $this->ids = [
            'year' => $year,
            'grade' => $grade,
            'student' => $student,
            'schedule' => $schedule,
            'tuition' => $item('Tuition (sample)', 1_000_001, true, true, 1),
            'laboratory' => $item('Laboratory (sample)', 50_000, false, true, 2),
            'inactive' => $item('Retired fee (sample)', 9_999, false, false, 3),
            'plan' => $plan,
        ];
    }
}
