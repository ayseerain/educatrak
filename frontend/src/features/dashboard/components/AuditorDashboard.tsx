import { DashboardStatCard } from "./DashboardStatCard";
import { RecentActivity } from "./RecentActivity";
import { en } from "@/i18n/en";
import { format } from "@/lib/money";
import type { AuditorDashboardSummary } from "@/api/dashboardTypes";

interface AuditorDashboardProps {
  summary: AuditorDashboardSummary;
}

export function AuditorDashboard({ summary }: AuditorDashboardProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-text-secondary">{en.dashboard.subtitle}</p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardStatCard
          label={en.dashboard.todayCollections}
          value={format(summary.todayCollectionsTotal)}
        />
        <DashboardStatCard
          label={en.dashboard.paymentsToday}
          value={String(summary.paymentsTodayCount)}
        />
      </div>

      <div className="flex gap-3">
        <a
          href="/reports"
          className="text-sm font-medium text-brand-green-dark underline-offset-2 hover:underline"
        >
          {en.dashboard.goToReports}
        </a>
        <a
          href="/audit-log"
          className="text-sm font-medium text-brand-green-dark underline-offset-2 hover:underline"
        >
          {en.dashboard.goToAuditLog}
        </a>
      </div>

      {/* Auditor view is read-only: no showActions, no record/void/approve controls. */}
      <section aria-labelledby="recent-activity-heading">
        <h2
          id="recent-activity-heading"
          className="mb-3 text-lg font-semibold text-text-primary"
        >
          {en.dashboard.recentActivity}
        </h2>
        <RecentActivity payments={summary.recentActivity} />
      </section>
    </div>
  );
}
