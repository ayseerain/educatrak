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

class SystemSettingsTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_administrator_updates_school_receipt_and_email_settings_with_an_audit_of_changed_keys(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-20 09:00:00', 'Asia/Manila'));
        DB::table('receipt_sequences')->where('id', 1)->update(['last_sequence' => 122]);
        $admin = User::factory()->create(['role' => UserRole::Admin]);

        $this->actingAs($admin)->getJson('/api/settings/system')
            ->assertOk()
            ->assertJsonPath('data.schoolName', null)
            ->assertJsonPath('data.receiptTitle', 'Acknowledgment Receipt')
            ->assertJsonPath('data.nextReceiptSequence', 123)
            ->assertJsonPath('data.nextReceiptNumber', 'OR-2026-000123');

        $this->actingAs($admin)->patchJson('/api/settings/system', [
            'school_name' => '  Sample Christian Academy  ',
            'school_address' => 'Sample Street, Sample Town',
            'receipt_title' => 'Acknowledgment Receipt',
            'paper_size' => 'A4',
            'email_sender_name' => 'Sample Billing Office',
            'email_sender_address' => 'billing@example.test',
            'email_daily_send_limit' => 300,
        ])->assertOk()
            ->assertJsonPath('data.schoolName', 'Sample Christian Academy')
            ->assertJsonPath('data.paperSize', 'A4')
            ->assertJsonPath('data.emailDailySendLimit', 300);

        $this->actingAs($admin)->patchJson('/api/settings/system', ['paper_size' => 'A4', 'receipt_title' => 'Official Receipt'])
            ->assertUnprocessable()->assertJsonValidationErrors('receipt_title');

        $entries = DB::table('audit_entries')->where('action', 'system_settings.updated')->orderBy('id')->get();
        $this->assertCount(1, $entries);
        $this->assertSame([
            'school.name' => null,
            'school.address' => null,
            'receipt.title' => null,
            'receipt.paper_size' => null,
            'email.sender_name' => null,
            'email.sender_address' => null,
            'email.daily_send_limit' => null,
        ], json_decode($entries[0]->before, true));
        $this->assertSame([
            'school.name' => 'Sample Christian Academy',
            'school.address' => 'Sample Street, Sample Town',
            'receipt.title' => 'Acknowledgment Receipt',
            'receipt.paper_size' => 'A4',
            'email.sender_name' => 'Sample Billing Office',
            'email.sender_address' => 'billing@example.test',
            'email.daily_send_limit' => 300,
        ], json_decode($entries[0]->after, true));
        $this->assertDatabaseHas('system_settings', ['key' => 'receipt.paper_size', 'updated_by' => $admin->id]);
    }

    public function test_enum_and_read_only_fields_are_validated(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);

        $this->actingAs($admin)->patchJson('/api/settings/system', ['receipt_title' => 'Invoice', 'paper_size' => 'Legal'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['receipt_title', 'paper_size'])
            ->assertJsonStructure(['message', 'errors']);
        $this->actingAs($admin)->patchJson('/api/settings/system', ['email_sender_address' => 'not-an-email', 'email_daily_send_limit' => -1])
            ->assertUnprocessable()->assertJsonValidationErrors(['email_sender_address', 'email_daily_send_limit']);
        $this->actingAs($admin)->patchJson('/api/settings/system', ['next_receipt_number' => 'OR-2026-000001', 'next_receipt_sequence' => 1])
            ->assertUnprocessable()->assertJsonValidationErrors(['next_receipt_number', 'next_receipt_sequence']);

        $this->assertDatabaseCount('system_settings', 0);
        $this->assertSame(0, (int) DB::table('receipt_sequences')->where('id', 1)->value('last_sequence'));
    }

    public function test_settings_update_rolls_back_when_audit_recording_fails(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $this->mock(AuditLogger::class, function (MockInterface $mock): void {
            $mock->shouldReceive('record')->once()->andThrow(new RuntimeException('Audit storage failed.'));
        });

        $this->actingAs($admin)->patchJson('/api/settings/system', ['paper_size' => 'Letter'])->assertInternalServerError();

        $this->assertDatabaseCount('system_settings', 0);
    }

    public function test_only_administrator_manages_and_accounting_only_reads_system_settings(): void
    {
        $accounting = User::factory()->create(['role' => UserRole::Accounting]);
        $this->actingAs($accounting)->getJson('/api/settings/system')->assertOk();
        $this->actingAs($accounting)->patchJson('/api/settings/system', ['paper_size' => 'A4'])->assertForbidden();

        foreach ([UserRole::Cashier, UserRole::Registrar, UserRole::Auditor, UserRole::SuperAdmin] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->getJson('/api/settings/system')->assertForbidden();
            $this->actingAs($user)->patchJson('/api/settings/system', ['paper_size' => 'A4'])->assertForbidden();
        }

        $this->assertDatabaseCount('system_settings', 0);
    }
}
