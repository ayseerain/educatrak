import { DashboardStatCard } from "./DashboardStatCard";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  MailSearch,
  ReceiptText,
  Users,
} from "lucide-react";
import { Card, CardLabel } from "@/components/ui/Card";
import { Link } from "react-router-dom";
import { AccountStatusOverview } from "./AccountStatusOverview";
import { RecentActivity } from "./RecentActivity";
import { en } from "@/i18n/en";
import { format } from "@/lib/money";
import { STATUS_TONE_STYLES } from "@/lib/status";
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
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <CloseoutStatus done={summary.closeoutDone} />
        <AccountStatusOverview
          accountsNeedingAttention={summary.accountsNeedingAttention}
        />
      </div>

      <section aria-labelledby="recent-activity-heading" className="rounded-md border border-border bg-white p-4 shadow-card">
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
  const StatusIcon = done ? CheckCircle2 : AlertCircle;
  const statusLabel = done
    ? en.dashboard.closeoutStatusDone
    : en.dashboard.closeoutStatusOpen;
  const statusTone = done ? STATUS_TONE_STYLES.success : STATUS_TONE_STYLES.warning;

  return (
    <Card
      className={`relative overflow-hidden border-l-4 p-4 ${statusTone.borderLeft} ${statusTone.surface} ${className ?? ""}`}
      aria-labelledby="closeout-status-heading"
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${statusTone.soft} ${statusTone.text}`}
        >
          <StatusIcon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <CardLabel id="closeout-status-heading" className="text-sm uppercase tracking-[0.08em]">
            {en.dashboard.closeoutReminder}
          </CardLabel>
          <p className="mt-1 text-lg font-semibold text-text-primary">{statusLabel}</p>
          <p className="mt-2 flex items-start gap-2 text-sm text-text-secondary">
            <ClipboardCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {done
                ? en.dashboard.closeoutStatusDoneHelp
                : en.dashboard.closeoutStatusOpenHelp}
            </span>
          </p>
          <Link to="/closeout" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-brand-green-dark underline-offset-2 hover:underline">
            {en.dashboard.reviewCloseout}
          </Link>
        </div>
      </div>
    </Card>
  );
}
