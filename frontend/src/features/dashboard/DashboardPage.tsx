import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "./hooks/useDashboard";
import { CashierDashboard } from "./components/CashierDashboard";
import { AccountingDashboard } from "./components/AccountingDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { AuditorDashboard } from "./components/AuditorDashboard";
import { RegistrarDashboard } from "./components/RegistrarDashboard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { en } from "@/i18n/en";
import type { AuthenticatedUser } from "@/lib/types";
import type { DashboardRange } from "@/api/dashboardTypes";
import { DashboardRangeFilter, DASHBOARD_RANGE_OPTIONS } from "./components/DashboardRangeFilter";

interface DashboardPageProps {
  user: AuthenticatedUser;
}

export function DashboardPage({ user }: DashboardPageProps) {
  const navigate = useNavigate();
  const [range, setRange] = useState<DashboardRange>("last_7_days");
  const { data, isPending, isError, refetch } = useDashboard(user, range);

  // Registrar's dashboard carries no financial data and needs no fetch;
  // rendering it directly keeps the role overview free of financial fields.
  if (user.role === "registrar") {
    return (
      <div className="flex h-full flex-col">
        <PageHeading user={user} />
        <RegistrarDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeading
        user={user}
        range={range}
        onRangeChange={setRange}
        onRecordPayment={() => navigate("/payments/new")}
      />

      {isPending && <LoadingState message={en.states.loadingDashboard} />}

      {isError && (
        <ErrorState
          message={en.states.errorDashboard}
          onRetry={() => refetch()}
        />
      )}

      {data && data.role === "cashier" && (
        <CashierDashboard
          summary={data}
          range={range}
        />
      )}
      {data && data.role === "accounting" && (
        <AccountingDashboard summary={data} range={range} />
      )}
      {data && data.role === "administrator" && (
        <AdminDashboard summary={data} />
      )}
      {data && data.role === "auditor" && (
        <AuditorDashboard summary={data} range={range} />
      )}
    </div>
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
