import { DashboardStatCard } from "./DashboardStatCard";
import { DashboardWorkPanel } from "./DashboardWorkPanel";
import { RecentActivity } from "./RecentActivity";
import { Banknote, FileSearch, ReceiptText, ShieldCheck, Users } from "lucide-react";
import { en } from "@/i18n/en";
import { format } from "@/lib/money";
import type { AuditorDashboardSummary, DashboardRange } from "@/api/dashboardTypes";
import { financialStatLabelsForRange } from "./dashboardRangeLabels";

interface AuditorDashboardProps {
  summary: AuditorDashboardSummary;
  range: DashboardRange;
}

export function AuditorDashboard({ summary, range }: AuditorDashboardProps) {
  const statLabels = financialStatLabelsForRange(range);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-3">
        <DashboardStatCard
          label={en.dashboard.overallEnrolledStudents}
          value={String(summary.overallEnrolledStudents)}
          icon={Users}
        />
        <DashboardStatCard
          label={statLabels.collections}
          value={format(summary.todayCollectionsTotal)}
          icon={Banknote}
        />
        <DashboardStatCard
          label={statLabels.payments}
          value={String(summary.paymentsTodayCount)}
          icon={ReceiptText}
        />
      </div>

      <DashboardWorkPanel
        title={en.dashboard.auditorWorkspace}
        description={en.dashboard.auditorWorkspaceHelp}
        items={[
          {
            label: en.dashboard.goToReports,
            detail: en.dashboard.goToReportsHelp,
            to: "/reports",
            icon: FileSearch,
          },
          {
            label: en.dashboard.goToAuditLog,
            detail: en.dashboard.goToAuditLogHelp,
            to: "/admin/audit-log",
            icon: ShieldCheck,
          },
        ]}
      />

      {/* Auditor view is read-only: no showActions, no record/void/approve controls. */}
      <section aria-labelledby="recent-activity-heading">
        <RecentActivity payments={summary.recentActivity} range={range} />
      </section>
    </div>
  );
}
