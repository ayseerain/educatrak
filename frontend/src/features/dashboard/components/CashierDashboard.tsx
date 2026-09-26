import { DashboardStatCard } from "./DashboardStatCard";
import { RecentActivity } from "./RecentActivity";
import { en } from "@/i18n/en";
import { format } from "@/lib/money";
import type { CashierDashboardSummary } from "@/api/dashboardTypes";

interface CashierDashboardProps {
  summary: CashierDashboardSummary;
}

export function CashierDashboard({ summary }: CashierDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <DashboardStatCard
          label={en.dashboard.overallEnrolledStudents}
          value={String(summary.overallEnrolledStudents)}
        />
        <DashboardStatCard
          label={en.dashboard.todayCollections}
          value={format(summary.todayCollectionsTotal)}
        />
        <DashboardStatCard
          label={en.dashboard.paymentsToday}
          value={String(summary.paymentsTodayCount)}
        />
        <DashboardStatCard
          label={en.dashboard.dueSoon}
          value={String(summary.dueSoonCount)}
          badge={
            summary.dueSoonCount > 0
              ? { tone: "warning", label: en.status.dueSoon }
              : undefined
          }
        />
        <DashboardStatCard
          label={en.dashboard.failedEmails}
          value={String(summary.failedEmailCount)}
          badge={
            summary.failedEmailCount > 0
              ? { tone: "error", label: en.status.error }
              : undefined
          }
        />
        <DashboardStatCard
          label={en.dashboard.closeoutReminder}
          value={
            summary.closeoutDone
              ? en.dashboard.closeoutStatusDone
              : en.dashboard.closeoutStatusOpen
          }
          badge={
            summary.closeoutDone
              ? { tone: "success", label: en.status.cleared }
              : { tone: "warning", label: en.status.pending }
          }
        />
      </div>

      <section aria-labelledby="recent-activity-heading">
        <h2
          id="recent-activity-heading"
          className="mb-3 text-lg font-semibold text-text-primary"
        >
          {en.dashboard.recentActivity}
        </h2>
        <RecentActivity payments={summary.recentActivity} showActions />
      </section>
    </div>
  );
}
