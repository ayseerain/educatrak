<?php

namespace Tests\Feature;

use App\Jobs\DeliverNotification;
use App\Models\BillingAccount;
use App\Models\GradeLevel;
use App\Models\Guardian;
use App\Models\Installment;
use App\Models\NotificationLog;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use App\UserRole;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class FollowUpTest extends TestCase
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

    public function test_follow_up_lists_only_unpaid_due_soon_and_overdue_installments_with_contact_details(): void
    {
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $grade = GradeLevel::query()->forceCreate(['name' => 'Grade 5', 'sort_order' => 5]);
        $section = Section::query()->forceCreate(['grade_level_id' => $grade->id, 'name' => 'Sample Section']);
        $student = Student::query()->create(['lrn' => '000000007001', 'full_name' => 'Morgan Sample', 'grade_level_id' => $grade->id, 'section_id' => $section->id, 'status' => 'enrolled']);
        $account = $this->createAccount($student, $year, $cashier);
        $guardian = Guardian::query()->forceCreate(['full_name' => 'Casey Sample Guardian', 'relationship' => 'Guardian', 'email' => 'guardian@example.test', 'email_status' => 'ok', 'mobile' => '09990000000']);
        $student->guardians()->attach($guardian->id, ['is_primary' => true]);
        $overdue = Installment::query()->create(['billing_account_id' => $account->id, 'label' => 'October overdue', 'sequence' => 1, 'due_date' => '2026-10-20', 'amount_cents' => 10_000, 'paid_cents' => 2_500, 'status' => 'overdue']);
        Installment::query()->create(['billing_account_id' => $account->id, 'label' => 'October due soon', 'sequence' => 2, 'due_date' => '2026-10-27', 'amount_cents' => 8_000, 'paid_cents' => 0, 'status' => 'due_soon']);
        Installment::query()->create(['billing_account_id' => $account->id, 'label' => 'Settled installment', 'sequence' => 3, 'due_date' => '2026-10-01', 'amount_cents' => 5_000, 'paid_cents' => 5_000, 'status' => 'paid']);

        $this->actingAs($cashier)->getJson('/api/follow-up?status=overdue&grade=Grade%205&section=Sample%20Section&search=Morgan')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', (string) $overdue->id)
            ->assertJsonPath('data.0.lrn', '000000007001')
            ->assertJsonPath('data.0.amountDueCents', 7_500)
            ->assertJsonPath('data.0.daysOverdue', 4)
            ->assertJsonPath('data.0.status', 'overdue')
            ->assertJsonPath('data.0.guardians.0.email', 'guardian@example.test')
            ->assertJsonPath('data.0.lastReminderAt', null);

        $this->actingAs($cashier)->getJson('/api/follow-up?status=due_soon')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.status', 'due_soon')
            ->assertJsonPath('data.0.daysOverdue', 0)
            ->assertJsonPath('data.0.amountDueCents', 8_000);
    }

    public function test_follow_up_endpoint_is_limited_to_cashier_and_accounting(): void
    {
        foreach ([UserRole::Cashier, UserRole::Accounting] as $role) {
            $reader = User::factory()->create(['role' => $role]);
            $this->actingAs($reader)->getJson('/api/follow-up')->assertOk();
        }

        foreach ([UserRole::SuperAdmin, UserRole::Admin, UserRole::Auditor, UserRole::Registrar] as $role) {
            $denied = User::factory()->create(['role' => $role]);
            $this->actingAs($denied)->getJson('/api/follow-up')->assertForbidden();
        }
    }

    public function test_reminder_sending_is_denied_for_roles_without_follow_up_management_capability(): void
    {
        foreach ([UserRole::SuperAdmin, UserRole::Admin, UserRole::Auditor, UserRole::Registrar] as $role) {
            $reader = User::factory()->create(['role' => $role]);
            $this->actingAs($reader)->postJson('/api/follow-up/reminders', [])->assertForbidden();
        }
    }

    public function test_reminder_sending_and_retry_are_unavailable_until_delivery_policy_is_approved(): void
    {
        config(['services.reminders.enabled' => false]);
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $student = Student::query()->create(['lrn' => '000000007004', 'full_name' => 'Quinn Sample Student', 'status' => 'enrolled']);
        $notification = NotificationLog::query()->create([
            'student_id' => $student->id,
            'guardian_email' => 'guardian@example.test',
            'channel' => 'email',
            'kind' => 'reminder',
            'status' => 'failed',
            'failure_reason' => 'Provider unavailable.',
            'attempts' => 1,
        ]);

        $this->actingAs($cashier)->postJson('/api/follow-up/reminders', [])->assertStatus(503)
            ->assertJsonPath('message', 'Reminder delivery is unavailable until its provider and delivery policies are approved.');
        $this->actingAs($cashier)->postJson("/api/notifications/{$notification->id}/retry")->assertStatus(503)
            ->assertJsonPath('message', 'Reminder retry is unavailable until its provider and delivery policies are approved.');

        $this->assertDatabaseCount('notification_logs', 1);
        $this->assertDatabaseHas('notification_logs', [
            'id' => $notification->id,
            'status' => 'failed',
            'failure_reason' => 'Provider unavailable.',
            'attempts' => 1,
        ]);
        $this->assertDatabaseMissing('audit_entries', ['action' => 'reminder.retried']);
    }

    public function test_cashier_can_queue_idempotent_email_and_twilio_reminders_and_delivery_callback_confirms_sms(): void
    {
        config(['services.reminders.enabled' => true]);
        $cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $student = Student::query()->create(['lrn' => '000000007002', 'full_name' => 'Morgan Sample', 'status' => 'enrolled']);
        $account = $this->createAccount($student, $year, $cashier);
        $installment = Installment::query()->create(['billing_account_id' => $account->id, 'label' => 'October installment', 'sequence' => 1, 'due_date' => '2026-10-20', 'amount_cents' => 10_000, 'paid_cents' => 0, 'status' => 'overdue']);
        $guardian = Guardian::query()->forceCreate(['full_name' => 'Casey Sample Guardian', 'relationship' => 'Guardian', 'email' => 'guardian@example.test', 'email_status' => 'verified', 'mobile' => '+639990000000']);
        $student->guardians()->attach($guardian->id, ['is_primary' => true]);
        config(['mail.default' => 'array', 'services.twilio.account_sid' => 'AC00000000000000000000000000000000', 'services.twilio.auth_token' => 'test-token', 'services.twilio.messaging_service_sid' => 'MG00000000000000000000000000000000']);
        Http::fake(['api.twilio.com/*' => Http::response(['sid' => 'SM00000000000000000000000000000000', 'status' => 'queued'], 201)]);
        Queue::fake();
        $payload = ['idempotency_key' => '3f2c1f5c-38f4-4f50-95f2-9bb676271b04', 'installment_ids' => [$installment->id], 'channels' => ['email', 'sms']];

        $response = $this->actingAs($cashier)->postJson('/api/follow-up/reminders', $payload)
            ->assertStatus(202)
            ->assertJsonPath('summary.queued', 2)
            ->assertJsonPath('summary.failed', 0);
        $this->assertDatabaseCount('notification_logs', 2);
        $this->assertDatabaseHas('notification_logs', ['installment_id' => $installment->id, 'channel' => 'sms', 'status' => 'queued', 'provider_message_sid' => null]);
        Queue::assertPushed(DeliverNotification::class, 2);
        Http::assertNothingSent();

        $this->actingAs($cashier)->postJson('/api/follow-up/reminders', $payload)->assertStatus(202);
        $this->assertDatabaseCount('notification_logs', 2);
        Queue::assertPushed(DeliverNotification::class, 2);

        $smsLog = NotificationLog::query()->where('channel', 'sms')->firstOrFail();
        (new DeliverNotification($smsLog->id))->handle();
        Http::assertSentCount(1);
        $this->assertDatabaseHas('notification_logs', ['id' => $smsLog->id, 'status' => 'queued', 'provider_message_sid' => 'SM00000000000000000000000000000000', 'attempts' => 1]);
        $url = 'http://localhost/api/webhooks/twilio/messages/'.$smsLog->id;
        $params = ['AccountSid' => 'AC00000000000000000000000000000000', 'MessageSid' => 'SM00000000000000000000000000000000', 'MessageStatus' => 'delivered'];
        ksort($params);
        $signed = $url;
        foreach ($params as $key => $value) {
            $signed .= $key.$value;
        }
        $signature = base64_encode(hash_hmac('sha1', $signed, 'test-token', true));
        $this->post($url, $params, ['X-Twilio-Signature' => $signature])->assertOk();
        $this->assertDatabaseHas('notification_logs', ['id' => $smsLog->id, 'status' => 'sent']);
    }

    public function test_invalid_twilio_delivery_signature_is_rejected(): void
    {
        config(['services.twilio.auth_token' => 'test-token']);
        $user = User::factory()->create(['role' => UserRole::Cashier]);
        $year = SchoolYear::query()->forceCreate(['label' => 'SY 2026-2027', 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true]);
        $student = Student::query()->create(['lrn' => '000000007003', 'full_name' => 'Morgan Sample', 'status' => 'enrolled']);
        $account = $this->createAccount($student, $year, $user);
        $installment = Installment::query()->create(['billing_account_id' => $account->id, 'label' => 'October installment', 'sequence' => 1, 'due_date' => '2026-10-20', 'amount_cents' => 10_000, 'paid_cents' => 0, 'status' => 'overdue']);
        $log = NotificationLog::query()->create(['student_id' => $student->id, 'installment_id' => $installment->id, 'guardian_mobile' => '+639990000000', 'channel' => 'sms', 'kind' => 'reminder', 'status' => 'queued']);
        $this->post('/api/webhooks/twilio/messages/'.$log->id, ['MessageSid' => 'SM-invalid', 'MessageStatus' => 'delivered'], ['X-Twilio-Signature' => 'invalid'])->assertForbidden();
    }

    private function createAccount(Student $student, SchoolYear $year, User $cashier): BillingAccount
    {
        return BillingAccount::query()->create([
            'student_id' => $student->id,
            'school_year_id' => $year->id,
            'status' => 'overdue',
            'total_due_cents' => 23_000,
            'total_paid_cents' => 2_500,
            'balance_cents' => 20_500,
            'created_by' => $cashier->id,
        ]);
    }
}
