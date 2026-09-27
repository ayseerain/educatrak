import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardLabel } from "@/components/ui/Card";
import { en } from "@/i18n/en";
import { cn } from "@/lib/cn";
import { format } from "@/lib/money";
import type {
  CashierAccountStatusOverview,
  CashierAttentionAccount,
} from "@/api/dashboardTypes";
import type { LucideIcon } from "lucide-react";

interface AccountStatusOverviewProps {
  overview: CashierAccountStatusOverview;
  accountsNeedingAttention: CashierAttentionAccount[];
  className?: string;
}

type StatusTone = "success" | "info" | "warning" | "error";

interface StatusRow {
  key: keyof CashierAccountStatusOverview;
  label: string;
  count: number;
  tone: StatusTone;
  icon: LucideIcon;
}

const TONE_CLASS: Record<StatusTone, { text: string; bar: string; soft: string }> = {
  success: {
    text: "text-status-success",
    bar: "bg-status-success",
    soft: "bg-[#E0F2E4]",
  },
  info: {
    text: "text-status-info",
    bar: "bg-status-info",
    soft: "bg-[#E8F2FC]",
  },
  warning: {
    text: "text-status-warning",
    bar: "bg-status-warning",
    soft: "bg-[#FBEEDC]",
  },
  error: {
    text: "text-status-error",
    bar: "bg-status-error",
    soft: "bg-[#FDE7E7]",
  },
};

export function AccountStatusOverview({
  overview,
  accountsNeedingAttention,
  className,
}: AccountStatusOverviewProps) {
  const rows: StatusRow[] = [
    {
      key: "cleared",
      label: en.status.cleared,
      count: overview.cleared,
      tone: "success",
      icon: CheckCircle2,
    },
    {
      key: "current",
      label: en.status.current,
      count: overview.current,
      tone: "info",
      icon: CircleDollarSign,
    },
    {
      key: "dueSoon",
      label: en.status.dueSoon,
      count: overview.dueSoon,
      tone: "warning",
      icon: CalendarClock,
    },
    {
      key: "overdue",
      label: en.status.overdue,
      count: overview.overdue,
      tone: "error",
      icon: AlertTriangle,
    },
  ];
  const totalAccounts = rows.reduce((total, row) => total + row.count, 0);

  return (
    <Card
      className={cn("flex flex-col p-4", className)}
      aria-labelledby="account-status-overview-heading"
    >
      <CardLabel
        id="account-status-overview-heading"
        className="text-base font-semibold text-text-primary"
      >
        {en.dashboard.accountStatusOverview}
      </CardLabel>

      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <OverviewStatusRow
            key={row.key}
            row={row}
            percent={totalAccounts === 0 ? 0 : Math.round((row.count / totalAccounts) * 100)}
          />
        ))}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-primary">
            {en.dashboard.accountsNeedingAttention}
          </h2>
          <Link
            to="/followup"
            className="text-sm font-medium text-brand-green-dark underline-offset-2 hover:underline"
          >
            {en.dashboard.viewAll}
          </Link>
        </div>
        <div className="space-y-2">
          {accountsNeedingAttention.map((account) => (
            <AttentionAccountRow key={account.id} account={account} />
          ))}
        </div>
      </div>
    </Card>
  );
}

function OverviewStatusRow({
  row,
  percent,
}: {
  row: StatusRow;
  percent: number;
}) {
  const Icon = row.icon;
  const tone = TONE_CLASS[row.tone];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tone.soft} ${tone.text}`}
          >
            <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="truncate text-sm font-medium text-text-primary">
            {row.label}
          </span>
        </div>
        <span className="shrink-0 text-sm text-text-secondary">
          {en.dashboard.studentCount.replace("{count}", String(row.count))}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-sm bg-surface"
        role="progressbar"
        aria-label={`${row.label}: ${row.count}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className={`h-full rounded-sm ${tone.bar}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function AttentionAccountRow({ account }: { account: CashierAttentionAccount }) {
  const isOverdue = account.severity === "error";
  const amountClass = isOverdue
    ? "bg-[#FDE7E7] text-status-error"
    : "bg-[#FBEEDC] text-status-warning";

  return (
    <div className="flex min-h-10 items-center justify-between gap-3 rounded-md bg-surface px-3 py-2">
      <span className="min-w-0 truncate text-sm font-medium text-text-primary">
        {account.studentName}
      </span>
      <span className={`shrink-0 rounded-sm px-2 py-1 text-sm font-medium ${amountClass}`}>
        {format(account.amountDue)}
      </span>
    </div>
  );
}
