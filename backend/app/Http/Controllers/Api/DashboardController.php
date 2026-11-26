<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditEntry;
use App\Models\BillingAccount;
use App\Models\CloseOut;
use App\Models\GradeLevel;
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
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    private const SecurityAuditActions = [
        'auth.login',
        'auth.login_failed',
        'auth.logout',
        'auth.change_password',
        'user.created',
        'user.updated',
        'user.password_reset',
        'user.archived',
        'user.restored',
        'user.super_admin_bootstrapped',
    ];

    private const AdministrativeAuditActionPrefixes = [
        'user.',
        'system_settings.',
        'school_year.',
        'term.',
        'exam_period.',
        'grade_level.',
        'section.',
    ];

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
            if ($payment->status === 'voided') {
                continue;
            }
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
        return $this->systemSummary('admin');
    }

    private function superAdministratorSummary(): array
    {
        return $this->systemSummary('super_admin');
    }

    private function systemSummary(string $role): array
    {
        $backup = DB::table('backup_records')->orderByDesc('completed_at')->first();
        $summary = [
            'role' => $role,
            'lastBackupAt' => $backup?->completed_at,
            'lastBackupSucceeded' => match ($backup?->result) {
                'succeeded' => true,
                'failed' => false,
                default => null,
            },
            'activeUserCount' => User::query()->where('active', true)->count(),
        ];

        if ($role === 'super_admin') {
            return [
                ...$summary,
                'staffAccounts' => $this->staffAccountSummary(),
                'recentAdministrativeActivity' => $this->dashboardAuditActivity(),
                'securityEvents' => $this->dashboardAuditActivity(self::SecurityAuditActions),
            ];
        }

        return [
            ...$summary,
            'staffAccounts' => $this->staffAccountSummary(),
            'configuration' => $this->configurationSummary(),
            'recentAdministrativeActivity' => $this->dashboardAuditActivity([], self::AdministrativeAuditActionPrefixes),
            'securityEvents' => $this->dashboardAuditActivity(self::SecurityAuditActions),
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
            'recentAuditActivity' => $this->dashboardAuditActivity(),
        ];
    }

    private function staffAccountSummary(): array
    {
        $roleCounts = User::query()
            ->select('role', DB::raw('COUNT(*) as aggregate'))
            ->groupBy('role')
            ->pluck('aggregate', 'role');
        $roles = [
            'super_admin' => 'super_admin',
            'admin' => 'administrator',
            'accounting' => 'accounting',
            'cashier' => 'cashier',
            'auditor' => 'auditor',
            'registrar' => 'registrar',
        ];

        return [
            'active' => User::query()->where('active', true)->count(),
            'inactive' => User::query()->where('active', false)->count(),
            'privileged' => User::query()
                ->where('active', true)
                ->whereIn('role', ['super_admin', 'admin'])
                ->count(),
            'byRole' => collect($roles)
                ->map(fn (string $dashboardRole, string $storedRole): array => [
                    'role' => $dashboardRole,
                    'count' => (int) ($roleCounts->get($storedRole) ?? 0),
                ])
                ->values()
                ->all(),
        ];
    }

    private function configurationSummary(): array
    {
        return [
            'schoolYear' => SchoolYear::query()->where('is_current', true)->value('label'),
            'gradeLevelCount' => GradeLevel::query()->count(),
            'paymentMethodCount' => 1,
        ];
    }

    /**
     * @param  list<string>  $actions
     * @param  list<string>  $actionPrefixes
     * @return list<array{id: string, label: string, actor: ?string, occurredAt: string}>
     */
    private function dashboardAuditActivity(array $actions = [], array $actionPrefixes = []): array
    {
        return AuditEntry::query()
            ->leftJoin('users as actors', 'audit_entries.user_id', '=', 'actors.id')
            ->select(['audit_entries.*', 'actors.full_name as actor_name', 'actors.username as actor_username'])
            ->when($actions !== [], fn ($query) => $query->whereIn('audit_entries.action', $actions))
            ->when($actionPrefixes !== [], function ($query) use ($actionPrefixes): void {
                $query->where(function ($matches) use ($actionPrefixes): void {
                    foreach ($actionPrefixes as $prefix) {
                        $matches->orWhere('audit_entries.action', 'like', $prefix.'%');
                    }
                });
            })
            ->latest('audit_entries.occurred_at')
            ->latest('audit_entries.id')
            ->limit(8)
            ->get()
            ->map(fn (AuditEntry $entry): array => [
                'id' => (string) $entry->id,
                'label' => Str::headline(str_replace('.', ' ', $entry->action)),
                'actor' => $entry->actor_name ?: $entry->actor_username,
                'occurredAt' => $entry->occurred_at->toISOString(),
            ])
            ->all();
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
        $currentYears = SchoolYear::query()
            ->where('is_current', true)
            ->orderBy('id')
            ->get(['starts_on']);

        if ($currentYears->count() !== 1) {
            abort(409, 'Exactly one current school year must be configured.');
        }

        return CarbonImmutable::parse($currentYears->sole()->starts_on, 'Asia/Manila')->startOfDay();
    }
}
