import { DashboardStatCard } from "./DashboardStatCard";
import { Banknote, CalendarClock, FileClock, Users } from "lucide-react";
import { CollectionTrend } from "./CollectionTrend";
import { RecentActivity } from "./RecentActivity";
import { en } from "@/i18n/en";
import { format } from "@/lib/money";
import type { AccountingDashboardSummary, DashboardRange } from "@/api/dashboardTypes";

interface AccountingDashboardProps {
  summary: AccountingDashboardSummary;
  range: DashboardRange;
}

export function AccountingDashboard({ summary, range }: AccountingDashboardProps) {
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

      <CollectionTrend points={summary.collectionTrend} range={range} />

      <section aria-labelledby="recent-activity-heading">
        <RecentActivity payments={summary.recentActivity} range={range} />
      </section>
    </div>
  );
}
