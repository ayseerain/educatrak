<?php

namespace Tests\Feature;

use App\Models\AuditEntry;
use App\Models\BillingAccount;
use App\Models\GradeLevel;
use App\Models\ImportBatch;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class LedgerImportTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const Header = 'source_row_id,student_lrn,school_year,as_of_date,total_due_cents,total_paid_cents,balance_cents,source_reference,notes';

    private User $cashier;

    private User $accounting;

    protected function setUp(): void
    {
        parent::setUp();
        config(['educatrak.ledger_cutover_date' => '2026-06-30']);
        $grade = GradeLevel::query()->forceCreate(['name' => 'Ledger Grade', 'sort_order' => 90]);
        $section = Section::query()->forceCreate(['grade_level_id' => $grade->id, 'name' => 'Ledger Section']);
        SchoolYear::query()->forceCreate(['label' => 'SY 2025-2026', 'starts_on' => '2025-06-01', 'ends_on' => '2026-05-31', 'is_current' => false]);
        foreach (['000000009001', '000000009002', '000000009003'] as $lrn) {
            Student::query()->create(['lrn' => $lrn, 'full_name' => "Ledger Student {$lrn} (sample)", 'grade_level_id' => $grade->id, 'section_id' => $section->id, 'status' => 'enrolled']);
        }
        $this->cashier = User::factory()->create(['role' => UserRole::Cashier]);
        $this->accounting = User::factory()->create(['role' => UserRole::Accounting]);
    }

    public function test_accounting_records_only_eligible_rows_and_nothing_financial_changes(): void
    {
        Queue::fake();
        $this->existingAccount('000000009003');
        $batch = $this->upload($this->cashier, [
            'R1,000000009001,SY 2025-2026,2026-05-31,2000000,1500000,500000,Legacy ledger p.4,Fictional opening balance',
            'R2,000000009002,SY 2025-2026,2026-05-31,1000000,900000,200000,Legacy ledger p.5,',
            'R3,000000009003,SY 2025-2026,2026-05-31,1000,0,1000,Legacy ledger p.6,',
        ])->assertCreated()
            ->assertJsonPath('data.summary.eligibleCount', 1)
            ->assertJsonPath('data.summary.invalidCount', 1)
            ->assertJsonPath('data.summary.conflictCount', 1)
            ->assertJsonPath('data.rows.2.status', 'conflict');
        $id = $batch->json('data.id');
        $hash = $batch->json('data.fileSha256');

        $this->actingAs($this->accounting)->getJson("/api/ledger-imports/{$id}")->assertNotFound();
        $this->actingAs($this->cashier)->postJson("/api/ledger-imports/{$id}/submit")->assertOk()->assertJsonPath('data.status', 'submitted');
        $this->actingAs($this->cashier)->postJson("/api/ledger-imports/{$id}/confirm", ['file_sha256' => $hash, 'eligible_lines' => [2]])->assertForbidden();
        $this->actingAs($this->accounting)->postJson("/api/ledger-imports/{$id}/confirm", ['file_sha256' => str_repeat('0', 64), 'eligible_lines' => [2]])->assertConflict();
        $this->actingAs($this->accounting)->postJson("/api/ledger-imports/{$id}/confirm", ['file_sha256' => $hash, 'eligible_lines' => [2, 3]])->assertConflict();
        $this->assertDatabaseCount('opening_balance_conversions', 0);

        $this->actingAs($this->accounting)->postJson("/api/ledger-imports/{$id}/confirm", ['file_sha256' => $hash, 'eligible_lines' => [2]])
            ->assertOk()
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.summary.recordedCount', 1)
            ->assertJsonPath('data.summary.excludedCount', 2)
            ->assertJsonPath('data.rows.0.outcome', 'recorded')
            ->assertJsonPath('data.rows.2.outcome', 'excluded');
        $this->actingAs($this->accounting)->postJson("/api/ledger-imports/{$id}/confirm", ['file_sha256' => $hash, 'eligible_lines' => [2]])->assertConflict();

        $this->assertDatabaseCount('opening_balance_conversions', 1);
        $this->assertDatabaseHas('opening_balance_conversions', ['source_row_id' => 'R1', 'balance_cents' => 500000, 'confirmed_by' => $this->accounting->id]);
        $this->assertDatabaseCount('billing_accounts', 1);
        $this->assertSame(1000, BillingAccount::query()->sole()->balance_cents);
        foreach (['payments', 'receipts', 'adjustments', 'installments'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
        $this->assertDatabaseCount('students', 3);
        Queue::assertNothingPushed();
        $this->assertDatabaseHas('audit_entries', ['action' => 'ledger_import.confirmed', 'user_id' => $this->accounting->id]);
    }

    public function test_pending_cutover_allows_preview_and_review_but_blocks_confirmation(): void
    {
        config(['educatrak.ledger_cutover_date' => null]);
        $batch = $this->upload($this->cashier, ['R1,000000009001,SY 2025-2026,2027-05-31,10,0,10,Ref,'])
            ->assertCreated()
            ->assertJsonPath('meta.cutoverPending', true)
            ->assertJsonPath('data.summary.eligibleCount', 1)
            ->assertJsonPath('data.rows.0.errors', []);
        $id = $batch->json('data.id');
        $this->actingAs($this->cashier)->postJson("/api/ledger-imports/{$id}/submit")->assertOk();

        $this->actingAs($this->accounting)->postJson("/api/ledger-imports/{$id}/confirm", ['file_sha256' => $batch->json('data.fileSha256'), 'eligible_lines' => [2]])
            ->assertConflict();
        $this->assertDatabaseCount('opening_balance_conversions', 0);
        $this->assertSame('submitted', ImportBatch::query()->find($id)->status);

        config(['educatrak.ledger_cutover_date' => '2026-06-30']);
        $this->actingAs($this->accounting)->getJson("/api/ledger-imports/{$id}")
            ->assertOk()
            ->assertJsonPath('data.rows.0.status', 'invalid')
            ->assertJsonPath('data.rows.0.errors.0', 'as_of_date is later than the approved cutover date.');
    }

    public function test_rows_are_classified_and_error_report_neutralizes_formulas(): void
    {
        $batch = $this->upload($this->cashier, [
            'R1,000000009001,SY 2025-2026,2026-05-31,2000000,1500000,400000,Ref,',
            'R2,123,SY 1999-2000,2026-02-30,-5,0,0,Ref,',
            '=HYPERLINK(1),000000009999,SY 2025-2026,2026-05-31,10,0,10,Ref,',
            'R4,000000009002,SY 2025-2026,2026-05-31,10,0,10,,',
            'R5,000000009002,SY 2025-2026,2026-05-31,10,0,10,Ref,',
            'R5,000000009003,SY 2025-2026,2026-05-31,10,0,10,Ref,',
        ])->assertCreated()->assertJsonPath('data.summary.eligibleCount', 0);

        $rows = collect($batch->json('data.rows'));
        $this->assertSame(['invalid', 'invalid', 'invalid', 'invalid', 'duplicate', 'duplicate'], $rows->pluck('status')->all());
        $this->assertContains('total_due_cents - total_paid_cents must equal balance_cents.', $rows[0]['errors']);
        $this->assertContains('student_lrn must be exactly 12 digits.', $rows[1]['errors']);
        $this->assertContains('as_of_date must be a valid YYYY-MM-DD date.', $rows[1]['errors']);
        $this->assertContains('No existing student has this LRN; imports never create students.', $rows[2]['errors']);
        $this->assertContains('source_reference is required.', $rows[3]['errors']);
        $this->assertContains('source_row_id appears more than once in this file.', $rows[4]['errors']);

        $id = $batch->json('data.id');
        $report = $this->actingAs($this->cashier)->get("/api/ledger-imports/{$id}/error-report");
        $report->assertOk();
        $csv = $report->streamedContent();
        $this->assertStringContainsString("'=HYPERLINK(1)", $csv);
        $this->assertSame(7, substr_count(trim($csv), "\n") + 1);

        $this->actingAs($this->cashier)->postJson("/api/ledger-imports/{$id}/submit")->assertUnprocessable();
        $this->actingAs($this->cashier)->postJson("/api/ledger-imports/{$id}/cancel")->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->assertDatabaseCount('opening_balance_conversions', 0);
    }

    public function test_column_mapping_accepts_school_headers(): void
    {
        $file = UploadedFile::fake()->createWithContent('ledger.csv', "Row,LRN,SY,As of,Due,Paid,Balance,Ref\nR1,000000009001,SY 2025-2026,2026-05-31,10,0,10,Ledger 1\n");
        $mapping = ['source_row_id' => 'Row', 'student_lrn' => 'LRN', 'school_year' => 'SY', 'as_of_date' => 'As of', 'total_due_cents' => 'Due', 'total_paid_cents' => 'Paid', 'balance_cents' => 'Balance', 'source_reference' => 'Ref', 'notes' => null];

        $this->actingAs($this->cashier)->post('/api/ledger-imports', ['file' => $file, 'mapping' => $mapping], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.summary.eligibleCount', 1)
            ->assertJsonPath('data.rows.0.values.student_lrn', '000000009001');

        $file = UploadedFile::fake()->createWithContent('ledger.csv', "Row,LRN\nR1,000000009001\n");
        $this->actingAs($this->cashier)->post('/api/ledger-imports', ['file' => $file], ['Accept' => 'application/json'])
            ->assertUnprocessable()->assertJsonValidationErrors('mapping');
    }

    public function test_rejection_creates_nothing_and_roles_and_other_cashiers_are_denied(): void
    {
        $otherCashier = User::factory()->create(['role' => UserRole::Cashier]);
        $id = $this->upload($this->cashier, ['R1,000000009001,SY 2025-2026,2026-05-31,10,0,10,Ref,'])->json('data.id');
        $this->actingAs($otherCashier)->getJson("/api/ledger-imports/{$id}")->assertNotFound();
        $this->actingAs($this->cashier)->postJson("/api/ledger-imports/{$id}/submit")->assertOk();
        $this->actingAs($this->cashier)->postJson("/api/ledger-imports/{$id}/submit")->assertConflict();

        $this->actingAs($this->accounting)->postJson("/api/ledger-imports/{$id}/reject", ['review_note' => 'Fictional mismatch with the paper ledger.'])
            ->assertOk()->assertJsonPath('data.status', 'rejected');
        $this->assertDatabaseCount('opening_balance_conversions', 0);

        foreach ([UserRole::SuperAdmin, UserRole::Admin, UserRole::Registrar, UserRole::Auditor, UserRole::Accounting] as $role) {
            $this->upload(User::factory()->create(['role' => $role]), ['R1,000000009001,SY 2025-2026,2026-05-31,10,0,10,Ref,'])->assertForbidden();
        }
        foreach ([UserRole::SuperAdmin, UserRole::Admin, UserRole::Registrar, UserRole::Auditor] as $role) {
            $this->actingAs(User::factory()->create(['role' => $role]))->getJson('/api/ledger-imports')->assertForbidden();
        }
    }

    public function test_recorded_balance_makes_a_later_row_for_the_same_student_year_a_duplicate(): void
    {
        $first = $this->upload($this->cashier, ['R1,000000009001,SY 2025-2026,2026-05-31,10,0,10,Ref,']);
        $this->actingAs($this->cashier)->postJson('/api/ledger-imports/'.$first->json('data.id').'/submit')->assertOk();
        $this->actingAs($this->accounting)->postJson('/api/ledger-imports/'.$first->json('data.id').'/confirm', ['file_sha256' => $first->json('data.fileSha256'), 'eligible_lines' => [2]])->assertOk();

        $this->upload($this->cashier, ['R9,000000009001,SY 2025-2026,2026-05-31,20,0,20,Ref,'])
            ->assertJsonPath('data.rows.0.status', 'duplicate');
    }

    public function test_conflicts_are_compared_at_cutover_and_resolved_without_changing_accounts(): void
    {
        $student = Student::query()->where('lrn', '000000009001')->sole();
        Student::query()->create(['lrn' => '000000009004', 'full_name' => 'Ledger Student 9004 (sample)', 'grade_level_id' => $student->grade_level_id, 'section_id' => $student->section_id, 'status' => 'enrolled']);
        $this->existingAccount('000000009001', '2026-06-01 08:00:00');
        $this->existingAccount('000000009002', '2026-06-01 08:00:00');
        $this->existingAccount('000000009003');
        $batch = $this->upload($this->cashier, [
            'R1,000000009001,SY 2025-2026,2026-05-31,1000,0,1000,Ref,',
            'R2,000000009002,SY 2025-2026,2026-05-31,1500,0,1500,Ref,',
            'R3,000000009003,SY 2025-2026,2026-05-31,1000,0,1000,Ref,',
            'R4,000000009004,SY 2025-2026,2026-05-31,500,0,500,Ref,',
        ])->assertCreated()
            ->assertJsonPath('data.rows.0.reconciliation.classification', 'evidenced_duplicate')
            ->assertJsonPath('data.rows.1.reconciliation.classification', 'discrepancy')
            ->assertJsonPath('data.rows.1.reconciliation.differenceCents', 500)
            ->assertJsonPath('data.rows.2.reconciliation.classification', 'insufficient_information')
            ->assertJsonPath('data.rows.2.reconciliation.accountBalanceCents', null)
            ->assertJsonPath('data.rows.3.reconciliation', null);
        $id = $batch->json('data.id');
        $this->actingAs($this->cashier)->postJson("/api/ledger-imports/{$id}/submit")->assertOk();

        $resolve = fn (User $user, int $line, string $resolution) => $this->actingAs($user)
            ->postJson("/api/ledger-imports/{$id}/rows/{$line}/resolution", ['resolution' => $resolution, 'reason' => 'Fictional check against the paper ledger.']);
        $resolve($this->cashier, 2, 'already_accounted')->assertForbidden();
        $resolve($this->accounting, 3, 'already_accounted')->assertUnprocessable();
        $resolve($this->accounting, 5, 'requires_correction')->assertNotFound();
        $resolve($this->accounting, 2, 'already_accounted')->assertOk()->assertJsonPath('data.rows.0.resolution.resolution', 'already_accounted');
        $resolve($this->accounting, 2, 'requires_correction')->assertConflict();
        $resolve($this->accounting, 3, 'requires_correction')->assertOk()->assertJsonPath('data.rows.1.resolution.differenceCents', 500);

        $this->actingAs($this->accounting)->postJson("/api/ledger-imports/{$id}/confirm", ['file_sha256' => $batch->json('data.fileSha256'), 'eligible_lines' => [5]])
            ->assertOk()->assertJsonPath('data.summary.recordedCount', 1)->assertJsonPath('data.rows.0.resolution.resolution', 'already_accounted');
        $this->assertDatabaseCount('opening_balance_conversions', 1);
        $this->assertSame([1000, 1000, 1000], BillingAccount::query()->orderBy('id')->pluck('balance_cents')->all());
        foreach (['adjustments', 'installments', 'payments', 'receipts'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
        $this->assertDatabaseCount('audit_entries', 5);
        $this->assertSame(2, AuditEntry::query()->where('action', 'ledger_import.conflict_resolved')->count());
        $report = $this->actingAs($this->accounting)->get("/api/ledger-imports/{$id}/error-report")->streamedContent();
        $this->assertStringContainsString('evidenced_duplicate,0,already_accounted', $report);

        config(['educatrak.ledger_cutover_date' => null]);
        $this->upload($this->cashier, ['R9,000000009001,SY 2025-2026,2026-05-31,1000,0,1000,Ref,'])
            ->assertJsonPath('data.rows.0.reconciliation.classification', 'insufficient_information');
    }

    private function existingAccount(string $lrn, ?string $createdAt = null): void
    {
        $account = BillingAccount::query()->create([
            'student_id' => Student::query()->where('lrn', $lrn)->value('id'),
            'school_year_id' => SchoolYear::query()->value('id'),
            'status' => 'current',
            'total_due_cents' => 1000,
            'total_paid_cents' => 0,
            'balance_cents' => 1000,
            'created_by' => $this->cashier->id,
        ]);
        if ($createdAt !== null) {
            $account->forceFill(['created_at' => $createdAt, 'updated_at' => $createdAt])->saveQuietly();
        }
    }

    /** @param list<string> $lines */
    private function upload(User $user, array $lines): TestResponse
    {
        $file = UploadedFile::fake()->createWithContent('ledger.csv', self::Header."\n".implode("\n", $lines)."\n");

        return $this->actingAs($user)->post('/api/ledger-imports', ['file' => $file], ['Accept' => 'application/json']);
    }
}
