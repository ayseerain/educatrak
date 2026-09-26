import { DashboardStatCard } from "./DashboardStatCard";
import { Banknote, CalendarClock, FileClock, Users } from "lucide-react";
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4">
        <DashboardStatCard
          label={en.dashboard.overallEnrolledStudents}
          value={String(summary.overallEnrolledStudents)}
          icon={Users}
        />
        <DashboardStatCard
          label={en.dashboard.pendingVoidApprovals}
          value={String(summary.pendingVoidApprovals)}
          icon={FileClock}
        />
        <DashboardStatCard
          label={en.dashboard.overdueTotal}
          value={format(summary.overdueTotal)}
          icon={CalendarClock}
        />
        <DashboardStatCard
          label={en.dashboard.unsignedCloseouts}
          value={String(summary.unsignedCloseouts)}
          icon={Banknote}
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
