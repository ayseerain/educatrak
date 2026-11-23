<?php

namespace Database\Seeders;

use App\Models\BillingAccount;
use App\Models\BillingAccountItem;
use App\Models\FeeItem;
use App\Models\FeeSchedule;
use App\Models\GradeLevel;
use App\Models\Guardian;
use App\Models\Installment;
use App\Models\PaymentPlan;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use App\Support\CanonicalGradeLevels;
use App\UserRole;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;

/**
 * Fictional records for demonstrating the local billing workflow.
 *
 * This seeder is intentionally the only source of demo data. It must never be
 * used with a database that contains real school records.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        Model::unguarded(function (): void {
            $cashier = $this->staff('sample.cashier', 'Cashier', UserRole::Cashier);
            $this->staff('sample.accounting', 'Accounting', UserRole::Accounting);
            $this->staff('sample.admin', 'Administrator', UserRole::Admin);
            $this->staff('sample.auditor', 'Auditor', UserRole::Auditor);
            $this->staff('sample.registrar', 'Registrar', UserRole::Registrar);
            CanonicalGradeLevels::ensure();

            $schoolYear = SchoolYear::query()->updateOrCreate(
                ['label' => 'SY 2026-2027'],
                ['starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'is_current' => true],
            );
            $plan = PaymentPlan::query()->updateOrCreate(
                ['name' => 'Four-installment demo plan'],
                ['down_payment_type' => 'amount', 'down_payment_value' => 25_000, 'active' => true],
            );

            foreach ([
                ['lrn' => '910000000001', 'name' => 'Amara Villanueva (sample)', 'grade' => 'Grade 7', 'section' => 'Olive', 'balance' => 125_000, 'total' => 1_250_000, 'paid' => 1_125_000, 'status' => 'due_soon', 'email' => 'amara.guardian@example.test'],
                ['lrn' => '910000000002', 'name' => 'Basil Mercado (sample)', 'grade' => 'Grade 8', 'section' => 'Maple', 'balance' => 420_000, 'total' => 1_000_000, 'paid' => 580_000, 'status' => 'due_soon', 'email' => 'basil.guardian@example.test'],
                ['lrn' => '910000000003', 'name' => 'Cora Navarro (sample)', 'grade' => 'Grade 9', 'section' => 'Pine', 'balance' => 850_000, 'total' => 1_500_000, 'paid' => 650_000, 'status' => 'overdue', 'email' => null],
            ] as $demoStudent) {
                $grade = GradeLevel::query()->where('name', $demoStudent['grade'])->firstOrFail();
                $section = Section::query()->updateOrCreate(
                    ['grade_level_id' => $grade->id, 'name' => $demoStudent['section']],
                    ['active' => true],
                );
                $student = Student::query()->updateOrCreate(
                    ['lrn' => $demoStudent['lrn']],
                    ['full_name' => $demoStudent['name'], 'grade_level_id' => $grade->id, 'section_id' => $section->id, 'status' => 'enrolled'],
                );
                $guardian = Guardian::query()->updateOrCreate(
                    ['full_name' => "Guardian for {$demoStudent['name']}"],
                    ['relationship' => 'Parent', 'email' => $demoStudent['email'], 'email_status' => $demoStudent['email'] === null ? 'missing' : 'verified'],
                );
                $student->guardians()->syncWithoutDetaching([$guardian->id => ['is_primary' => true]]);

                $schedule = FeeSchedule::query()->updateOrCreate(
                    ['school_year_id' => $schoolYear->id, 'grade_level_id' => $grade->id, 'name' => "{$demoStudent['grade']} demo fees"],
                    ['active' => true],
                );
                $fee = FeeItem::query()->updateOrCreate(
                    ['fee_schedule_id' => $schedule->id, 'name' => 'Tuition (sample)'],
                    ['category' => 'tuition', 'amount_cents' => $demoStudent['total'], 'required' => true, 'sort_order' => 1],
                );
                $account = BillingAccount::query()->updateOrCreate(
                    ['student_id' => $student->id, 'school_year_id' => $schoolYear->id],
                    [
                        'fee_schedule_id' => $schedule->id,
                        'payment_plan_id' => $plan->id,
                        'status' => $demoStudent['status'],
                        'total_due_cents' => $demoStudent['total'],
                        'total_paid_cents' => $demoStudent['paid'],
                        'balance_cents' => $demoStudent['balance'],
                        'created_by' => $cashier->id,
                    ],
                );
                BillingAccountItem::query()->updateOrCreate(
                    ['billing_account_id' => $account->id, 'name' => 'Tuition (sample)'],
                    ['fee_item_id' => $fee->id, 'category' => 'tuition', 'amount_cents' => $demoStudent['total']],
                );
                $this->installments($account, $demoStudent['total'], $demoStudent['paid'], $demoStudent['status']);

            }
        });
    }

    private function staff(string $username, string $name, UserRole $role): User
    {
        return User::query()->updateOrCreate(
            ['username' => $username],
            [
                'full_name' => $name,
                'email' => str_replace('.', '-', $username).'@example.test',
                'role' => $role,
                'active' => true,
                'must_change_password' => false,
                'password' => 'SamplePass123!',
            ],
        );
    }

    private function installments(BillingAccount $account, int $total, int $paid, string $accountStatus): void
    {
        $amounts = [intdiv($total, 4), intdiv($total, 4), intdiv($total, 4), $total - (intdiv($total, 4) * 3)];
        $remainingPaid = $paid;

        foreach ($amounts as $index => $amount) {
            $paidForInstallment = min($remainingPaid, $amount);
            $remainingPaid -= $paidForInstallment;
            $status = $paidForInstallment === $amount ? 'paid' : ($index === 0 ? $accountStatus : 'current');

            Installment::query()->updateOrCreate(
                ['billing_account_id' => $account->id, 'sequence' => $index + 1],
                [
                    'label' => $index === 0 ? 'Down payment' : 'Installment '.$index,
                    'due_date' => now('Asia/Manila')->startOfMonth()->addMonths($index - 1)->toDateString(),
                    'amount_cents' => $amount,
                    'paid_cents' => $paidForInstallment,
                    'status' => $status,
                ],
            );
        }
    }
}
