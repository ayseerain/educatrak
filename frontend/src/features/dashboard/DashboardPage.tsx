import { useState } from "react";
import { useDashboard } from "./hooks/useDashboard";
import { CashierDashboard } from "./components/CashierDashboard";
import { AccountingDashboard } from "./components/AccountingDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { AuditorDashboard } from "./components/AuditorDashboard";
import { RegistrarDashboard } from "./components/RegistrarDashboard";
import { RecordPaymentDialog } from "./components/RecordPaymentDialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { en } from "@/i18n/en";
import { add } from "@/lib/money";
import { recordMockPayment } from "@/api/mockAdapter";
import type { AuthenticatedUser } from "@/lib/types";
import type {
  CashierDashboardSummary,
  DashboardRange,
  DashboardSummary,
  RecentPayment,
  RecordPaymentInput,
} from "@/api/dashboardTypes";
import { DashboardRangeFilter, DASHBOARD_RANGE_OPTIONS } from "./components/DashboardRangeFilter";

interface DashboardPageProps {
  user: AuthenticatedUser;
}

export function DashboardPage({ user }: DashboardPageProps) {
  const [range, setRange] = useState<DashboardRange>("last_7_days");
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [recordedPayments, setRecordedPayments] = useState<RecentPayment[]>([]);
  // Registrar's dashboard carries no financial data and needs no fetch;
  // rendering it directly avoids requesting data the role can't see.
  if (user.role === "registrar") {
    return (
      <div className="flex h-full flex-col">
        <PageHeading user={user} />
        <RegistrarDashboard />
      </div>
    );
  }

  const { data, isPending, isError, refetch } = useDashboard(user, range);
  const visibleData = data?.role === "cashier"
    ? mergeRecordedPayments(data, recordedPayments, range)
    : data;

  async function saveRecordedPayment(input: RecordPaymentInput) {
    const payment = await recordMockPayment(input);
    setRecordedPayments((payments) => [payment, ...payments]);
  }

  return (
    <div className="space-y-4">
      <PageHeading
        user={user}
        range={range}
        onRangeChange={setRange}
        onRecordPayment={() => setRecordPaymentOpen(true)}
      />

      {isPending && <LoadingState message={en.states.loadingDashboard} />}

      {isError && (
        <ErrorState
          message={en.states.errorDashboard}
          onRetry={() => refetch()}
        />
      )}

      {visibleData && visibleData.role === "cashier" && (
        <CashierDashboard
          summary={visibleData}
          range={range}
        />
      )}
      {visibleData && visibleData.role === "accounting" && (
        <AccountingDashboard summary={visibleData} range={range} />
      )}
      {visibleData && visibleData.role === "administrator" && (
        <AdminDashboard summary={visibleData} />
      )}
      {visibleData && visibleData.role === "auditor" && (
        <AuditorDashboard summary={visibleData} range={range} />
      )}

      {user.role === "cashier" && (
        <RecordPaymentDialog
          open={recordPaymentOpen}
          onClose={() => setRecordPaymentOpen(false)}
          onSave={saveRecordedPayment}
        />
      )}
    </div>
  );
}

function mergeRecordedPayments(
  summary: CashierDashboardSummary,
  recordedPayments: RecentPayment[],
  range: DashboardRange,
): DashboardSummary {
  const rangePayments = recordedPayments.filter((payment) =>
    paymentMatchesRange(payment, range),
  );
  const recentActivity = [...rangePayments, ...summary.recentActivity].sort(
    (a, b) => Date.parse(b.time) - Date.parse(a.time),
  );

  return {
    ...summary,
    todayCollectionsTotal: rangePayments.reduce(
      (total, payment) => add(total, payment.amount),
      summary.todayCollectionsTotal,
    ),
    paymentsTodayCount: summary.paymentsTodayCount + rangePayments.length,
    recentActivity,
  };
}

function paymentMatchesRange(
  payment: RecentPayment,
  range: DashboardRange,
): boolean {
  if (range === "school_year") return true;

  const paymentTime = Date.parse(payment.time);
  if (range === "today") return paymentTime >= startOfManilaDay(new Date());

  const days = range === "last_7_days" ? 7 : 30;
  return paymentTime >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function startOfManilaDay(value: Date): number {
  const manilaOffsetMs = 8 * 60 * 60 * 1000;
  const manilaDate = new Date(value.getTime() + manilaOffsetMs);
  return (
    Date.UTC(
      manilaDate.getUTCFullYear(),
      manilaDate.getUTCMonth(),
      manilaDate.getUTCDate(),
    ) - manilaOffsetMs
  );
}

function PageHeading({
  user,
  range,
  onRangeChange,
  onRecordPayment,
}: {
  user: AuthenticatedUser;
  range?: DashboardRange;
  onRangeChange?: (range: DashboardRange) => void;
  onRecordPayment?: () => void;
}) {
  const selectedRange = range
    ? DASHBOARD_RANGE_OPTIONS.find((option) => option.value === range)?.label.toLowerCase()
    : undefined;

  return (
    <div className="flex items-end justify-between gap-4">
      <div>
      <h1 className="text-xl font-semibold text-text-primary">
        {en.dashboard.greeting.replace("{name}", user.name)}
      </h1>
        {selectedRange && (
          <p className="mt-1 text-sm text-text-secondary">
            {en.dashboard.subtitle.replace("{range}", selectedRange)}
          </p>
        )}
      </div>
      {range && onRangeChange && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <DashboardRangeFilter value={range} onChange={onRangeChange} />
          {user.role === "cashier" && (
            <Button onClick={onRecordPayment} className="text-base">
              {en.dashboard.recordPayment}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
