import { ShieldCheck, UsersRound } from "lucide-react";
import { AuditActivityPreview } from "./AuditActivityPreview";
import { DashboardStatCard } from "./DashboardStatCard";
import { StaffAccountOverview } from "./StaffAccountOverview";
import type { SuperAdministratorDashboardSummary } from "@/api/dashboardTypes";
import { en } from "@/i18n/en";

export function SuperAdminDashboard({ summary }: { summary: SuperAdministratorDashboardSummary }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <DashboardStatCard label={en.dashboard.activeAccounts} value={String(summary.activeUserCount)} icon={UsersRound} action={{ to: "/admin/users", label: en.dashboard.manageUsers }} />
        <DashboardStatCard label={en.dashboard.privilegedAccounts} value={String(summary.staffAccounts?.privileged ?? 0)} helperText={en.dashboard.privilegedAccountsHelp} icon={ShieldCheck} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <StaffAccountOverview
          summary={summary.staffAccounts}
          title={en.dashboard.governanceAccountOverview}
          description={en.dashboard.governanceAccountOverviewHelp}
        />
        <AuditActivityPreview
          title={en.dashboard.governanceActivity}
          description={en.dashboard.governanceActivityHelp}
          entries={summary.recentAdministrativeActivity}
          emptyMessage={en.dashboard.noGovernanceActivity}
          to="/admin/audit-log"
          actionLabel={en.dashboard.goToAuditLog}
        />
      </div>
      <AuditActivityPreview
        title={en.dashboard.securityEvents}
        description={en.dashboard.securityEventsHelp}
        entries={summary.securityEvents}
        emptyMessage={en.dashboard.noSecurityEvents}
        to="/admin/security-events"
        actionLabel={en.dashboard.viewSecurityEvents}
      />
    </div>
  );
}
