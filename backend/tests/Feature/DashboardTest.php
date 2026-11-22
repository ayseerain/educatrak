<?php

namespace Tests\Feature;

use App\Models\BillingAccount;
use App\Models\Installment;
use App\Models\NotificationLog;
use App\Models\Payment;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use App\UserRole;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DashboardTest extends TestCase
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

    public function test_cashier_dashboard_uses_own_payments_and_current_school_year_accounts(): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $otherCashier = User::factory()->create(['role' => UserRole::Cashier]);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $student = Student::query()->create(['lrn' => '000000009001', 'full_name' => 'Taylor Sample', 'status' => 'enrolled']);
        $account = $this->createAccount($student, $year, $cashier, 'due_soon', 5_000);
        Installment::query()->create(['billing_account_id' => $account->id, 'label' => 'October sample installment', 'sequence' => 1, 'due_date' => '2026-10-27', 'amount_cents' => 10_000, 'paid_cents' => 5_000, 'status' => 'due_soon']);
        $today = $this->createPayment($account, $student, $cashier, 2_500, '2026-10-24', 'valid');
        $voided = $this->createPayment($account, $student, $cashier, 1_000, '2026-10-24', 'voided');
        $this->createPayment($account, $student, $otherCashier, 3_000, '2026-10-24', 'valid');
        NotificationLog::query()->create(['student_id' => $student->id, 'payment_id' => $today->id, 'guardian_email' => 'sample.guardian@example.test', 'channel' => 'email', 'kind' => 'payment_confirmation', 'status' => 'failed', 'attempts' => 1]);

        $this->actingAs($cashier)->getJson('/api/dashboard?range=today')
            ->assertOk()
            ->assertJsonPath('data.role', 'cashier')
            ->assertJsonPath('data.todayCollectionsTotal', 2_500)
            ->assertJsonPath('data.paymentsTodayCount', 1)
            ->assertJsonPath('data.rangeCollectionsTotal', 2_500)
            ->assertJsonPath('data.paymentsInRangeCount', 1)
            ->assertJsonPath('data.failedEmailCount', 1)
            ->assertJsonPath('data.accountStatusOverview.dueSoon', 1)
            ->assertJsonPath('data.accountsNeedingAttention.0.amountDue', 5_000)
            ->assertJsonPath('data.recentActivity.0.id', (string) $voided->id)
            ->assertJsonPath('data.recentActivity.0.status', 'voided');

        $this->actingAs($cashier)->getJson('/api/dashboard?range=last_7_days')
            ->assertOk()
            ->assertJsonPath('data.rangeCollectionsTotal', 2_500)
            ->assertJsonPath('data.paymentsInRangeCount', 1);
    }

    public function test_accounting_auditor_and_administrator_summaries_match_their_approved_widgets(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $auditor = User::factory()->create(['role' => UserRole::Auditor]);
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $student = Student::query()->create(['lrn' => '000000009002', 'full_name' => 'Jordan Sample', 'status' => 'enrolled']);
        $account = $this->createAccount($student, $year, $cashier, 'overdue', 8_000);
        Installment::query()->create(['billing_account_id' => $account->id, 'label' => 'Past sample installment', 'sequence' => 1, 'due_date' => '2026-10-20', 'amount_cents' => 10_000, 'paid_cents' => 2_000, 'status' => 'overdue']);
        $payment = $this->createPayment($account, $student, $cashier, 4_000, '2026-10-24', 'valid');
        $voided = $this->createPayment($account, $student, $cashier, 3_000, '2026-10-24', 'voided');
        NotificationLog::query()->create(['student_id' => $student->id, 'payment_id' => $payment->id, 'guardian_email' => 'sample.guardian@example.test', 'channel' => 'email', 'kind' => 'payment_confirmation', 'status' => 'failed', 'attempts' => 1]);
        DB::table('backup_records')->insert(['result' => 'succeeded', 'size_bytes' => 100, 'completed_at' => '2026-10-24 03:00:00', 'created_at' => now(), 'updated_at' => now()]);

        $this->actingAs($accounting)->getJson('/api/dashboard?range=today')
            ->assertOk()
            ->assertJsonPath('data.role', 'accounting')
            ->assertJsonPath('data.pendingVoidApprovals', 0)
            ->assertJsonPath('data.overdueTotal', 8_000)
            ->assertJsonPath('data.collectionTrend.0.totalCollected', 4_000);

        $this->actingAs($auditor)->getJson('/api/dashboard?range=today')
            ->assertOk()
            ->assertJsonPath('data.role', 'auditor')
            ->assertJsonPath('data.todayCollectionsTotal', 4_000)
            ->assertJsonPath('data.paymentsTodayCount', 1)
            ->assertJsonMissingPath('data.recentActivity');

        $this->actingAs($admin)->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonPath('data.lastBackupSucceeded', true)
            ->assertJsonPath('data.activeUserCount', 4)
            ->assertJsonMissingPath('data.failedEmailCount')
            ->assertJsonMissingPath('data.todayCollectionsTotal');
    }

    public function test_administrator_backup_widget_handles_missing_and_unknown_results(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);

        $this->actingAs($admin)->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.lastBackupAt', null)
            ->assertJsonPath('data.lastBackupSucceeded', null);

        DB::table('backup_records')->insert([
            'result' => 'unrecognized',
            'size_bytes' => null,
            'error' => null,
            'completed_at' => '2026-10-24 03:00:00',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.lastBackupAt', '2026-10-24 03:00:00')
            ->assertJsonPath('data.lastBackupSucceeded', null);
    }

    public function test_super_admin_dashboard_shows_governance_status_without_financial_fields(): void
    {
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        User::factory()->create(['role' => UserRole::Cashier]);

        $this->actingAs($superAdmin)->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.role', 'super_admin')
            ->assertJsonPath('data.activeUserCount', 2)
            ->assertJsonPath('data.lastBackupAt', null)
            ->assertJsonPath('data.lastBackupSucceeded', null)
            ->assertJsonMissingPath('data.todayCollectionsTotal')
            ->assertJsonMissingPath('data.collectionTrend')
            ->assertJsonMissingPath('data.pendingVoidApprovals')
            ->assertJsonMissingPath('data.recentActivity');
    }

    public function test_registrar_receives_a_limited_dashboard_and_unknown_ranges_are_rejected(): void
    {
        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $this->actingAs($registrar)->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.role', 'registrar')
            ->assertJsonMissingPath('data.todayCollectionsTotal')
            ->assertJsonMissingPath('data.collectionTrend')
            ->assertJsonMissingPath('data.recentActivity');

        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $this->actingAs($cashier)->getJson('/api/dashboard?range=all_time')->assertUnprocessable();
    }

    public function test_date_ranges_use_inclusive_manila_calendar_day_boundaries(): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $student = Student::query()->create(['lrn' => '000000009003', 'full_name' => 'Avery Sample', 'status' => 'enrolled']);
        $account = $this->createAccount($student, $year, $cashier, 'current', 20_000);
        $this->createPayment($account, $student, $cashier, 1_000, '2026-10-17', 'valid');
        $this->createPayment($account, $student, $cashier, 2_000, '2026-10-18', 'valid');
        $this->createPayment($account, $student, $cashier, 3_000, '2026-10-24', 'valid');
        $this->createPayment($account, $student, $cashier, 4_000, '2026-10-25', 'valid');

        $this->actingAs($cashier)->getJson('/api/dashboard?range=last_7_days')
            ->assertOk()
            ->assertJsonPath('data.rangeCollectionsTotal', 5_000)
            ->assertJsonPath('data.paymentsInRangeCount', 2);

        $this->actingAs($cashier)->getJson('/api/dashboard?range=school_year')
            ->assertOk()
            ->assertJsonPath('data.rangeCollectionsTotal', 6_000)
            ->assertJsonPath('data.paymentsInRangeCount', 3);
    }

    public function test_school_year_range_requires_exactly_one_current_school_year(): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);

        $this->actingAs($cashier)->getJson('/api/dashboard?range=school_year')
            ->assertConflict()
            ->assertJsonPath('message', 'Exactly one current school year must be configured.');

        SchoolYear::query()->forceCreate(['label' => 'SY 2025-2026', 'starts_on' => '2025-06-01', 'ends_on' => '2026-05-31', 'is_current' => true]);
        SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);

        $this->actingAs($cashier)->getJson('/api/dashboard?range=school_year')
            ->assertConflict()
            ->assertJsonPath('message', 'Exactly one current school year must be configured.');
    }

    private function createAccount(Student $student, SchoolYear $year, User $cashier, string $status, int $balance): BillingAccount
    {
        return BillingAccount::query()->create([
            'student_id' => $student->id,
            'school_year_id' => $year->id,
            'status' => $status,
            'total_due_cents' => $balance,
            'total_paid_cents' => 0,
            'balance_cents' => $balance,
            'created_by' => $cashier->id,
        ]);
    }

    private function createPayment(BillingAccount $account, Student $student, User $cashier, int $amount, string $date, string $status): Payment
    {
        return Payment::query()->create([
            'billing_account_id' => $account->id,
            'student_id' => $student->id,
            'amount_cents' => $amount,
            'method' => 'cash',
            'paid_on' => $date,
            'status' => $status,
            'recorded_by' => $cashier->id,
            'recorded_at' => Carbon::parse($date.' 09:00:00', 'Asia/Manila'),
        ]);
    }
}
