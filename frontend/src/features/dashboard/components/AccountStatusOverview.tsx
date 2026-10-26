import {
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardLabel } from "@/components/ui/Card";
import { en } from "@/i18n/en";
import { cn } from "@/lib/cn";
import { format } from "@/lib/money";
import { STATUS_TONE_STYLES } from "@/lib/status";
import type { CashierAttentionAccount } from "@/api/dashboardTypes";

interface AccountStatusOverviewProps {
  accountsNeedingAttention: CashierAttentionAccount[];
  className?: string;
}

export function AccountStatusOverview({
  accountsNeedingAttention,
  className,
}: AccountStatusOverviewProps) {
  return (
    <Card
      className={cn("flex flex-col p-0", className)}
      aria-labelledby="accounts-needing-attention-heading"
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <CardLabel id="accounts-needing-attention-heading" className="text-base font-semibold text-text-primary">
            {en.dashboard.accountsNeedingAttention}
          </CardLabel>
          <Link
            to="/followup"
            className="text-sm font-medium text-brand-green-dark underline-offset-2 hover:underline"
          >
            {en.dashboard.viewAll}
          </Link>
        </div>
      </div>
      <div className="divide-y divide-border">
        {accountsNeedingAttention.length > 0 ? (
          accountsNeedingAttention.map((account) => (
            <AttentionAccountRow key={account.id} account={account} />
          ))
        ) : (
          <p className="px-4 py-5 text-sm text-text-secondary">{en.dashboard.noAccountsNeedingAttention}</p>
        )}
      </div>
    </Card>
  );
}

function AttentionAccountRow({ account }: { account: CashierAttentionAccount }) {
  const isOverdue = account.severity === "error";
  const amountTone = isOverdue ? STATUS_TONE_STYLES.error : STATUS_TONE_STYLES.warning;
  const amountClass = `${amountTone.soft} ${amountTone.text}`;
  const Icon = isOverdue ? AlertTriangle : CalendarClock;
  const status = isOverdue ? en.status.overdue : en.status.dueSoon;

  return (
    <Link
      to={`/followup?status=${isOverdue ? "overdue" : "due_soon"}`}
      className="flex min-h-[72px] items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface focus-visible:bg-surface"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${amountClass}`}>
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-text-primary">{account.studentName}</span>
          <span className="mt-0.5 block text-sm text-text-secondary">{status}</span>
        </span>
      </span>
      <span className={`shrink-0 rounded-sm px-2 py-1 text-sm font-semibold ${amountClass}`}>{format(account.amountDue)}</span>
    </Link>
  );
}
