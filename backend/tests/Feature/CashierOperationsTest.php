<?php

namespace Tests\Feature;

use App\Jobs\DeliverNotification;
use App\Models\BillingAccount;
use App\Models\CloseOut;
use App\Models\GradeLevel;
use App\Models\Guardian;
use App\Models\Installment;
use App\Models\NotificationLog;
use App\Models\Payment;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use App\Services\AuditLogger;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

class CashierOperationsTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_payment_history_is_available_to_finance_readers_and_cashiers_remain_scoped(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $payment = $this->recordPayment($cashier, $account, 5_000);

        foreach ([UserRole::Accounting] as $role) {
            $reader = User::factory()->create(['role' => $role]);

            $this->actingAs($reader)->getJson('/api/payments')
                ->assertOk()
                ->assertJsonPath('meta.total', 1)
                ->assertJsonPath('data.0.lrn', '000000001001')
                ->assertJsonPath('data.0.student_grade', 'Test Grade')
                ->assertJsonPath('data.0.student_section', 'Test Section');
            $this->actingAs($reader)->getJson("/api/payments/{$payment->id}")->assertOk();
            $this->actingAs($reader)->withHeader('Idempotency-Key', 'read-only-'.strtolower($role->value))->postJson('/api/payments', [
                'billing_account_id' => $account->id,
                'amount_cents' => 1_000,
                'paid_on' => today('Asia/Manila')->toDateString(),
            ])->assertForbidden();
        }
        $auditor = User::factory()->create(['role' => UserRole::Auditor]);
        $this->actingAs($auditor)->getJson('/api/payments')->assertForbidden();

        $otherCashier = User::factory()->create(['role' => UserRole::Cashier]);
        $this->actingAs($otherCashier)->getJson('/api/payments')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
        $this->actingAs($otherCashier)->getJson("/api/payments/{$payment->id}")->assertNotFound();

        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $this->actingAs($registrar)->getJson('/api/payments')->assertForbidden();
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $this->actingAs($administrator)->getJson('/api/payments')->assertForbidden();
    }

    public function test_payment_history_filters_by_date_cashier_method_status_and_student_search(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $olderPayment = $this->recordPayment($cashier, $account, 1_000);
        $olderPayment->update(['paid_on' => today('Asia/Manila')->subDays(3)->toDateString()]);
        $matchingPayment = $this->recordPayment($cashier, $account, 2_000);
        $matchingPayment->update(['paid_on' => today('Asia/Manila')->subDay()->toDateString(), 'method' => 'check']);

        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $this->actingAs($accounting)->getJson('/api/payments?'.http_build_query([
            'query' => '000000001001',
            'status' => 'valid',
            'date_from' => today('Asia/Manila')->subDays(2)->toDateString(),
            'date_to' => today('Asia/Manila')->toDateString(),
            'cashier' => substr($cashier->full_name, 0, 6),
            'method' => 'check',
            'amount_min_cents' => 2_000,
            'amount_max_cents' => 2_000,
        ]))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', (string) $matchingPayment->id);

        $this->actingAs($accounting)->getJson('/api/payments?'.http_build_query([
            'date_from' => today('Asia/Manila')->toDateString(),
            'date_to' => today('Asia/Manila')->subDay()->toDateString(),
        ]))->assertUnprocessable();

        $this->actingAs($accounting)->getJson('/api/payments?'.http_build_query([
            'amount_min_cents' => 2_001,
            'amount_max_cents' => 2_000,
        ]))->assertUnprocessable()->assertJsonValidationErrors('amount_max_cents');

        $this->actingAs($cashier)->getJson('/api/payments?'.http_build_query(['cashier' => 'not this cashier']))
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }

    public function test_payment_entry_student_lookup_and_billing_context_are_cashier_only(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $student = $account->student;

        $this->actingAs($cashier)->getJson('/api/payment-students?query=000000001001')
            ->assertOk()
            ->assertJsonPath('data.0.id', (string) $student->id)
            ->assertJsonPath('data.0.balance_cents', 20_000)
            ->assertJsonMissingPath('data.0.guardians');

        $this->actingAs($cashier)->getJson("/api/payment-students/{$student->id}/context")
            ->assertOk()
            ->assertJsonPath('data.billing_account_id', (string) $account->id)
            ->assertJsonPath('data.balance_cents', 20_000)
            ->assertJsonPath('data.next_installment.label', 'First fictional installment')
            ->assertJsonMissingPath('data.guardians');

        foreach ([UserRole::SuperAdmin, UserRole::Accounting, UserRole::Admin, UserRole::Auditor, UserRole::Registrar] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->getJson('/api/payment-students?query=000000001001')->assertForbidden();
            $this->actingAs($user)->getJson("/api/payment-students/{$student->id}/context")->assertForbidden();
        }
    }

    public function test_cashier_can_record_a_cash_payment_with_oldest_first_allocation_and_receipt(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        Queue::fake();

        $response = $this->actingAs($cashier)->withHeader('Idempotency-Key', 'payment-receipt-test-001')->postJson('/api/payments', [
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
            'balance_after_cents' => 7_500,
            'status' => 'valid',
        ]);
        $this->assertDatabaseHas('payment_allocations', ['amount_cents' => 12_500]);
        $this->assertDatabaseHas('receipts', ['receipt_no' => 'OR-2026-000001']);
        $this->assertDatabaseHas('notification_logs', ['kind' => 'payment_confirmation', 'status' => 'queued']);
        Queue::assertPushed(DeliverNotification::class, 1);
        $this->assertDatabaseHas('audit_entries', ['action' => 'payment.recorded']);
        $this->assertSame(7_500, $account->fresh()->balance_cents);
        $this->assertSame(12_500, Installment::query()->whereBelongsTo($account)->orderBy('sequence')->value('paid_cents'));
    }

    public function test_cashier_payment_is_rejected_when_it_exceeds_the_account_balance(): void
    {
        [$cashier, $account] = $this->createBillingContext();

        $this->actingAs($cashier)->withHeader('Idempotency-Key', 'payment-receipt-test-002')->postJson('/api/payments', [
            'billing_account_id' => $account->id,
            'amount_cents' => 20_001,
            'paid_on' => today('Asia/Manila')->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors('amount_cents');

        $this->assertDatabaseCount('payments', 0);
        $this->assertSame(20_000, $account->fresh()->balance_cents);
    }

    public function test_cashier_can_queue_email_and_sms_receipts_without_charging_the_student_balance(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        config()->set('services.sms.load_fee_cents', 75);
        Queue::fake();

        $response = $this->actingAs($cashier)->withHeader('Idempotency-Key', 'payment-receipt-test-003')->postJson('/api/payments', [
            'billing_account_id' => $account->id,
            'amount_cents' => 12_500,
            'paid_on' => today('Asia/Manila')->toDateString(),
            'notification_channels' => ['email', 'sms'],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email_queued', true)
            ->assertJsonPath('data.sms_queued', true)
            ->assertJsonPath('data.sms_load_fee_cents', 75);

        $this->assertDatabaseHas('notification_logs', [
            'channel' => 'email',
            'guardian_email' => 'gale.guardian@example.test',
            'status' => 'queued',
        ]);
        $this->assertDatabaseHas('notification_logs', [
            'channel' => 'sms',
            'guardian_mobile' => '09175550100',
            'load_fee_cents' => 75,
            'status' => 'queued',
        ]);
        Queue::assertPushed(DeliverNotification::class, 2);
        $this->assertSame(7_500, $account->fresh()->balance_cents);
    }

    public function test_cashier_can_retry_a_failed_payment_confirmation_email(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $payment = $this->recordPayment($cashier, $account, 12_500);
        $notification = NotificationLog::query()->where('payment_id', $payment->id)->where('channel', 'email')->firstOrFail();
        $notification->forceFill(['status' => 'failed', 'failure_reason' => 'Test provider rejection.', 'attempts' => 1])->save();
        Queue::fake();

        $this->actingAs($cashier)->postJson("/api/notifications/{$notification->id}/retry")
            ->assertAccepted()
            ->assertJsonPath('data.id', (string) $notification->id)
            ->assertJsonPath('data.status', 'queued');

        $this->assertDatabaseHas('notification_logs', ['id' => $notification->id, 'status' => 'queued', 'failure_reason' => null, 'attempts' => 1]);
        $this->assertDatabaseHas('audit_entries', ['action' => 'notification.retried', 'entity_id' => (string) $notification->id]);
        Queue::assertPushed(DeliverNotification::class, fn (DeliverNotification $job): bool => $job->notificationLogId === $notification->id);
        $this->actingAs($cashier)->postJson("/api/notifications/{$notification->id}/retry")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('notification');
        Queue::assertPushed(DeliverNotification::class, 1);
    }

    public function test_same_student_and_amount_within_ten_minutes_requires_an_override_reason(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $payload = [
            'billing_account_id' => $account->id,
            'amount_cents' => 5_000,
            'paid_on' => today('Asia/Manila')->toDateString(),
        ];

        $this->actingAs($cashier)->withHeader('Idempotency-Key', 'duplicate-window-first')->postJson('/api/payments', $payload)->assertCreated();
        $this->actingAs($cashier)->withHeader('Idempotency-Key', 'duplicate-window-second')->postJson('/api/payments', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('duplicate_override_reason');

        $this->assertDatabaseCount('payments', 1);
    }

    public function test_accounting_approval_voids_the_payment_and_restores_the_billing_balance(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $payment = $this->recordPayment($cashier, $account, 12_500);

        foreach ([UserRole::SuperAdmin, UserRole::Accounting, UserRole::Admin, UserRole::Auditor, UserRole::Registrar] as $role) {
            $user = $role === UserRole::Accounting ? $accounting : User::factory()->create(['role' => $role]);
            $this->actingAs($user)->postJson("/api/payments/{$payment->id}/void-requests", [
                'reason' => 'Unauthorized fictional reversal request.',
            ])->assertForbidden();
        }

        $voidResponse = $this->actingAs($cashier)->postJson("/api/payments/{$payment->id}/void-requests", [
            'reason' => 'Duplicate fictional counter entry.',
        ]);

        $voidResponse->assertCreated()->assertJsonPath('data.status', 'pending');
        $voidRequestId = $voidResponse->json('data.id');
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'void_pending']);

        $this->actingAs($cashier)->patchJson("/api/void-requests/{$voidRequestId}", [
            'decision' => 'approved',
            'decision_note' => 'A requester cannot decide the request.',
        ])->assertForbidden();

        $auditor = User::factory()->create(['role' => UserRole::Auditor]);
        $this->actingAs($auditor)->patchJson("/api/void-requests/{$voidRequestId}", [
            'decision' => 'approved',
            'decision_note' => 'An auditor cannot decide the request.',
        ])->assertForbidden();

        foreach ([UserRole::SuperAdmin, UserRole::Admin, UserRole::Registrar] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->patchJson("/api/void-requests/{$voidRequestId}", [
                'decision' => 'approved',
                'decision_note' => 'This role cannot decide the request.',
            ])->assertForbidden();
        }

        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'void_pending']);

        $decisionResponse = $this->actingAs($accounting)->patchJson("/api/void-requests/{$voidRequestId}", [
            'decision' => 'approved',
            'decision_note' => 'Verified duplicate entry in the test drawer.',
        ]);

        $decisionResponse->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.decided_by', $accounting->full_name);
        $this->assertNotNull($decisionResponse->json('data.decided_at'));

        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'voided']);
        $this->assertSame(20_000, $account->fresh()->balance_cents);
        $this->assertSame(0, Installment::query()->whereBelongsTo($account)->orderBy('sequence')->value('paid_cents'));
        $this->assertDatabaseHas('void_requests', [
            'id' => $voidRequestId,
            'requested_by' => $cashier->id,
            'decided_by' => $accounting->id,
            'status' => 'approved',
        ]);
        $this->assertDatabaseHas('audit_entries', ['action' => 'payment.void_approved']);
        $this->assertDatabaseHas('audit_entries', ['user_id' => $cashier->id, 'action' => 'payment.void_requested']);
        $this->assertDatabaseHas('audit_entries', ['user_id' => $accounting->id, 'action' => 'payment.void_approved']);

        $this->actingAs($cashier)->postJson("/api/payments/{$payment->id}/reprint")
            ->assertOk()
            ->assertJsonPath('data.status', 'voided');
    }

    public function test_void_request_is_rolled_back_when_audit_recording_fails(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $payment = $this->recordPayment($cashier, $account, 12_500);

        $this->mock(AuditLogger::class, function (MockInterface $mock): void {
            $mock->shouldReceive('record')->once()->andThrow(new RuntimeException('Audit storage failed.'));
        });

        $this->actingAs($cashier)->postJson("/api/payments/{$payment->id}/void-requests", [
            'reason' => 'Fictional request used to prove audit rollback.',
        ])->assertInternalServerError();

        $this->assertDatabaseCount('void_requests', 0);
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'valid']);
        $this->assertDatabaseMissing('audit_entries', ['action' => 'payment.void_requested']);
    }

    public function test_void_decision_is_rolled_back_when_audit_recording_fails(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $payment = $this->recordPayment($cashier, $account, 12_500);
        $voidRequestId = $this->actingAs($cashier)->postJson("/api/payments/{$payment->id}/void-requests", [
            'reason' => 'Fictional request used to prove decision rollback.',
        ])->assertCreated()->json('data.id');

        $this->mock(AuditLogger::class, function (MockInterface $mock): void {
            $mock->shouldReceive('record')->once()->andThrow(new RuntimeException('Audit storage failed.'));
        });

        $this->actingAs($accounting)->patchJson("/api/void-requests/{$voidRequestId}", [
            'decision' => 'approved',
            'decision_note' => 'Fictional approval used to prove audit rollback.',
        ])->assertInternalServerError();

        $this->assertDatabaseHas('void_requests', ['id' => $voidRequestId, 'status' => 'pending', 'decided_by' => null]);
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'void_pending']);
        $this->assertSame(7_500, $account->fresh()->balance_cents);
        $this->assertDatabaseMissing('audit_entries', ['action' => 'payment.void_approved']);
    }

    public function test_cashier_void_request_history_is_own_scoped_while_accounting_sees_all_requests(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $ownPayment = $this->recordPayment($cashier, $account, 5_000);
        $ownRequest = $this->actingAs($cashier)->postJson("/api/payments/{$ownPayment->id}/void-requests", [
            'reason' => 'Duplicate fictional payment entry.',
        ])->assertCreated()->json('data.id');

        $otherCashier = User::factory()->create(['role' => UserRole::Cashier]);
        $otherPayment = $this->recordPayment($otherCashier, $account, 6_000);
        $otherRequest = $this->actingAs($otherCashier)->postJson("/api/payments/{$otherPayment->id}/void-requests", [
            'reason' => 'Second cashier duplicate entry.',
        ])->assertCreated()->json('data.id');

        $this->actingAs($cashier)->getJson('/api/void-requests')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', (string) $ownRequest);

        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $this->actingAs($accounting)->getJson('/api/void-requests')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => (string) $ownRequest])
            ->assertJsonFragment(['id' => (string) $otherRequest]);

        foreach ([UserRole::SuperAdmin, UserRole::Admin, UserRole::Auditor, UserRole::Registrar] as $role) {
            $reader = User::factory()->create(['role' => $role]);
            $this->actingAs($reader)->getJson('/api/void-requests')->assertForbidden();
        }
    }

    public function test_cashier_can_submit_only_one_daily_close_out_and_non_zero_variance_needs_a_reason(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $this->recordPayment($cashier, $account, 10_000);

        $this->actingAs($cashier)->postJson('/api/close-outs', [
            'counted_cash_cents' => 9_000,
        ])->assertUnprocessable()->assertJsonValidationErrors('variance_reason');

        $submitted = $this->actingAs($cashier)->postJson('/api/close-outs', [
            'counted_cash_cents' => 9_000,
            'variance_reason' => 'Fictional drawer count is short by one hundred pesos.',
        ])->assertCreated()
            ->assertJsonPath('data.system_cash_cents', 10_000)
            ->assertJsonPath('data.variance_cents', -1_000);

        $closeOutId = $submitted->json('data.id');
        $this->actingAs($cashier)->postJson("/api/close-outs/{$closeOutId}/sign-off")->assertForbidden();
        foreach ([UserRole::SuperAdmin, UserRole::Admin, UserRole::Auditor, UserRole::Registrar] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->postJson("/api/close-outs/{$closeOutId}/sign-off")->assertForbidden();
        }

        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $this->actingAs($accounting)->postJson("/api/close-outs/{$closeOutId}/sign-off")
            ->assertOk()
            ->assertJsonPath('data.signed_off_by', $accounting->full_name);

        $signedOff = $this->actingAs($accounting)->postJson("/api/close-outs/{$closeOutId}/sign-off");
        $signedOff->assertUnprocessable();
        $this->assertDatabaseHas('close_outs', [
            'id' => $closeOutId,
            'signed_off_by' => $accounting->id,
            'counted_cash_cents' => 9_000,
            'variance_cents' => -1_000,
        ]);
        $this->assertDatabaseHas('audit_entries', [
            'user_id' => $accounting->id,
            'action' => 'closeout.signed_off',
            'entity_id' => (string) $closeOutId,
        ]);
        $this->actingAs($accounting)->patchJson("/api/close-outs/{$closeOutId}", [
            'counted_cash_cents' => 10_000,
        ])->assertNotFound();

        $this->actingAs($cashier)->postJson('/api/close-outs', [
            'counted_cash_cents' => 10_000,
        ])->assertUnprocessable()->assertJsonValidationErrors('close_out');
    }

    public function test_cashier_close_out_returns_system_totals_by_payment_method_while_variance_uses_cash_only(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $this->recordPayment($cashier, $account, 10_000);
        $checkPayment = $this->recordPayment($cashier, $account, 5_000);
        $checkPayment->update(['method' => 'check']);

        $this->actingAs($cashier)->getJson('/api/close-outs/today')
            ->assertOk()
            ->assertJsonPath('data.system_cash_cents', 10_000)
            ->assertJsonPath('data.system_totals.cash', 10_000)
            ->assertJsonPath('data.system_totals.check', 5_000);

        $submitted = $this->actingAs($cashier)->postJson('/api/close-outs', [
            'counted_cash_cents' => 10_000,
        ])->assertCreated()
            ->assertJsonPath('data.system_cash_cents', 10_000)
            ->assertJsonPath('data.system_totals.cash', 10_000)
            ->assertJsonPath('data.system_totals.check', 5_000)
            ->assertJsonPath('data.variance_cents', 0);

        $closeOut = CloseOut::query()->findOrFail($submitted->json('data.id'));
        $this->assertSame([
            'cash_cents' => 10_000,
            'by_method' => ['cash' => 10_000, 'check' => 5_000],
        ], $closeOut->system_totals);
    }

    public function test_close_out_submission_is_rolled_back_when_audit_recording_fails(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $this->recordPayment($cashier, $account, 10_000);

        $this->mock(AuditLogger::class, function (MockInterface $mock): void {
            $mock->shouldReceive('record')->once()->andThrow(new RuntimeException('Audit storage failed.'));
        });

        $this->actingAs($cashier)->postJson('/api/close-outs', [
            'counted_cash_cents' => 10_000,
        ])->assertInternalServerError();

        $this->assertDatabaseCount('close_outs', 0);
        $this->assertDatabaseMissing('audit_entries', ['action' => 'closeout.submitted']);
    }

    public function test_adjustment_is_rolled_back_when_audit_recording_fails(): void
    {
        [$cashier, $account] = $this->createBillingContext();

        $this->mock(AuditLogger::class, function (MockInterface $mock): void {
            $mock->shouldReceive('record')->once()->andThrow(new RuntimeException('Audit storage failed.'));
        });

        $this->actingAs($cashier)->postJson("/api/billing-accounts/{$account->id}/adjustments", [
            'type' => 'correction',
            'amount_cents' => 1_000,
            'reason' => 'Fictional correction used to prove audit rollback.',
        ])->assertInternalServerError();

        $this->assertDatabaseCount('adjustments', 0);
        $this->assertSame(20_000, $account->fresh()->total_due_cents);
        $this->assertSame(20_000, $account->fresh()->balance_cents);
        $this->assertDatabaseMissing('audit_entries', ['action' => 'adjustment.created']);
    }

    public function test_cashier_can_create_a_billing_adjustment_contract(): void
    {
        [$cashier, $account] = $this->createBillingContext();

        $response = $this->actingAs($cashier)->postJson("/api/billing-accounts/{$account->id}/adjustments", [
            'type' => 'discount',
            'amount_cents' => -1_500,
            'reason' => 'Fictional scholarship review approval.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.type', 'discount')
            ->assertJsonPath('data.amountCents', -1_500)
            ->assertJsonPath('data.reason', 'Fictional scholarship review approval.')
            ->assertJsonPath('data.createdBy', $cashier->full_name);
        $this->assertSame(18_500, $account->fresh()->total_due_cents);
        $this->assertSame(18_500, $account->fresh()->balance_cents);
        $this->assertDatabaseHas('audit_entries', ['action' => 'adjustment.created', 'user_id' => $cashier->id]);
    }

    public function test_business_date_simulator_uses_date_matched_fictional_payments_and_preserves_locks_and_sign_off(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $firstDate = '2026-11-03';
        $secondDate = '2026-11-04';

        $this->actingAs($cashier)->postJson('/api/close-outs/business-date', ['business_datetime' => $firstDate.'T09:30'])
            ->assertOk()
            ->assertJsonPath('data.business_date', $firstDate)
            ->assertJsonPath('data.simulated_at', $firstDate.'T09:30:00+08:00');
        $this->recordPayment($cashier, $account, 1_000)->update(['paid_on' => $firstDate]);
        $this->actingAs($cashier)->getJson('/api/close-outs/today')
            ->assertOk()
            ->assertJsonPath('data.business_date', $firstDate)
            ->assertJsonPath('data.system_cash_cents', 1_000);
        $firstCloseOut = $this->actingAs($cashier)->postJson('/api/close-outs', ['counted_cash_cents' => 1_000])
            ->assertCreated()
            ->assertJsonPath('data.variance_cents', 0);

        $this->actingAs($cashier)->postJson('/api/close-outs/business-date', ['business_datetime' => $secondDate.'T15:45'])->assertOk();
        $this->recordPayment($cashier, $account, 2_000)->update(['paid_on' => $secondDate]);
        $secondCloseOut = $this->actingAs($cashier)->getJson('/api/close-outs/today')
            ->assertOk()
            ->assertJsonPath('data.business_date', $secondDate)
            ->assertJsonPath('data.system_cash_cents', 2_000);
        $submitted = $this->actingAs($cashier)->postJson('/api/close-outs', [
            'counted_cash_cents' => 2_500,
            'variance_reason' => 'Fictional overage used to test the second business day.',
        ])->assertCreated()
            ->assertJsonPath('data.variance_cents', 500);

        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $this->actingAs($accounting)->postJson('/api/close-outs/'.$submitted->json('data.id').'/sign-off')->assertOk();

        $this->actingAs($cashier)->postJson('/api/close-outs/business-date', ['business_datetime' => $firstDate.'T09:30'])->assertOk();
        $this->actingAs($cashier)->getJson('/api/close-outs/today')
            ->assertJsonPath('data.close_out.id', (string) $firstCloseOut->json('data.id'));
        $this->actingAs($cashier)->postJson('/api/close-outs', ['counted_cash_cents' => 1_000])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('close_out');

        $this->assertDatabaseHas('close_outs', ['business_date' => $secondDate.' 00:00:00', 'signed_off_by' => $accounting->id]);
        $this->actingAs($cashier)->deleteJson('/api/close-outs/business-date')
            ->assertOk()
            ->assertJsonPath('data.simulated_at', null);
    }

    public function test_business_date_simulator_is_rejected_outside_local_or_testing(): void
    {
        [$cashier] = $this->createBillingContext();
        config(['app.env' => 'production', 'business_date_simulator.enabled' => true]);

        $this->actingAs($cashier)->getJson('/api/close-outs/business-date')->assertNotFound();
        $this->actingAs($cashier)->postJson('/api/close-outs/business-date', ['business_datetime' => '2026-11-03T09:30'])->assertNotFound();
    }

    public function test_cashier_close_out_history_is_limited_to_their_own_records(): void
    {
        [$cashier] = $this->createBillingContext();
        $otherCashier = User::factory()->create(['role' => UserRole::Cashier]);
        $ownCloseOut = $this->createCloseOutFor($cashier, '2026-10-20');
        $this->createCloseOutFor($otherCashier, '2026-10-21');

        $this->actingAs($cashier)->getJson('/api/close-outs/today')->assertOk();
        $this->actingAs($cashier)->getJson('/api/close-outs')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', (string) $ownCloseOut->id);

        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $this->actingAs($accounting)->getJson('/api/close-outs/today')->assertForbidden();
        $this->actingAs($accounting)->getJson('/api/close-outs')->assertOk()->assertJsonCount(2, 'data');

        foreach ([UserRole::SuperAdmin, UserRole::Admin, UserRole::Auditor, UserRole::Registrar] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->getJson('/api/close-outs/today')->assertForbidden();
            $this->actingAs($user)->getJson('/api/close-outs')->assertForbidden();
        }
    }

    /** @return array{User, BillingAccount} */
    private function createBillingContext(): array
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $schoolYear = SchoolYear::query()->forceCreate([
            'label' => 'SY test',
            'starts_on' => '2026-06-01',
            'ends_on' => '2027-05-31',
            'is_current' => true,
        ]);
        $gradeLevel = GradeLevel::query()->forceCreate(['name' => 'Test Grade', 'sort_order' => 99]);
        $section = Section::query()->forceCreate(['grade_level_id' => $gradeLevel->id, 'name' => 'Test Section']);
        $student = Student::query()->create([
            'lrn' => '000000001001',
            'full_name' => 'Talia Test Student (sample)',
            'grade_level_id' => $gradeLevel->id,
            'section_id' => $section->id,
        ]);
        $guardian = Guardian::query()->forceCreate([
            'full_name' => 'Gale Guardian (sample)',
            'relationship' => 'Parent',
            'email' => 'gale.guardian@example.test',
            'email_status' => 'verified',
            'mobile' => '09175550100',
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

    private function createCloseOutFor(User $cashier, string $date): CloseOut
    {
        return CloseOut::query()->create([
            'business_date' => $date,
            'cashier_id' => $cashier->id,
            'system_totals' => ['cash_cents' => 0],
            'counted_cash_cents' => 0,
            'variance_cents' => 0,
            'submitted_at' => now(),
        ]);
    }

    private function recordPayment(User $cashier, BillingAccount $account, int $amountCents): Payment
    {
        $response = $this->actingAs($cashier)->withHeader('Idempotency-Key', 'payment-helper-'.fake()->uuid())->postJson('/api/payments', [
            'billing_account_id' => $account->id,
            'amount_cents' => $amountCents,
            'paid_on' => today('Asia/Manila')->toDateString(),
        ]);

        $response->assertCreated();

        return Payment::query()->findOrFail($response->json('data.id'));
    }

    public function test_repeating_a_payment_with_the_same_idempotency_key_replays_one_receipt(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $payload = [
            'billing_account_id' => $account->id,
            'amount_cents' => 5_000,
            'paid_on' => today('Asia/Manila')->toDateString(),
        ];

        $first = $this->actingAs($cashier)
            ->withHeader('Idempotency-Key', 'retry-safe-payment-001')
            ->postJson('/api/payments', $payload);
        $first->assertCreated();

        $replayed = $this->actingAs($cashier)
            ->withHeader('Idempotency-Key', 'retry-safe-payment-001')
            ->postJson('/api/payments', $payload);
        $replayed->assertCreated()
            ->assertHeader('Idempotency-Replayed', 'true')
            ->assertJsonPath('data.id', $first->json('data.id'))
            ->assertJsonPath('data.receipt_no', $first->json('data.receipt_no'));

        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseCount('receipts', 1);
        $this->assertSame(15_000, $account->fresh()->balance_cents);
    }

    public function test_receipt_sequence_counter_continues_from_existing_global_sequence(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        DB::table('receipt_sequences')->where('id', 1)->update(['last_sequence' => 37]);

        $response = $this->actingAs($cashier)->withHeader('Idempotency-Key', 'receipt-counter-continuation')->postJson('/api/payments', [
            'billing_account_id' => $account->id,
            'amount_cents' => 5_000,
            'paid_on' => today('Asia/Manila')->toDateString(),
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.receipt_no', 'OR-'.today('Asia/Manila')->year.'-000038');
        $this->assertDatabaseHas('receipt_sequences', ['id' => 1, 'last_sequence' => 38]);
        $this->assertDatabaseHas('receipts', ['sequence' => 38]);
    }

    public function test_idempotency_key_cannot_be_reused_for_a_different_payment(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $payload = [
            'billing_account_id' => $account->id,
            'amount_cents' => 5_000,
            'paid_on' => today('Asia/Manila')->toDateString(),
        ];

        $this->actingAs($cashier)
            ->withHeader('Idempotency-Key', 'payment-key-body-bound')
            ->postJson('/api/payments', $payload)
            ->assertCreated();

        $this->actingAs($cashier)
            ->withHeader('Idempotency-Key', 'payment-key-body-bound')
            ->postJson('/api/payments', [...$payload, 'amount_cents' => 7_000])
            ->assertConflict();

        $this->assertDatabaseCount('payments', 1);
        $this->assertSame(15_000, $account->fresh()->balance_cents);
    }

    public function test_payment_submission_requires_an_idempotency_key(): void
    {
        [$cashier, $account] = $this->createBillingContext();

        $this->actingAs($cashier)->postJson('/api/payments', [
            'billing_account_id' => $account->id,
            'amount_cents' => 5_000,
            'paid_on' => today('Asia/Manila')->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors('idempotency_key');

        $this->assertDatabaseCount('payments', 0);
        $this->assertSame(20_000, $account->fresh()->balance_cents);
    }

    public function test_payment_detail_keeps_its_balance_after_snapshot_when_later_payments_post(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $first = $this->actingAs($cashier)
            ->withHeader('Idempotency-Key', 'payment-snapshot-first')
            ->postJson('/api/payments', [
                'billing_account_id' => $account->id,
                'amount_cents' => 5_000,
                'paid_on' => today('Asia/Manila')->toDateString(),
            ])->assertCreated();

        $this->actingAs($cashier)
            ->withHeader('Idempotency-Key', 'payment-snapshot-second')
            ->postJson('/api/payments', [
                'billing_account_id' => $account->id,
                'amount_cents' => 2_000,
                'paid_on' => today('Asia/Manila')->toDateString(),
            ])->assertCreated();

        $paymentId = $first->json('data.id');
        foreach ([UserRole::Cashier, UserRole::Accounting] as $role) {
            $reader = $role === UserRole::Cashier ? $cashier : User::factory()->create(['role' => $role]);
            $this->actingAs($reader)->getJson('/api/payments/'.$paymentId)
                ->assertOk()
                ->assertJsonPath('data.balance_after_cents', 15_000)
                ->assertJsonPath('data.notifications.0.channel', 'email')
                ->assertJsonPath('data.notifications.0.status', 'queued')
                ->assertJsonMissingPath('data.notifications.0.guardian_email')
                ->assertJsonPath('data.audit_trail.0.action', 'payment.recorded')
                ->assertJsonPath('data.audit_trail.0.actor_name', $cashier->full_name);
        }
        $auditor = User::factory()->create(['role' => UserRole::Auditor]);
        $this->actingAs($auditor)->getJson('/api/payments/'.$paymentId)->assertForbidden();

        $otherCashier = User::factory()->create(['role' => UserRole::Cashier]);
        $this->actingAs($otherCashier)->getJson('/api/payments/'.$paymentId)->assertNotFound();
        $registrar = User::factory()->create(['role' => UserRole::Registrar]);
        $this->actingAs($registrar)->getJson('/api/payments/'.$paymentId)->assertForbidden();
        $administrator = User::factory()->create(['role' => UserRole::Admin]);
        $this->actingAs($administrator)->getJson('/api/payments/'.$paymentId)->assertForbidden();
        $this->assertSame(13_000, $account->fresh()->balance_cents);
    }

    public function test_first_receipt_print_does_not_count_as_a_reprint_but_later_prints_do(): void
    {
        [$cashier, $account] = $this->createBillingContext();
        $payment = $this->actingAs($cashier)
            ->withHeader('Idempotency-Key', 'receipt-print-first')
            ->postJson('/api/payments', [
                'billing_account_id' => $account->id,
                'amount_cents' => 5_000,
                'paid_on' => today('Asia/Manila')->toDateString(),
            ])->assertCreated();
        $paymentId = $payment->json('data.id');

        $firstPrint = $this->actingAs($cashier)->postJson("/api/payments/{$paymentId}/reprint")
            ->assertOk()
            ->assertJsonPath('data.reprint_count', 0)
            ->assertJsonPath('data.allocations.0.amount_cents', 5_000)
            ->assertJsonPath('data.school_year', $account->schoolYear->label)
            ->assertJsonStructure(['data' => ['student_grade', 'student_section']]);
        $this->assertNotNull($firstPrint->json('data.first_printed_at'));
        $this->assertDatabaseHas('audit_entries', ['action' => 'receipt.printed', 'entity_id' => $paymentId]);

        $this->actingAs($cashier)->postJson("/api/payments/{$paymentId}/reprint")
            ->assertOk()
            ->assertJsonPath('data.reprint_count', 1);
        $this->assertDatabaseHas('audit_entries', ['action' => 'receipt.reprinted', 'entity_id' => $paymentId]);

        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $this->actingAs($accounting)->postJson("/api/payments/{$paymentId}/reprint")
            ->assertOk()
            ->assertJsonPath('data.reprint_count', 2);
        foreach ([UserRole::SuperAdmin, UserRole::Admin, UserRole::Auditor, UserRole::Registrar] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->postJson("/api/payments/{$paymentId}/reprint")->assertForbidden();
        }
    }
}
