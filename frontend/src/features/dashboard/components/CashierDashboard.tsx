import { DashboardStatCard } from "./DashboardStatCard";
import {
  Banknote,
  ClipboardCheck,
  MailSearch,
  ReceiptText,
  Users,
} from "lucide-react";
import { Card, CardBody, CardHeader, CARD_SURFACE } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Link } from "react-router-dom";
import { AccountStatusOverview } from "./AccountStatusOverview";
import { RecentActivity } from "./RecentActivity";
import { en } from "@/i18n/en";
import { format } from "@/lib/money";
import type { CashierDashboardSummary, DashboardRange } from "@/api/dashboardTypes";
import { financialStatLabelsForRange } from "./dashboardRangeLabels";

interface CashierDashboardProps {
  summary: CashierDashboardSummary;
  range: DashboardRange;
}

export function CashierDashboard({ summary, range }: CashierDashboardProps) {
  const statLabels = financialStatLabelsForRange(range);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label={statLabels.collections} value={format(range === "today" ? summary.todayCollectionsTotal : summary.rangeCollectionsTotal)} icon={Banknote} action={{ to: "/payments", label: en.dashboard.viewPayments }} />
        <DashboardStatCard label={statLabels.payments} value={String(range === "today" ? summary.paymentsTodayCount : summary.paymentsInRangeCount)} icon={ReceiptText} />
        <DashboardStatCard label={en.dashboard.dueSoon} value={String(summary.accountStatusOverview.dueSoon)} helperText={en.dashboard.dueSoonAccounts} icon={Users} action={{ to: "/followup?status=due_soon", label: en.dashboard.reviewFollowups }} />
        <DashboardStatCard label={en.dashboard.failedEmails} value={String(summary.failedEmailCount)} icon={MailSearch} action={{ to: "/followup?view=notifications&status=failed", label: en.dashboard.viewFailedEmails }} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <CloseoutStatus done={summary.closeoutDone} />
        <AccountStatusOverview
          accountsNeedingAttention={summary.accountsNeedingAttention}
        />
      </div>

      <section aria-labelledby="recent-activity-heading" className={`${CARD_SURFACE} p-5`}>
        <RecentActivity payments={summary.recentActivity} range={range} showActions />
      </section>
    </div>
  );
}

function CloseoutStatus({
  done,
  className,
}: {
  done: boolean;
  className?: string;
}) {
  const statusLabel = done
    ? en.dashboard.closeoutStatusDone
    : en.dashboard.closeoutStatusOpen;

  return (
    <Card className={`p-0 ${className ?? ""}`} aria-labelledby="closeout-status-heading">
      <CardHeader
        titleId="closeout-status-heading"
        icon={<ClipboardCheck aria-hidden="true" />}
        title={en.dashboard.closeoutReminder}
      />
      <CardBody className="space-y-3">
        <Badge tone={done ? "success" : "warning"} label={statusLabel} />
        <p className="text-sm text-text-secondary">
          {done
            ? en.dashboard.closeoutStatusDoneHelp
            : en.dashboard.closeoutStatusOpenHelp}
        </p>
        <Link to="/closeout" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          {en.dashboard.reviewCloseout}
        </Link>
      </CardBody>
    </Card>
  );
}
