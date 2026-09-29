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
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex h-full flex-col gap-3">
          <div className="grid flex-1 grid-cols-2 items-stretch gap-3">
            <DashboardStatCard
              label={en.dashboard.overallEnrolledStudents}
              value={String(summary.overallEnrolledStudents)}
              icon={Users}
              action={{ to: "/students", label: en.dashboard.viewStudents }}
            />
            <DashboardStatCard
              label={statLabels.collections}
              value={format(summary.todayCollectionsTotal)}
              icon={Banknote}
              action={{ to: "/reports", label: en.dashboard.viewReports }}
            />
            <DashboardStatCard
              label={statLabels.payments}
              value={String(summary.paymentsTodayCount)}
              icon={ReceiptText}
              action={{ to: "/payments", label: en.dashboard.viewPayments }}
            />
            <DashboardStatCard
              label={en.dashboard.failedEmails}
              value={String(summary.failedEmailCount)}
              icon={MailSearch}
              action={{ to: "/notifications?status=failed", label: en.dashboard.viewFailedEmails }}
            />
          </div>
          <CloseoutStatus done={summary.closeoutDone} className="min-h-[116px]" />
        </div>
        <AccountStatusOverview
          className="h-full"
          overview={summary.accountStatusOverview}
          accountsNeedingAttention={summary.accountsNeedingAttention}
        />
      </div>

      <section aria-labelledby="recent-activity-heading">
        <h2
          id="recent-activity-heading"
          className="mb-3 text-lg font-semibold text-text-primary"
        >
          {en.dashboard.recentActivity}
        </h2>
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

  return (
    <Card
      className={`relative overflow-hidden border-l-4 p-4 ${
        done ? "border-l-status-success bg-[#F4FAF5]" : "border-l-status-warning bg-[#FFF9F0]"
      } ${className ?? ""}`}
      aria-labelledby="closeout-status-heading"
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
            done
              ? "bg-[#E0F2E4] text-status-success"
              : "bg-[#FBEEDC] text-status-warning"
          }`}
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
        </div>
      </div>
    </Card>
  );
}
