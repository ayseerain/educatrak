<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillingAccount;
use App\Models\CloseOut;
use App\Models\Installment;
use App\Models\NotificationLog;
use App\Models\Payment;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use App\Models\VoidRequest;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validate(['range' => ['nullable', Rule::in(['today', 'last_7_days', 'last_30_days', 'school_year'])]]);
        $today = CarbonImmutable::now('Asia/Manila')->startOfDay();
        $range = $validated['range'] ?? 'last_7_days';
        $start = match ($range) {
            'today' => $today,
            'last_7_days' => $today->subDays(6),
            'last_30_days' => $today->subDays(29),
            'school_year' => $this->schoolYearStart($today),
        };

        $summary = match ($user->role->value) {
            'cashier' => $this->cashierSummary($user, $today, $start),
            'accounting' => $this->accountingSummary($start, $today),
            'admin' => $this->administratorSummary(),
            'super_admin' => $this->superAdministratorSummary(),
            'auditor' => $this->auditorSummary($start, $today),
            default => ['role' => 'registrar'],
        };

        return response()->json(['data' => $summary]);
    }

    private function cashierSummary(User $cashier, CarbonImmutable $today, CarbonImmutable $start): array
    {
        $payments = $this->paymentsInRange($start, $today, $cashier);
        $todayPayments = $this->paymentsInRange($today, $today, $cashier);
        $currentAccounts = BillingAccount::query()
            ->with(['student', 'installments'])
            ->whereHas('schoolYear', fn ($query) => $query->where('is_current', true))
            ->get();

        $overview = ['cleared' => 0, 'current' => 0, 'dueSoon' => 0, 'overdue' => 0];
        foreach ($currentAccounts as $account) {
            $status = (int) $account->balance_cents === 0 ? 'cleared' : match ($account->status) {
                'overdue' => 'overdue',
                'due_soon' => 'dueSoon',
                default => 'current',
            };
            $overview[$status]++;
        }

        $attention = $currentAccounts
            ->filter(fn (BillingAccount $account): bool => in_array($account->status, ['overdue', 'due_soon'], true) && (int) $account->balance_cents > 0)
            ->sortBy(fn (BillingAccount $account) => $account->installments->min('due_date'))
            ->take(5)
            ->map(function (BillingAccount $account): array {
                $amountDue = $account->installments
                    ->sum(fn (Installment $installment): int => max(0, $installment->amount_cents - $installment->paid_cents));

                return [
                    'id' => (string) $account->id,
                    'studentName' => $account->student?->full_name ?? 'Unavailable',
                    'amountDue' => (int) $amountDue,
                    'severity' => $account->status === 'overdue' ? 'error' : 'warning',
                ];
            })->values()->all();

        $failedEmails = NotificationLog::query()
            ->where('status', 'failed')
            ->where('channel', 'email')
            ->where('kind', 'payment_confirmation')
            ->whereHas('payment', fn ($query) => $query->where('recorded_by', $cashier->id))
            ->count();

        return [
            'role' => 'cashier',
            'overallEnrolledStudents' => Student::query()->where('status', 'enrolled')->count(),
            'todayCollectionsTotal' => (int) $todayPayments->where('status', '!=', 'voided')->sum('amount_cents'),
            'paymentsTodayCount' => $todayPayments->where('status', '!=', 'voided')->count(),
            'rangeCollectionsTotal' => (int) $payments->where('status', '!=', 'voided')->sum('amount_cents'),
            'paymentsInRangeCount' => $payments->where('status', '!=', 'voided')->count(),
            'failedEmailCount' => $failedEmails,
            'closeoutDone' => CloseOut::query()->whereDate('business_date', $today->toDateString())->where('cashier_id', $cashier->id)->exists(),
            'accountStatusOverview' => $overview,
            'accountsNeedingAttention' => $attention,
            'recentActivity' => $this->recentPayments($payments),
        ];
    }

    private function accountingSummary(CarbonImmutable $start, CarbonImmutable $today): array
    {
        $payments = $this->paymentsInRange($start, $today);
        $trend = [];
        foreach ($payments as $payment) {
            if ($payment->status === 'voided') continue;
            $date = $payment->paid_on->toDateString();
            $trend[$date] = ($trend[$date] ?? 0) + $payment->amount_cents;
        }
        ksort($trend);

        $overdueTotal = (int) Installment::query()
            ->whereDate('due_date', '<', $today->toDateString())
            ->whereColumn('paid_cents', '<', 'amount_cents')
            ->sum(DB::raw('amount_cents - paid_cents'));

        return [
            'role' => 'accounting',
            'overallEnrolledStudents' => Student::query()->where('status', 'enrolled')->count(),
            'pendingVoidApprovals' => VoidRequest::query()->where('status', 'pending')->count(),
            'overdueTotal' => $overdueTotal,
            'unsignedCloseouts' => CloseOut::query()->whereNull('signed_off_at')->count(),
            'collectionTrend' => collect($trend)->map(fn (int $total, string $date): array => ['date' => $date, 'totalCollected' => $total])->values()->all(),
            'recentActivity' => $this->recentPayments($payments),
        ];
    }

    private function administratorSummary(): array
    {
        return $this->systemSummary('administrator');
    }

    private function superAdministratorSummary(): array
    {
        return $this->systemSummary('super_admin');
    }

    private function systemSummary(string $role): array
    {
        $backup = DB::table('backup_records')->orderByDesc('completed_at')->first();

        return [
            'role' => $role,
            'lastBackupAt' => $backup?->completed_at,
            'lastBackupSucceeded' => match ($backup?->result) {
                'succeeded' => true,
                'failed' => false,
                default => null,
            },
            'activeUserCount' => User::query()->where('active', true)->count(),
        ];
    }

    private function auditorSummary(CarbonImmutable $start, CarbonImmutable $today): array
    {
        $todayPayments = $this->paymentsInRange($today, $today);
        $rangePayments = $this->paymentsInRange($start, $today);

        return [
            'role' => 'auditor',
            'overallEnrolledStudents' => Student::query()->where('status', 'enrolled')->count(),
            'todayCollectionsTotal' => (int) $todayPayments->where('status', '!=', 'voided')->sum('amount_cents'),
            'paymentsTodayCount' => $todayPayments->where('status', '!=', 'voided')->count(),
            'rangeCollectionsTotal' => (int) $rangePayments->where('status', '!=', 'voided')->sum('amount_cents'),
            'paymentsInRangeCount' => $rangePayments->where('status', '!=', 'voided')->count(),
        ];
    }

    private function paymentsInRange(CarbonImmutable $start, CarbonImmutable $end, ?User $cashier = null)
    {
        return Payment::query()
            ->with(['student', 'receipt'])
            ->whereDate('paid_on', '>=', $start->toDateString())
            ->whereDate('paid_on', '<=', $end->toDateString())
            ->when($cashier !== null, fn ($query) => $query->where('recorded_by', $cashier->id))
            ->orderByDesc('recorded_at')
            ->orderByDesc('id')
            ->get();
    }

    private function recentPayments($payments): array
    {
        return $payments->take(8)->map(fn (Payment $payment): array => [
            'id' => (string) $payment->id,
            'time' => $payment->recorded_at?->toISOString(),
            'studentName' => $payment->student?->full_name ?? 'Unavailable',
            'receiptNo' => $payment->receipt?->receipt_no ?? 'Unavailable',
            'amount' => (int) $payment->amount_cents,
            'method' => $payment->method,
            'status' => match ($payment->status) {
                'void_pending' => 'void_pending',
                'voided' => 'voided',
                default => 'posted',
            },
        ])->values()->all();
    }

    private function schoolYearStart(CarbonImmutable $today): CarbonImmutable
    {
        $startsOn = SchoolYear::query()->where('is_current', true)->value('starts_on');

        return $startsOn === null ? $today : CarbonImmutable::parse($startsOn, 'Asia/Manila')->startOfDay();
    }
}
