<?php

namespace Tests\Feature;

use App\Models\BillingAccount;
use App\Models\BillingAccountItem;
use App\Models\Installment;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use App\UserRole;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class DailyReportTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_cashier_has_no_standalone_daily_report_access(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-24 12:00:00', 'Asia/Manila'));
        try {
            $cashier = User::factory()->create(['role' => UserRole::Cashier]);

            $this->actingAs($cashier)->getJson('/api/reports/daily?date=2026-10-24')->assertForbidden();
            $this->actingAs($cashier)->getJson('/api/reports/daily?date=2026-10-23')->assertForbidden();
            $this->actingAs($cashier)->getJson('/api/reports/daily?date=2026-10-25')->assertForbidden();
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_daily_report_uses_persisted_records_for_accounting_only(): void
    {
        $this->travelTo(Carbon::parse('2026-10-24 12:00:00', 'Asia/Manila'), function (): void {
            $cashier = User::factory()->create(['role' => UserRole::Cashier]);
            $otherCashier = User::factory()->create(['role' => UserRole::Cashier]);
            $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
            $student = Student::query()->create(['lrn' => '000000009101', 'full_name' => 'Riley Sample Student', 'status' => 'enrolled']);
            $account = BillingAccount::query()->create(['student_id' => $student->id, 'school_year_id' => $year->id, 'status' => 'current', 'total_due_cents' => 20_000, 'total_paid_cents' => 15_000, 'balance_cents' => 5_000, 'created_by' => $cashier->id]);
            BillingAccountItem::query()->forceCreate(['billing_account_id' => $account->id, 'name' => 'Sample tuition', 'category' => 'tuition', 'amount_cents' => 20_000]);
            Installment::query()->create(['billing_account_id' => $account->id, 'label' => 'First installment', 'sequence' => 1, 'due_date' => '2026-10-01', 'amount_cents' => 20_000, 'paid_cents' => 15_000, 'status' => 'current']);
            $firstPayment = $this->createPayment($account, $student, $cashier, 10_000, 'OR-SAMPLE-9101');
            $this->createPayment($account, $student, $otherCashier, 5_000, 'OR-SAMPLE-9102');

            $this->actingAs($cashier)->getJson('/api/reports/daily?date=2026-10-24')->assertForbidden();

            $accounting = User::factory()->create(['role' => UserRole::Accounting]);
            $this->actingAs($accounting)->getJson('/api/reports/daily?date=2026-10-24')
                ->assertOk()
                ->assertJsonPath('data.totalCents', 15_000)
                ->assertJsonPath('data.meta.totalPayments', 2);

            $auditor = User::factory()->create(['role' => UserRole::Auditor]);
            $this->actingAs($auditor)->getJson('/api/reports/daily?date=2026-10-24')
                ->assertForbidden();

            $administrator = User::factory()->create(['role' => UserRole::Admin]);
            $this->actingAs($administrator)->getJson('/api/reports/daily?date=2026-10-24')->assertForbidden();
            $this->actingAs($administrator)->getJson("/api/reports/students/{$student->id}/statement")->assertForbidden();

            $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
            $this->actingAs($superAdmin)->getJson('/api/reports/daily?date=2026-10-24')->assertForbidden();
            $this->actingAs($superAdmin)->getJson("/api/reports/students/{$student->id}/statement")->assertForbidden();

            $this->actingAs($cashier)->getJson("/api/reports/students/{$student->id}/statement")->assertForbidden();
            $this->actingAs($auditor)->getJson("/api/reports/students/{$student->id}/statement")->assertForbidden();
            $this->actingAs($accounting)->getJson("/api/reports/students/{$student->id}/statement")
                ->assertOk()
                ->assertJsonPath('data.lrn', '000000009101')
                ->assertJsonPath('data.balanceCents', 5_000)
                ->assertJsonPath('data.items.0.name', 'Sample tuition')
                ->assertJsonPath('data.installments.0.label', 'First installment')
                ->assertJsonPath('data.payments.0.receiptNo', 'OR-SAMPLE-9102');

            $registrar = User::factory()->create(['role' => UserRole::Registrar]);
            $this->actingAs($registrar)->getJson('/api/reports/daily?date=2026-10-24')->assertForbidden();
            $this->actingAs($registrar)->getJson("/api/reports/students/{$student->id}/statement")->assertForbidden();
        });
    }

    public function test_accounting_student_statement_returns_only_the_current_account_contract(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $student = Student::query()->create(['lrn' => '000000009201', 'full_name' => 'Statement Sample Student', 'status' => 'enrolled']);
        $currentYear = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $priorYear = SchoolYear::query()->forceCreate(['label' => 'SY 2025-2026', 'starts_on' => '2025-06-01', 'ends_on' => '2026-05-31', 'is_current' => false]);
        BillingAccount::query()->create(['student_id' => $student->id, 'school_year_id' => $priorYear->id, 'status' => 'paid', 'total_due_cents' => 1_000, 'total_paid_cents' => 1_000, 'balance_cents' => 0, 'created_by' => $accounting->id]);
        BillingAccount::query()->create(['student_id' => $student->id, 'school_year_id' => $currentYear->id, 'status' => 'current', 'total_due_cents' => 20_000, 'total_paid_cents' => 5_000, 'balance_cents' => 15_000, 'created_by' => $accounting->id]);
        $withoutCurrentAccount = Student::query()->create(['lrn' => '000000009202', 'full_name' => 'No Current Account (sample)', 'status' => 'enrolled']);

        $this->actingAs($accounting)->getJson("/api/reports/students/{$student->id}/statement")
            ->assertOk()
            ->assertJsonPath('data.studentId', (string) $student->id)
            ->assertJsonPath('data.lrn', '000000009201')
            ->assertJsonPath('data.schoolYear', 'SY 2026-2027')
            ->assertJsonPath('data.totalDueCents', 20_000)
            ->assertJsonPath('data.totalPaidCents', 5_000)
            ->assertJsonPath('data.balanceCents', 15_000);

        $this->actingAs($accounting)->getJson("/api/reports/students/{$withoutCurrentAccount->id}/statement")
            ->assertNotFound()
            ->assertJsonPath('message', 'No billing account exists for the current school year.');
    }

    public function test_archived_year_keeps_valid_and_pending_void_collections_but_excludes_voided_payments(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        SchoolYear::query()->forceCreate(['label' => 'SY 2027-2028', 'starts_on' => '2027-06-01', 'ends_on' => '2028-05-31', 'is_current' => true]);
        $priorYear = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => false]);
        $student = Student::query()->create(['lrn' => '000000009203', 'full_name' => 'Historical Sample Student', 'status' => 'enrolled']);
        $account = BillingAccount::query()->create(['student_id' => $student->id, 'school_year_id' => $priorYear->id, 'status' => 'current', 'total_due_cents' => 20_000, 'total_paid_cents' => 18_000, 'balance_cents' => 2_000, 'created_by' => $cashier->id]);
        $this->createPayment($account, $student, $cashier, 10_000, 'OR-SAMPLE-9201');
        $this->createPayment($account, $student, $cashier, 5_000, 'OR-SAMPLE-9202')->forceFill(['status' => 'void_pending'])->save();
        $this->createPayment($account, $student, $cashier, 3_000, 'OR-SAMPLE-9203')->forceFill(['status' => 'voided'])->save();

        $before = $this->actingAs($accounting)->getJson('/api/reports/daily?date=2026-10-24')->assertOk();
        $before->assertJsonPath('data.totalCents', 15_000)
            ->assertJsonPath('data.byMethod.0.transactionCount', 2)
            ->assertJsonPath('data.meta.totalPayments', 3);

        $priorYear->forceFill(['archived_at' => now()])->save();
        $after = $this->actingAs($accounting)->getJson('/api/reports/daily?date=2026-10-24')->assertOk();

        $this->assertSame($before->json('data.totalCents'), $after->json('data.totalCents'));
        $this->assertSame($before->json('data.byMethod'), $after->json('data.byMethod'));
        $this->assertSame($before->json('data.meta.totalPayments'), $after->json('data.meta.totalPayments'));
        $this->assertSame(18_000, $account->fresh()->total_paid_cents);
        $this->assertDatabaseCount('receipts', 3);
    }

    private function createPayment(BillingAccount $account, Student $student, User $cashier, int $amount, string $receiptNo): Payment
    {
        $payment = Payment::query()->create([
            'billing_account_id' => $account->id,
            'student_id' => $student->id,
            'amount_cents' => $amount,
            'method' => 'cash',
            'paid_on' => '2026-10-24',
            'status' => 'valid',
            'recorded_by' => $cashier->id,
            'recorded_at' => now(),
        ]);
        Receipt::query()->create(['payment_id' => $payment->id, 'sequence' => $payment->id, 'receipt_no' => $receiptNo, 'receipt_year' => 2026, 'issued_at' => now()]);

        return $payment;
    }
}
