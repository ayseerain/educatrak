<?php

namespace Tests\Feature;

use App\Models\PaymentPlan;
use App\Models\User;
use App\Services\AuditLogger;
use App\UserRole;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

class PaymentPlanSettingsTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_accounting_creates_a_plan_and_previews_an_exact_centavo_schedule(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-20 10:00:00', 'Asia/Manila'));
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);

        $created = $this->actingAs($accounting)->postJson('/api/settings/finance/plans', $this->planPayload('Quarterly (sample)', 'percent', 1_500, [3_333, 3_333, 3_334]));
        $created->assertCreated()
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.previousVersionId', null)
            ->assertJsonPath('data.installments.2.sequence', 3);
        $planId = $created->json('data.id');

        $this->actingAs($accounting)->postJson("/api/settings/finance/plans/{$planId}/preview", ['total_cents' => 1_000_001])
            ->assertOk()
            ->assertJsonPath('data.installments.0.label', 'Down payment')
            ->assertJsonPath('data.installments.0.dueDate', '2026-11-20')
            ->assertJsonPath('data.installments.0.amountCents', 150_000)
            ->assertJsonPath('data.installments.1.amountCents', 283_305)
            ->assertJsonPath('data.installments.1.dueDate', '2026-12-20')
            ->assertJsonPath('data.installments.2.amountCents', 283_305)
            ->assertJsonPath('data.installments.3.amountCents', 283_391)
            ->assertJsonPath('data.installments.3.dueDate', '2027-02-18')
            ->assertJsonPath('data.installments.3.sequence', 4);

        $amountPlan = $this->actingAs($accounting)->postJson('/api/settings/finance/plans', $this->planPayload('Full payment (sample)', 'amount', 25_000, [10_000]))
            ->assertCreated()->json('data.id');
        $this->actingAs($accounting)->postJson("/api/settings/finance/plans/{$amountPlan}/preview", ['total_cents' => 100_001])
            ->assertOk()
            ->assertJsonCount(2, 'data.installments')
            ->assertJsonPath('data.installments.0.amountCents', 25_000)
            ->assertJsonPath('data.installments.1.amountCents', 75_001);
        $this->actingAs($accounting)->postJson("/api/settings/finance/plans/{$amountPlan}/preview", ['total_cents' => 20_000])
            ->assertUnprocessable()->assertJsonValidationErrors('total_cents');

        $this->assertDatabaseHas('audit_entries', ['action' => 'finance.payment_plan.created', 'user_id' => $accounting->id]);
    }

    public function test_plan_validation_rejects_bad_percentages_and_duplicate_names(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);

        $this->actingAs($accounting)->postJson('/api/settings/finance/plans', $this->planPayload('Uneven (sample)', 'amount', 0, [5_000, 4_000]))
            ->assertUnprocessable()->assertJsonValidationErrors('installments')->assertJsonStructure(['message', 'errors']);
        $this->actingAs($accounting)->postJson('/api/settings/finance/plans', $this->planPayload('Too much (sample)', 'percent', 10_001, [10_000]))
            ->assertUnprocessable()->assertJsonValidationErrors('down_payment_value');
        $this->actingAs($accounting)->postJson('/api/settings/finance/plans', $this->planPayload('Empty (sample)', 'amount', 0, []))
            ->assertUnprocessable()->assertJsonValidationErrors('installments');

        $this->actingAs($accounting)->postJson('/api/settings/finance/plans', $this->planPayload('Monthly (sample)', 'amount', 0, [10_000]))->assertCreated();
        $this->actingAs($accounting)->postJson('/api/settings/finance/plans', $this->planPayload('monthly (SAMPLE)', 'amount', 0, [10_000]))
            ->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->assertDatabaseCount('payment_plans', 1);
    }

    public function test_revision_creates_a_new_version_and_existing_accounts_keep_their_plan_and_installments(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $originalId = (int) $this->actingAs($accounting)->postJson('/api/settings/finance/plans', $this->planPayload('Semestral (sample)', 'amount', 50_000, [5_000, 5_000]))
            ->assertCreated()->json('data.id');
        $accountId = $this->createAccountUsingPlan($originalId);
        $installmentsBefore = DB::table('installments')->where('billing_account_id', $accountId)->orderBy('sequence')->get(['label', 'due_date', 'amount_cents', 'paid_cents'])->toArray();
        $planRowsBefore = DB::table('payment_plan_installments')->where('payment_plan_id', $originalId)->orderBy('sequence')->get()->toArray();

        $revised = $this->actingAs($accounting)->patchJson("/api/settings/finance/plans/{$originalId}", $this->planPayload('Semestral (sample)', 'amount', 75_000, [6_000, 4_000]));
        $revised->assertOk()
            ->assertJsonPath('data.version', 2)
            ->assertJsonPath('data.previousVersionId', (string) $originalId)
            ->assertJsonPath('data.active', true)
            ->assertJsonPath('data.downPaymentValue', 75_000);
        $revisedId = (int) $revised->json('data.id');

        $this->assertNotSame($originalId, $revisedId);
        $this->assertDatabaseHas('payment_plans', ['id' => $originalId, 'active' => false, 'version' => 1, 'down_payment_value' => 50_000]);
        $this->assertDatabaseHas('billing_accounts', ['id' => $accountId, 'payment_plan_id' => $originalId, 'total_due_cents' => 200_000]);
        $this->assertEquals($installmentsBefore, DB::table('installments')->where('billing_account_id', $accountId)->orderBy('sequence')->get(['label', 'due_date', 'amount_cents', 'paid_cents'])->toArray());
        $this->assertEquals($planRowsBefore, DB::table('payment_plan_installments')->where('payment_plan_id', $originalId)->orderBy('sequence')->get()->toArray());
        $this->assertDatabaseHas('audit_entries', ['action' => 'finance.payment_plan.revised', 'entity_id' => (string) $revisedId]);

        $this->actingAs($accounting)->patchJson("/api/settings/finance/plans/{$originalId}", $this->planPayload('Semestral (sample)', 'amount', 0, [10_000]))
            ->assertConflict()->assertJsonStructure(['message']);

        $this->actingAs($accounting)->getJson('/api/settings/finance/plans')
            ->assertOk()
            ->assertJsonPath('data.0.version', 1)
            ->assertJsonPath('data.1.version', 2);

        $this->actingAs($accounting)->postJson("/api/settings/finance/plans/{$revisedId}/deactivate")->assertOk()->assertJsonPath('data.active', false);
        $this->actingAs($accounting)->postJson("/api/settings/finance/plans/{$revisedId}/deactivate")->assertConflict();
        $this->actingAs($accounting)->patchJson("/api/settings/finance/plans/{$revisedId}", $this->planPayload('Semestral (sample)', 'amount', 0, [10_000]))->assertConflict();
    }

    public function test_used_plans_cannot_be_deleted_at_the_database_level(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $planId = (int) $this->actingAs($accounting)->postJson('/api/settings/finance/plans', $this->planPayload('Used (sample)', 'amount', 0, [10_000]))->json('data.id');
        $this->createAccountUsingPlan($planId);

        $this->expectException(QueryException::class);
        DB::table('payment_plans')->where('id', $planId)->delete();
    }

    public function test_plan_revision_rolls_back_when_audit_recording_fails(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $planId = (int) $this->actingAs($accounting)->postJson('/api/settings/finance/plans', $this->planPayload('Rollback (sample)', 'amount', 0, [10_000]))->json('data.id');
        $this->mock(AuditLogger::class, function (MockInterface $mock): void {
            $mock->shouldReceive('record')->once()->andThrow(new RuntimeException('Audit storage failed.'));
        });

        $this->actingAs($accounting)->patchJson("/api/settings/finance/plans/{$planId}", $this->planPayload('Rollback (sample)', 'amount', 10_000, [10_000]))
            ->assertInternalServerError();

        $this->assertDatabaseCount('payment_plans', 1);
        $this->assertDatabaseHas('payment_plans', ['id' => $planId, 'active' => true, 'version' => 1]);
    }

    public function test_only_accounting_manages_plans(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $planId = (int) $this->actingAs($accounting)->postJson('/api/settings/finance/plans', $this->planPayload('Roles (sample)', 'amount', 0, [10_000]))->json('data.id');

        foreach ([UserRole::Admin, UserRole::Cashier, UserRole::Registrar, UserRole::Auditor, UserRole::SuperAdmin] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->postJson('/api/settings/finance/plans', $this->planPayload('Denied (sample)', 'amount', 0, [10_000]))->assertForbidden();
            $this->actingAs($user)->patchJson("/api/settings/finance/plans/{$planId}", $this->planPayload('Denied (sample)', 'amount', 0, [10_000]))->assertForbidden();
            $this->actingAs($user)->postJson("/api/settings/finance/plans/{$planId}/deactivate")->assertForbidden();
            $this->actingAs($user)->postJson("/api/settings/finance/plans/{$planId}/preview", ['total_cents' => 100])->assertForbidden();
        }

        $this->assertDatabaseCount('payment_plans', 1);
        $this->assertDatabaseHas('payment_plans', ['id' => $planId, 'active' => true]);
    }

    public function test_versioning_migration_upgrades_populated_rows_and_refuses_unsafe_rollback(): void
    {
        $migration = require database_path('migrations/2026_11_20_010000_add_versioning_to_payment_plans.php');
        $migration->down();

        $planId = DB::table('payment_plans')->insertGetId([
            'name' => 'Legacy plan (sample)',
            'down_payment_type' => 'amount',
            'down_payment_value' => 25_000,
            'active' => true,
            'created_at' => '2026-06-01 08:00:00',
            'updated_at' => '2026-06-01 08:00:00',
        ]);
        $accountId = $this->createAccountUsingPlan($planId);

        $migration->up();

        $this->assertDatabaseHas('payment_plans', [
            'id' => $planId,
            'name' => 'Legacy plan (sample)',
            'down_payment_value' => 25_000,
            'active' => true,
            'version' => 1,
            'previous_version_id' => null,
            'updated_at' => '2026-06-01 08:00:00',
        ]);
        $this->assertDatabaseHas('billing_accounts', ['id' => $accountId, 'payment_plan_id' => $planId]);

        $migration->down();
        $this->assertDatabaseHas('billing_accounts', ['id' => $accountId, 'payment_plan_id' => $planId]);
        $this->assertDatabaseHas('payment_plans', ['id' => $planId, 'name' => 'Legacy plan (sample)', 'down_payment_value' => 25_000]);
        $migration->up();
        $this->assertDatabaseHas('billing_accounts', ['id' => $accountId, 'payment_plan_id' => $planId]);
        $this->assertSame(3, DB::table('installments')->where('billing_account_id', $accountId)->count());

        DB::table('payment_plans')->insert([
            'name' => 'Legacy plan (sample)',
            'down_payment_type' => 'amount',
            'down_payment_value' => 30_000,
            'active' => true,
            'version' => 2,
            'previous_version_id' => $planId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            $migration->down();
            $this->fail('Rollback must refuse while a version 2 plan exists.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('Cannot roll back payment-plan versioning', $exception->getMessage());
        }
        $this->assertSame(2, PaymentPlan::query()->where('name', 'Legacy plan (sample)')->count());

        DB::statement('PRAGMA defer_foreign_keys = OFF');
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
        $this->expectException(QueryException::class);
        DB::table('payment_plans')->where('id', $planId)->delete();
    }

    /**
     * @param  list<int>  $basisPoints
     * @return array<string, mixed>
     */
    private function planPayload(string $name, string $downPaymentType, int $downPaymentValue, array $basisPoints): array
    {
        return [
            'name' => $name,
            'down_payment_type' => $downPaymentType,
            'down_payment_value' => $downPaymentValue,
            'installments' => array_map(fn (int $points, int $index): array => [
                'label' => 'Installment '.($index + 1),
                'due_day_offset' => 30 * ($index + 1),
                'percent_of_remaining_basis_points' => $points,
            ], $basisPoints, array_keys($basisPoints)),
        ];
    }

    private function createAccountUsingPlan(int $planId): int
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $yearId = DB::table('school_years')->insertGetId(['label' => 'SY plan test (sample)', 'is_current' => true, 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'created_at' => now(), 'updated_at' => now()]);
        $studentId = DB::table('students')->insertGetId(['lrn' => '000000000902', 'full_name' => 'Plan Student (sample)', 'status' => 'enrolled', 'created_at' => now(), 'updated_at' => now()]);
        $accountId = DB::table('billing_accounts')->insertGetId([
            'student_id' => $studentId,
            'school_year_id' => $yearId,
            'payment_plan_id' => $planId,
            'status' => 'current',
            'total_due_cents' => 200_000,
            'total_paid_cents' => 0,
            'balance_cents' => 200_000,
            'created_by' => $cashier->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        foreach ([[1, 'Down payment', '2026-06-01', 50_000], [2, 'Installment 1', '2026-07-01', 75_000], [3, 'Installment 2', '2026-08-01', 75_000]] as [$sequence, $label, $dueDate, $amount]) {
            DB::table('installments')->insert(['billing_account_id' => $accountId, 'label' => $label, 'sequence' => $sequence, 'due_date' => $dueDate, 'amount_cents' => $amount, 'paid_cents' => 0, 'status' => 'current', 'created_at' => now(), 'updated_at' => now()]);
        }

        return $accountId;
    }
}
