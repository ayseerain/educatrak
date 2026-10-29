import { ChevronRight, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { en } from "@/i18n/en";
import { cn } from "@/lib/cn";
import { format } from "@/lib/money";
import type { CashierAttentionAccount } from "@/api/dashboardTypes";

interface AccountStatusOverviewProps {
  accountsNeedingAttention: CashierAttentionAccount[];
  className?: string;
}

/** CLINIQ list card: header with a count, divided rows with a status badge and a plain amount. */
export function AccountStatusOverview({
  accountsNeedingAttention,
  className,
}: AccountStatusOverviewProps) {
  const count = accountsNeedingAttention.length;
  return (
    <Card
      className={cn("flex flex-col p-0", className)}
      aria-labelledby="accounts-needing-attention-heading"
    >
      <CardHeader
        titleId="accounts-needing-attention-heading"
        icon={<ListChecks aria-hidden="true" />}
        title={
          <span className="flex items-center gap-2 whitespace-nowrap">
            {en.dashboard.accountsNeedingAttention}
            <Badge tone="neutral" label={String(count)} />
          </span>
        }
        actions={
          <Link
            to="/followup"
            className="text-sm font-semibold text-brand-green-dark underline decoration-brand-green-dark/40 underline-offset-2 transition-colors hover:text-brand-green hover:decoration-brand-green"
          >
            {en.dashboard.viewAll}
          </Link>
        }
      />
      {count > 0 ? (
        <ul className="divide-y divide-border border-t border-border">
          {accountsNeedingAttention.map((account) => (
            <AttentionAccountRow key={account.id} account={account} />
          ))}
        </ul>
      ) : (
        <EmptyState message={en.dashboard.noAccountsNeedingAttention} />
      )}
    </Card>
  );
}

function AttentionAccountRow({ account }: { account: CashierAttentionAccount }) {
  const isOverdue = account.severity === "error";

  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <Link
        to={`/followup?status=${isOverdue ? "overdue" : "due_soon"}`}
        className="inline-flex min-w-0 items-center gap-1 text-sm font-semibold text-brand-green-dark underline decoration-brand-green-dark/40 underline-offset-2 transition-colors hover:text-brand-green hover:decoration-brand-green motion-reduce:transition-none"
      >
        <span className="min-w-0 truncate">{account.studentName}</span>
        <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      </Link>
      <span className="flex shrink-0 flex-col items-end gap-1 text-right">
        <StatusBadge status={isOverdue ? en.status.overdue : en.status.dueSoon} />
        <span className="text-sm font-semibold tabular-nums text-text-primary">{format(account.amountDue)}</span>
      </span>
    </li>
  );
}
