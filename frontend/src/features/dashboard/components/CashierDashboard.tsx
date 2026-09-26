import { DashboardStatCard } from "./DashboardStatCard";
import {
  AlertCircle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  MailSearch,
  ReceiptText,
  Users,
} from "lucide-react";
import { Card, CardLabel } from "@/components/ui/Card";
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
      <div className="grid grid-cols-2 items-start gap-3 lg:grid-cols-5">
        <DashboardStatCard
          label={en.dashboard.overallEnrolledStudents}
          value={String(summary.overallEnrolledStudents)}
          icon={Users}
        />
        <DashboardStatCard
          label={en.dashboard.todayCollections}
          value={format(summary.todayCollectionsTotal)}
          icon={Banknote}
        />
        <DashboardStatCard
          label={en.dashboard.paymentsToday}
          value={String(summary.paymentsTodayCount)}
          icon={ReceiptText}
        />
        <DashboardStatCard
          label={en.dashboard.dueSoon}
          value={String(summary.dueSoonCount)}
          icon={CalendarClock}
        />
        <DashboardStatCard
          label={en.dashboard.failedEmails}
          value={String(summary.failedEmailCount)}
          icon={MailSearch}
          action={{ to: "/notifications", label: en.dashboard.viewFailedEmails }}
        />
      </div>

      <CloseoutStatus done={summary.closeoutDone} />

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

function CloseoutStatus({ done }: { done: boolean }) {
  const StatusIcon = done ? CheckCircle2 : AlertCircle;
  const statusLabel = done
    ? en.dashboard.closeoutStatusDone
    : en.dashboard.closeoutStatusOpen;

  return (
    <Card
      className={`relative overflow-hidden border-l-4 p-5 ${
        done ? "border-l-status-success bg-[#F4FAF5]" : "border-l-status-warning bg-[#FFF9F0]"
      }`}
      aria-labelledby="closeout-status-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
              done
                ? "bg-[#E0F2E4] text-status-success"
                : "bg-[#FBEEDC] text-status-warning"
            }`}
          >
            <StatusIcon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <CardLabel id="closeout-status-heading" className="text-sm uppercase tracking-[0.08em]">
              {en.dashboard.closeoutReminder}
            </CardLabel>
            <p className="mt-1 text-lg font-semibold text-text-primary">{statusLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary sm:max-w-xs sm:text-right">
          <ClipboardCheck aria-hidden="true" className="hidden h-4 w-4 shrink-0 sm:block" />
          <span>
            {done
              ? en.dashboard.closeoutStatusDoneHelp
              : en.dashboard.closeoutStatusOpenHelp}
          </span>
        </div>
      </div>
    </Card>
  );
}
