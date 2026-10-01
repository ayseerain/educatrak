import { DashboardStatCard } from "./DashboardStatCard";
import { RecentActivity } from "./RecentActivity";
import { Banknote, ReceiptText, Users } from "lucide-react";
import { Link } from "react-router-dom";
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

      <div className="flex gap-3">
        <Link
          to="/reports"
          className="text-sm font-medium text-brand-green-dark underline-offset-2 hover:underline"
        >
          {en.dashboard.goToReports}
        </Link>
        <Link
          to="/admin/audit-log"
          className="text-sm font-medium text-brand-green-dark underline-offset-2 hover:underline"
        >
          {en.dashboard.goToAuditLog}
        </Link>
      </div>

      {/* Auditor view is read-only: no showActions, no record/void/approve controls. */}
      <section aria-labelledby="recent-activity-heading">
        <RecentActivity payments={summary.recentActivity} range={range} />
      </section>
    </div>
  );
}
