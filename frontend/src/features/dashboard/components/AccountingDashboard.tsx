import { DashboardStatCard } from "./DashboardStatCard";
import { Banknote, CalendarClock, FileClock } from "lucide-react";
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
      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardStatCard
          label={en.dashboard.pendingVoidApprovals}
          value={String(summary.pendingVoidApprovals)}
          icon={FileClock}
          action={{ to: "/voids", label: en.dashboard.reviewVoidRequests }}
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
          action={{ to: "/closeout/history", label: en.dashboard.signOffCloseouts }}
        />
      </div>

      <CollectionTrend points={summary.collectionTrend} range={range} />

      <section aria-labelledby="recent-activity-heading" className="rounded-md border border-border bg-white p-4 shadow-card">
        <RecentActivity payments={summary.recentActivity} range={range} />
      </section>
    </div>
  );
}
