<?php

namespace Tests\Feature;

use App\Models\BillingAccount;
use App\Models\GradeLevel;
use App\Models\Guardian;
use App\Models\Installment;
use App\Models\Payment;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class CashierOperationsTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_cashier_can_record_a_cash_payment_with_oldest_first_allocation_and_receipt(): void
    {
        [$cashier, $account] = $this->createBillingContext();

        $response = $this->actingAs($cashier)->postJson('/api/payments', [
            'billing_account_id' => $account->id,
            'amount_cents' => 12_500,
            'paid_on' => today('Asia/Manila')->toDateString(),
            'notes' => 'Fictional counter payment.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.amount_cents', 12_500)
            ->assertJsonPath('data.method', 'cash')
            ->assertJsonPath('data.receipt_no', 'OR-2026-000001');

        $this->assertDatabaseHas('payments', [
            'billing_account_id' => $account->id,
            'amount_cents' => 12_500,
            'status' => 'valid',
        ]);
        $this->assertDatabaseHas('payment_allocations', ['amount_cents' => 12_500]);
        $this->assertDatabaseHas('receipts', ['receipt_no' => 'OR-2026-000001']);
        $this->assertDatabaseHas('notification_logs', ['kind' => 'payment_confirmation', 'status' => 'queued']);
        $this->assertDatabaseHas('audit_entries', ['action' => 'payment.recorded']);
        $this->assertSame(7_500, $account->fresh()->balance_cents);
        $this->assertSame(12_500, Installment::query()->whereBelongsTo($account)->orderBy('sequence')->value('paid_cents'));
    }

    public function test_cashier_payment_is_rejected_when_it_exceeds_the_account_balance(): void
    {
        [$cashier, $account] = $this->createBillingContext();

        $this->actingAs($cashier)->postJson('/api/payments', [
            'billing_account_id' => $account->id,
            'amount_cents' => 20_001,
            'paid_on' => today('Asia/Manila')->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors('amount_cents');

        $this->assertDatabaseCount('payments', 0);
        $this->assertSame(20_000, $account->fresh()->balance_cents);
    }

    public function test_same_student_and_amount_within_ten_minutes_requires_an_override_reason(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $payload = [
            'billing_account_id' => $account->id,
            'amount_cents' => 5_000,
            'paid_on' => today('Asia/Manila')->toDateString(),
        ];

        $this->actingAs($cashier)->postJson('/api/payments', $payload)->assertCreated();
        $this->actingAs($cashier)->postJson('/api/payments', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('duplicate_override_reason');

        $this->assertDatabaseCount('payments', 1);
    }

    public function test_accounting_approval_voids_the_payment_and_restores_the_billing_balance(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $payment = $this->recordPayment($cashier, $account, 12_500);

        $voidResponse = $this->actingAs($cashier)->postJson("/api/payments/{$payment->id}/void-requests", [
            'reason' => 'Duplicate fictional counter entry.',
        ]);

        $voidResponse->assertCreated()->assertJsonPath('data.status', 'pending');
        $voidRequestId = $voidResponse->json('data.id');
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'void_pending']);

        $this->actingAs($accounting)->patchJson("/api/void-requests/{$voidRequestId}", [
            'decision' => 'approved',
            'decision_note' => 'Verified duplicate entry in the test drawer.',
        ])->assertOk()->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'voided']);
        $this->assertSame(20_000, $account->fresh()->balance_cents);
        $this->assertSame(0, Installment::query()->whereBelongsTo($account)->orderBy('sequence')->value('paid_cents'));
        $this->assertDatabaseHas('audit_entries', ['action' => 'payment.void_approved']);
    }

    public function test_cashier_can_submit_only_one_daily_close_out_and_non_zero_variance_needs_a_reason(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $this->recordPayment($cashier, $account, 10_000);

        $this->actingAs($cashier)->postJson('/api/close-outs', [
            'counted_cash_cents' => 9_000,
        ])->assertUnprocessable()->assertJsonValidationErrors('variance_reason');

        $this->actingAs($cashier)->postJson('/api/close-outs', [
            'counted_cash_cents' => 9_000,
            'variance_reason' => 'Fictional drawer count is short by one hundred pesos.',
        ])->assertCreated()
            ->assertJsonPath('data.system_cash_cents', 10_000)
            ->assertJsonPath('data.variance_cents', -1_000);

        $this->actingAs($cashier)->postJson('/api/close-outs', [
            'counted_cash_cents' => 10_000,
        ])->assertUnprocessable()->assertJsonValidationErrors('close_out');
    }

    /** @return array{User, BillingAccount} */
    private function createBillingContext(): array
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $schoolYear = SchoolYear::query()->create([
            'label' => 'SY test',
            'starts_on' => '2026-06-01',
            'ends_on' => '2027-05-31',
            'is_current' => true,
        ]);
        $gradeLevel = GradeLevel::query()->create(['name' => 'Test Grade', 'sort_order' => 99]);
        $section = Section::query()->create(['grade_level_id' => $gradeLevel->id, 'name' => 'Test Section']);
        $student = Student::query()->create([
            'student_no' => 'S-TEST-1001',
            'full_name' => 'Talia Test Student (sample)',
            'grade_level_id' => $gradeLevel->id,
            'section_id' => $section->id,
        ]);
        $guardian = Guardian::query()->create([
            'full_name' => 'Gale Guardian (sample)',
            'relationship' => 'Parent',
            'email' => 'gale.guardian@example.test',
            'email_status' => 'verified',
        ]);
        $student->guardians()->attach($guardian->id, ['is_primary' => true]);
        $account = BillingAccount::query()->create([
            'student_id' => $student->id,
            'school_year_id' => $schoolYear->id,
            'status' => 'current',
            'total_due_cents' => 20_000,
            'total_paid_cents' => 0,
            'balance_cents' => 20_000,
            'created_by' => $cashier->id,
        ]);
        Installment::query()->create([
            'billing_account_id' => $account->id,
            'label' => 'First fictional installment',
            'sequence' => 1,
            'due_date' => today('Asia/Manila')->toDateString(),
            'amount_cents' => 15_000,
            'paid_cents' => 0,
            'status' => 'current',
        ]);
        Installment::query()->create([
            'billing_account_id' => $account->id,
            'label' => 'Second fictional installment',
            'sequence' => 2,
            'due_date' => today('Asia/Manila')->addMonth()->toDateString(),
            'amount_cents' => 5_000,
            'paid_cents' => 0,
            'status' => 'current',
        ]);

        return [$cashier, $account];
    }

    private function recordPayment(User $cashier, BillingAccount $account, int $amountCents): Payment
    {
        $response = $this->actingAs($cashier)->postJson('/api/payments', [
            'billing_account_id' => $account->id,
            'amount_cents' => $amountCents,
            'paid_on' => today('Asia/Manila')->toDateString(),
        ]);

        $response->assertCreated();

        return Payment::query()->findOrFail($response->json('data.id'));
    }
}
