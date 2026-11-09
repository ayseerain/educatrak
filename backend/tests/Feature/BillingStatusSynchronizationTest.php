<?php

namespace Tests\Feature;

use App\Models\BillingAccount;
use App\Models\Installment;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\SystemSetting;
use App\Models\User;
use App\UserRole;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class BillingStatusSynchronizationTest extends TestCase
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

    public function test_payment_and_void_recalculate_installment_and_account_statuses_using_the_configured_window(): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $account = $this->createAccount($cashier);
        SystemSetting::query()->create(['key' => 'billing.due_soon_days', 'value' => 3]);

        $past = $this->createInstallment($account, '2026-10-20', 15_000, 1);
        $dueSoon = $this->createInstallment($account, '2026-10-27', 5_000, 2);
        $current = $this->createInstallment($account, '2026-10-28', 5_000, 3);

        $paymentResponse = $this->actingAs($cashier)
            ->withHeader('Idempotency-Key', 'status-sync-payment')
            ->postJson('/api/payments', [
                'billing_account_id' => $account->id,
                'amount_cents' => 2_500,
                'paid_on' => '2026-10-24',
            ]);
        $paymentResponse->assertCreated();

        $past->refresh();
        $dueSoon->refresh();
        $current->refresh();
        $this->assertSame('overdue', $past->status);
        $this->assertSame('due_soon', $dueSoon->status);
        $this->assertSame('current', $current->status);
        $this->assertSame('overdue', $account->fresh()->status);

        $paymentId = $paymentResponse->json('data.id');
        $voidResponse = $this->actingAs($cashier)->postJson("/api/payments/{$paymentId}/void-requests", [
            'reason' => 'Reverse the fictional test payment.',
        ])->assertCreated();
        $this->actingAs($accounting)->patchJson('/api/void-requests/'.$voidResponse->json('data.id'), [
            'decision' => 'approved',
            'decision_note' => 'Test reversal approved.',
        ])->assertOk();

        $this->assertSame(0, $past->fresh()->paid_cents);
        $this->assertSame('overdue', $past->fresh()->status);
        $this->assertSame('due_soon', $dueSoon->fresh()->status);
        $this->assertSame('current', $current->fresh()->status);
        $this->assertSame('overdue', $account->fresh()->status);

        $this->actingAs($cashier)->withHeader('Idempotency-Key', 'status-sync-pay-in-full')->postJson('/api/payments', [
            'billing_account_id' => $account->id,
            'amount_cents' => 25_000,
            'paid_on' => '2026-10-24',
        ])->assertCreated();

        $this->assertSame('paid', $past->fresh()->status);
        $this->assertSame('paid', $dueSoon->fresh()->status);
        $this->assertSame('paid', $current->fresh()->status);
        $this->assertSame('paid', $account->fresh()->status);
    }

    public function test_missing_due_soon_setting_uses_the_approved_seven_day_default(): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $account = $this->createAccount($cashier);
        $installment = $this->createInstallment($account, '2026-10-31', 25_000, 1);

        $this->actingAs($cashier)->withHeader('Idempotency-Key', 'status-sync-default-window')->postJson('/api/payments', [
            'billing_account_id' => $account->id,
            'amount_cents' => 1_000,
            'paid_on' => '2026-10-24',
        ])->assertCreated();

        $this->assertSame('due_soon', $installment->fresh()->status);
        $this->assertSame('due_soon', $account->fresh()->status);
    }

    public function test_scheduled_recalculation_ages_due_soon_accounts_into_overdue(): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $account = $this->createAccount($cashier);
        $installment = $this->createInstallment($account, '2026-10-25', 25_000, 1);

        Artisan::call('educatrak:recalculate-billing-statuses');
        $this->assertSame('due_soon', $installment->fresh()->status);
        $this->assertSame('due_soon', $account->fresh()->status);

        Carbon::setTestNow(Carbon::parse('2026-10-26 00:10:00', 'Asia/Manila'));
        Artisan::call('educatrak:recalculate-billing-statuses');
        $this->assertSame('overdue', $installment->fresh()->status);
        $this->assertSame('overdue', $account->fresh()->status);
    }

    private function createAccount(User $cashier): BillingAccount
    {
        $year = SchoolYear::query()->forceCreate([
            'label' => 'SY 2026-2027 sample',
            'starts_on' => '2026-06-01',
            'ends_on' => '2027-05-31',
            'is_current' => true,
        ]);
        $student = Student::query()->create([
            'student_no' => 'SAMPLE-STATUS-01',
            'full_name' => 'Riley Sample',
            'status' => 'enrolled',
        ]);

        return BillingAccount::query()->create([
            'student_id' => $student->id,
            'school_year_id' => $year->id,
            'status' => 'current',
            'total_due_cents' => 25_000,
            'total_paid_cents' => 0,
            'balance_cents' => 25_000,
            'created_by' => $cashier->id,
        ]);
    }

    private function createInstallment(BillingAccount $account, string $dueDate, int $amountCents, int $sequence): Installment
    {
        return Installment::query()->create([
            'billing_account_id' => $account->id,
            'label' => "Sample installment {$sequence}",
            'sequence' => $sequence,
            'due_date' => $dueDate,
            'amount_cents' => $amountCents,
            'paid_cents' => 0,
            'status' => 'current',
        ]);
    }
}
