import { DashboardStatCard } from "./DashboardStatCard";
import { CollectionTrend } from "./CollectionTrend";
import { RecentActivity } from "./RecentActivity";
import { en } from "@/i18n/en";
import { format } from "@/lib/money";
import type { AccountingDashboardSummary } from "@/api/dashboardTypes";

interface AccountingDashboardProps {
  summary: AccountingDashboardSummary;
}

export function AccountingDashboard({ summary }: AccountingDashboardProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-text-secondary">{en.dashboard.subtitle}</p>

      <div className="grid grid-cols-3 gap-4">
        <DashboardStatCard
          label={en.dashboard.pendingVoidApprovals}
          value={String(summary.pendingVoidApprovals)}
          badge={
            summary.pendingVoidApprovals > 0
              ? { tone: "warning", label: en.status.pending }
              : undefined
          }
        />
        <DashboardStatCard
          label={en.dashboard.overdueTotal}
          value={format(summary.overdueTotal)}
          badge={{ tone: "error", label: en.status.overdue }}
        />
        <DashboardStatCard
          label={en.dashboard.unsignedCloseouts}
          value={String(summary.unsignedCloseouts)}
        />
      </div>

      <CollectionTrend points={summary.collectionTrend} />

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
