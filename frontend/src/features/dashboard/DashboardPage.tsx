import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Users } from "lucide-react";
import { useDashboard } from "./hooks/useDashboard";
import { CashierDashboard } from "./components/CashierDashboard";
import { AccountingDashboard } from "./components/AccountingDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { AuditorDashboard } from "./components/AuditorDashboard";
import { RegistrarDashboard } from "./components/RegistrarDashboard";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { en } from "@/i18n/en";
import type { AuthenticatedUser } from "@/lib/types";
import type { DashboardRange } from "@/api/dashboardTypes";
import { DashboardRangeFilter, DASHBOARD_RANGE_OPTIONS } from "./components/DashboardRangeFilter";
import { DashboardHeader } from "./components/DashboardHeader";

interface DashboardPageProps {
  user: AuthenticatedUser;
}

export function DashboardPage({ user }: DashboardPageProps) {
  const navigate = useNavigate();
  const [range, setRange] = useState<DashboardRange>(
    user.role === "cashier" || user.role === "auditor" ? "today" : "last_7_days",
  );
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
        range={user.role === "administrator" || user.role === "super_admin" || user.role === "auditor" ? undefined : range}
        onRangeChange={user.role === "administrator" || user.role === "super_admin" || user.role === "auditor" ? undefined : setRange}
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
      {data && data.role === "super_admin" && <SuperAdminDashboard summary={data} />}
      {data && data.role === "auditor" && (
        <AuditorDashboard summary={data} />
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

  const subtitle = selectedRange
    ? en.dashboard.subtitle.replace("{range}", selectedRange)
    : en.dashboard.roleSubtitle[user.role];

  const showRangeControls = user.role === "cashier" || user.role === "accounting";
  const contextualControl = user.role === "auditor" ? <DashboardAction to="/admin/audit-log" icon={ShieldCheck} label={en.dashboard.openAuditReview} />
    : user.role === "administrator" ? <DashboardAction to="/admin/users" icon={Users} label={en.dashboard.manageUsers} />
      : user.role === "super_admin" ? <DashboardAction to="/admin/security-events" icon={ShieldCheck} label={en.dashboard.viewSecurityEvents} />
        : undefined;

  return <DashboardHeader
    workspace={en.dashboard.workspace[user.role]}
    title={en.dashboard.greeting.replace("{name}", user.name)}
    subtitle={subtitle}
    controls={showRangeControls && range && onRangeChange ? <>
      <DashboardRangeFilter value={range} onChange={onRangeChange} />
      {user.role === "cashier" && <Button onClick={onRecordPayment}>{en.dashboard.recordPayment}</Button>}
    </> : contextualControl}
  />;
}

function DashboardAction({ to, icon: Icon, label }: { to: string; icon: typeof ShieldCheck; label: string }) {
  return <Link to={to} className="inline-flex min-h-control items-center gap-2 rounded-md bg-brand-green-dark px-4 text-sm font-medium text-white transition-colors hover:bg-[#023d12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"><Icon aria-hidden="true" className="h-4 w-4" />{label}</Link>;
}
