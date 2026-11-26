<?php

namespace Tests\Feature;

use App\Models\Adjustment;
use App\Models\BackupRecord;
use App\Models\BillingAccount;
use App\Models\Payment;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use App\UserRole;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class PerRoleAuditDiagnosticTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-10-24 12:00:00', 'Asia/Manila'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_backup_listing_reads_every_required_column_from_the_isolated_migrated_schema(): void
    {
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $record = BackupRecord::query()->forceCreate([
            'trigger' => 'manual',
            'requested_by' => $administrator->id,
            'started_at' => '2026-10-24 01:00:00',
            'result' => 'succeeded',
            'size_bytes' => 4_096,
            'file_name' => 'educatrak-20261024.sql',
            'checksum_sha256' => str_repeat('a', 64),
            'error' => null,
            'completed_at' => '2026-10-24 01:01:00',
        ]);

        $this->actingAs($administrator)->getJson('/api/backups')
            ->assertOk()
            ->assertJsonPath('data.0.id', (string) $record->id)
            ->assertJsonPath('data.0.trigger', 'manual')
            ->assertJsonPath('data.0.result', 'succeeded')
            ->assertJsonPath('data.0.sizeBytes', 4_096)
            ->assertJsonPath('data.0.checksumSha256', str_repeat('a', 64))
            ->assertJsonPath('data.0.startedAt', '2026-10-24 01:00:00')
            ->assertJsonPath('data.0.completedAt', '2026-10-24 01:01:00');
    }

    public function test_billing_account_detail_keeps_payment_and_adjustment_rows_scoped_to_that_account(): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $student = Student::query()->create(['lrn' => '000000008201', 'full_name' => 'Avery Diagnostic Student', 'status' => 'enrolled']);
        $currentYear = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $priorYear = SchoolYear::query()->forceCreate(['label' => 'SY 2025-2026', 'starts_on' => '2025-06-01', 'ends_on' => '2026-05-31', 'is_current' => false]);
        $currentAccount = $this->createAccount($student, $currentYear, $cashier, 100_000, 12_000, 88_000);
        $priorAccount = $this->createAccount($student, $priorYear, $cashier, 50_000, 50_000, 0);

        $this->createPayment($currentAccount, $student, $cashier, 10_000, '2026-10-20', 'valid');
        $this->createPayment($currentAccount, $student, $cashier, 2_000, '2026-10-21', 'void_pending');
        $this->createPayment($currentAccount, $student, $cashier, 5_000, '2026-10-22', 'voided');
        $historicalPayment = $this->createPayment($priorAccount, $student, $cashier, 50_000, '2025-10-22', 'valid');
        $this->createAdjustment($currentAccount, $accounting, 'discount', -3_000, 'Fictional tuition discount');
        $this->createAdjustment($currentAccount, $accounting, 'correction', 1_000, 'Fictional account correction');
        $historicalAdjustment = $this->createAdjustment($priorAccount, $accounting, 'correction', -5_000, 'Fictional prior-year correction');

        $response = $this->actingAs($cashier)->getJson("/api/billing-accounts/{$currentAccount->id}")->assertOk();
        $payments = $response->json('data.payments');
        $adjustments = $response->json('data.adjustments');

        $this->assertSame(12_000, $response->json('data.totalPaidCents'));
        $this->assertCount(3, $payments);
        $this->assertSame(17_000, array_sum(array_column($payments, 'amountCents')));
        $this->assertSame(12_000, array_sum(array_column(array_filter($payments, fn (array $payment): bool => $payment['status'] !== 'voided'), 'amountCents')));
        $this->assertNotContains((string) $historicalPayment->id, array_column($payments, 'id'));
        $this->assertCount(2, $adjustments);
        $this->assertSame(-2_000, array_sum(array_column($adjustments, 'amountCents')));
        $this->assertNotContains((string) $historicalAdjustment->id, array_column($adjustments, 'id'));
    }

    public function test_accounting_collection_trend_groups_manila_paid_dates_and_excludes_voided_payments(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $student = Student::query()->create(['lrn' => '000000008202', 'full_name' => 'Blake Diagnostic Student', 'status' => 'enrolled']);
        $account = $this->createAccount($student, $year, $cashier, 100_000, 0, 100_000);

        $this->createPayment($account, $student, $cashier, 4_000, '2026-10-17', 'valid');
        $this->createPayment($account, $student, $cashier, 1_200, '2026-10-18', 'valid');
        $this->createPayment($account, $student, $cashier, 500, '2026-10-19', 'voided');
        $this->createPayment($account, $student, $cashier, 2_200, '2026-10-20', 'void_pending');
        $this->createPayment($account, $student, $cashier, 3_000, '2026-10-24', 'valid');

        $this->actingAs($accounting)->getJson('/api/dashboard?range=last_7_days')
            ->assertOk()
            ->assertJsonPath('data.collectionTrend', [
                ['date' => '2026-10-18', 'totalCollected' => 1_200],
                ['date' => '2026-10-20', 'totalCollected' => 2_200],
                ['date' => '2026-10-24', 'totalCollected' => 3_000],
            ]);
    }

    public function test_daily_report_totals_include_valid_and_pending_void_payments_but_exclude_voided_payments(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $cashierOne = User::factory()->create(['role' => UserRole::Cashier, 'full_name' => 'Alex Cashier (sample)']);
        $cashierTwo = User::factory()->create(['role' => UserRole::Cashier, 'full_name' => 'Bailey Cashier (sample)']);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $student = Student::query()->create(['lrn' => '000000008203', 'full_name' => 'Casey Diagnostic Student', 'status' => 'enrolled']);
        $account = $this->createAccount($student, $year, $cashierOne, 100_000, 0, 100_000);

        $this->createPayment($account, $student, $cashierOne, 10_000, '2026-10-24', 'valid');
        $this->createPayment($account, $student, $cashierOne, 2_000, '2026-10-24', 'void_pending');
        $this->createPayment($account, $student, $cashierOne, 5_000, '2026-10-24', 'voided');
        $this->createPayment($account, $student, $cashierTwo, 7_000, '2026-10-24', 'valid');
        $this->createPayment($account, $student, $cashierOne, 9_000, '2026-10-25', 'valid');

        $this->actingAs($accounting)->getJson('/api/reports/daily?date=2026-10-24')
            ->assertOk()
            ->assertJsonPath('data.totalCents', 19_000)
            ->assertJsonPath('data.byMethod.0.method', 'cash')
            ->assertJsonPath('data.byMethod.0.totalCents', 19_000)
            ->assertJsonPath('data.byMethod.0.transactionCount', 3)
            ->assertJsonPath('data.byCashier.0.cashier', 'Alex Cashier (sample)')
            ->assertJsonPath('data.byCashier.0.totalCents', 12_000)
            ->assertJsonPath('data.byCashier.1.cashier', 'Bailey Cashier (sample)')
            ->assertJsonPath('data.byCashier.1.totalCents', 7_000)
            ->assertJsonPath('data.meta.totalPayments', 4);

        $this->actingAs($accounting)->getJson('/api/reports/daily?date=2026-10-25')
            ->assertOk()
            ->assertJsonPath('data.totalCents', 9_000)
            ->assertJsonPath('data.byMethod.0.transactionCount', 1)
            ->assertJsonPath('data.meta.totalPayments', 1);
    }

    private function createAccount(Student $student, SchoolYear $year, User $createdBy, int $totalDue, int $totalPaid, int $balance): BillingAccount
    {
        return BillingAccount::query()->create([
            'student_id' => $student->id,
            'school_year_id' => $year->id,
            'status' => $balance === 0 ? 'paid' : 'current',
            'total_due_cents' => $totalDue,
            'total_paid_cents' => $totalPaid,
            'balance_cents' => $balance,
            'created_by' => $createdBy->id,
        ]);
    }

    private function createPayment(BillingAccount $account, Student $student, User $cashier, int $amount, string $paidOn, string $status): Payment
    {
        return Payment::query()->create([
            'billing_account_id' => $account->id,
            'student_id' => $student->id,
            'amount_cents' => $amount,
            'method' => 'cash',
            'paid_on' => $paidOn,
            'status' => $status,
            'recorded_by' => $cashier->id,
            'recorded_at' => Carbon::parse($paidOn.' 09:00:00', 'Asia/Manila'),
        ]);
    }

    private function createAdjustment(BillingAccount $account, User $createdBy, string $type, int $amount, string $reason): Adjustment
    {
        return Adjustment::query()->forceCreate([
            'billing_account_id' => $account->id,
            'type' => $type,
            'amount_cents' => $amount,
            'reason' => $reason,
            'created_by' => $createdBy->id,
            'effective_at' => '2026-10-23 09:00:00',
        ]);
    }
}
