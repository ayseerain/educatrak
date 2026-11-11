<?php

namespace Tests\Feature;

use App\Models\BillingAccount;
use App\Models\Adjustment;
use App\Models\AuditEntry;
use App\Models\GradeLevel;
use App\Models\Payment;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class BillingAccountReadTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_finance_reader_roles_can_view_billing_accounts_and_registrar_cannot(): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $grade = GradeLevel::query()->forceCreate(['name' => 'Grade 4', 'sort_order' => 4]);
        $student = Student::query()->create(['lrn' => 'SAMPLE-4002', 'full_name' => 'Morgan Sample Student', 'grade_level_id' => $grade->id, 'status' => 'enrolled']);
        $account = BillingAccount::query()->create([
            'student_id' => $student->id,
            'school_year_id' => $year->id,
            'status' => 'current',
            'total_due_cents' => 50_000,
            'total_paid_cents' => 15_000,
            'balance_cents' => 35_000,
            'created_by' => $cashier->id,
        ]);

        foreach ([UserRole::Cashier, UserRole::Accounting] as $role) {
            $reader = $role === UserRole::Cashier ? $cashier : User::factory()->create(['role' => $role]);
            $this->actingAs($reader)->getJson('/api/billing-accounts?query=SAMPLE-4002&school_year=2026-2027&grade=Grade%204')
                ->assertOk()
                ->assertJsonPath('data.0.id', (string) $account->id)
                ->assertJsonPath('data.0.balanceCents', 35_000);
        }
        $auditor = User::factory()->create(['role' => UserRole::Auditor]);
        $this->actingAs($auditor)->getJson('/api/billing-accounts')->assertForbidden();

        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $this->actingAs($registrar)->getJson('/api/billing-accounts')->assertForbidden();
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $this->actingAs($administrator)->getJson('/api/billing-accounts')->assertForbidden();
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $this->actingAs($superAdmin)->getJson('/api/billing-accounts')->assertForbidden();
    }

    public function test_account_detail_returns_fees_schedule_and_payment_history(): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $student = Student::query()->create(['lrn' => 'SAMPLE-4003', 'full_name' => 'Jamie Sample Student', 'status' => 'enrolled']);
        $account = BillingAccount::query()->create([
            'student_id' => $student->id,
            'school_year_id' => $year->id,
            'status' => 'current',
            'total_due_cents' => 50_000,
            'total_paid_cents' => 0,
            'balance_cents' => 50_000,
            'created_by' => $cashier->id,
        ]);

        foreach ([UserRole::Cashier, UserRole::Accounting] as $role) {
            $reader = $role === UserRole::Cashier ? $cashier : User::factory()->create(['role' => $role]);
            $this->actingAs($reader)->getJson("/api/billing-accounts/{$account->id}")
                ->assertOk()
                ->assertJsonPath('data.lrn', 'SAMPLE-4003')
                ->assertJsonPath('data.balanceCents', 50_000)
                ->assertJsonPath('data.items', [])
                ->assertJsonPath('data.installments', [])
                ->assertJsonPath('data.payments', [])
                ->assertJsonPath('data.adjustments', [])
                ->assertJsonPath('data.activity.0.action', 'account.created');
        }

        foreach ([UserRole::SuperAdmin, UserRole::Admin, UserRole::Auditor, UserRole::Registrar] as $role) {
            $this->actingAs(User::factory()->create(['role' => $role]))
                ->getJson("/api/billing-accounts/{$account->id}")
                ->assertForbidden();
        }
    }

    public function test_billing_account_list_filters_by_minimum_and_maximum_balance(): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        foreach ([
            ['SAMPLE-4012', 'Avery Sample Student', 5_000],
            ['SAMPLE-4013', 'Blake Sample Student', 10_000],
            ['SAMPLE-4014', 'Casey Sample Student', 15_000],
        ] as [$lrn, $name, $balance]) {
            $student = Student::query()->create(['lrn' => $lrn, 'full_name' => $name, 'status' => 'enrolled']);
            BillingAccount::query()->create([
                'student_id' => $student->id,
                'school_year_id' => $year->id,
                'status' => 'current',
                'total_due_cents' => $balance,
                'total_paid_cents' => 0,
                'balance_cents' => $balance,
                'created_by' => $cashier->id,
            ]);
        }

        $this->actingAs($cashier)->getJson('/api/billing-accounts?minimum_balance_cents=10000&maximum_balance_cents=10000')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.lrn', 'SAMPLE-4013');

        $this->actingAs($cashier)->getJson('/api/billing-accounts?minimum_balance_cents=15001&maximum_balance_cents=15000')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('maximum_balance_cents');
    }

    public function test_account_activity_combines_its_records_and_payment_audit_events_only(): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier, 'full_name' => 'Casey Cashier (sample)']);
        $accountant = User::factory()->create(['role' => UserRole::Accounting, 'full_name' => 'Morgan Accountant (sample)']);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $student = Student::query()->create(['lrn' => 'SAMPLE-4010', 'full_name' => 'Taylor Sample Student', 'status' => 'enrolled']);
        $account = BillingAccount::query()->forceCreate([
            'student_id' => $student->id,
            'school_year_id' => $year->id,
            'status' => 'current',
            'total_due_cents' => 50_000,
            'total_paid_cents' => 15_000,
            'balance_cents' => 35_000,
            'created_by' => $cashier->id,
            'created_at' => '2026-10-20 08:00:00',
            'updated_at' => '2026-10-20 08:00:00',
        ]);
        $payment = Payment::query()->forceCreate([
            'billing_account_id' => $account->id,
            'student_id' => $student->id,
            'amount_cents' => 15_000,
            'method' => 'cash',
            'paid_on' => '2026-10-21',
            'status' => 'valid',
            'recorded_by' => $cashier->id,
            'recorded_at' => '2026-10-21 08:00:00',
            'created_at' => '2026-10-21 08:00:00',
            'updated_at' => '2026-10-21 08:00:00',
        ]);
        Adjustment::query()->forceCreate([
            'billing_account_id' => $account->id,
            'type' => 'scholarship',
            'amount_cents' => -5_000,
            'reason' => 'Approved sample grant',
            'created_by' => $accountant->id,
            'effective_at' => '2026-10-22 08:00:00',
            'created_at' => '2026-10-22 08:00:00',
            'updated_at' => '2026-10-22 08:00:00',
        ]);
        AuditEntry::query()->forceCreate([
            'user_id' => $accountant->id,
            'action' => 'receipt.reprinted',
            'entity_type' => $payment->getMorphClass(),
            'entity_id' => (string) $payment->id,
            'before' => null,
            'after' => ['receipt_no' => 'OR-2026-001050', 'reprint_count' => 1],
            'occurred_at' => '2026-10-23 08:00:00',
        ]);

        $otherStudent = Student::query()->create(['lrn' => 'SAMPLE-4011', 'full_name' => 'Jordan Sample Student', 'status' => 'enrolled']);
        $otherAccount = BillingAccount::query()->forceCreate([
            'student_id' => $otherStudent->id,
            'school_year_id' => $year->id,
            'status' => 'current',
            'total_due_cents' => 10_000,
            'total_paid_cents' => 0,
            'balance_cents' => 10_000,
            'created_by' => $cashier->id,
        ]);
        $otherPayment = Payment::query()->forceCreate([
            'billing_account_id' => $otherAccount->id,
            'student_id' => $otherStudent->id,
            'amount_cents' => 1_000,
            'method' => 'cash',
            'paid_on' => '2026-10-24',
            'status' => 'valid',
            'recorded_by' => $cashier->id,
            'recorded_at' => '2026-10-24 08:00:00',
        ]);
        AuditEntry::query()->forceCreate([
            'user_id' => $accountant->id,
            'action' => 'payment.void_approved',
            'entity_type' => $otherPayment->getMorphClass(),
            'entity_id' => (string) $otherPayment->id,
            'before' => ['status' => 'void_pending'],
            'after' => ['status' => 'voided'],
            'occurred_at' => '2026-10-24 09:00:00',
        ]);

        $response = $this->actingAs($cashier)->getJson("/api/billing-accounts/{$account->id}")->assertOk();
        $activity = $response->json('data.activity');
        $this->assertCount(4, $activity);
        $this->assertSame(['receipt.reprinted', 'adjustment.created', 'payment.recorded', 'account.created'], array_column($activity, 'action'));
        $this->assertSame('Morgan Accountant (sample)', $activity[0]['actor']);
        $this->assertSame('OR-2026-001050', $activity[0]['details']['receiptNo']);
        $this->assertSame('Approved sample grant', $activity[1]['details']['reason']);
        $this->assertNotContains('payment.void_approved', array_column($activity, 'action'));
    }
}
