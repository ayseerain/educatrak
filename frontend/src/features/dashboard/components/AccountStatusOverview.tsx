import { ChevronRight, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { en } from "@/i18n/en";
import { cn } from "@/lib/cn";
import { format } from "@/lib/money";
import type { CashierAttentionAccount } from "@/api/dashboardTypes";

interface AccountStatusOverviewProps {
  accountsNeedingAttention: CashierAttentionAccount[];
  totalCount: number;
  className?: string;
}

const ATTENTION_ACCOUNT_LIMIT = 2;

/** CLINIQ list card: count and preview scope, divided rows with status and amount. */
export function AccountStatusOverview({
  accountsNeedingAttention,
  totalCount,
  className,
}: AccountStatusOverviewProps) {
  const visibleAccounts = accountsNeedingAttention.slice(0, ATTENTION_ACCOUNT_LIMIT);
  const count = totalCount;
  return (
    <Card
      className={cn("flex flex-col p-0", className)}
      aria-labelledby="accounts-needing-attention-heading"
    >
      <CardHeader
        titleId="accounts-needing-attention-heading"
        icon={<ListChecks aria-hidden="true" />}
        title={en.dashboard.accountsNeedingAttention}
        actions={
          <Link
            to="/followup"
            className="text-sm font-semibold text-brand-green-dark transition-colors hover:text-brand-green"
          >
            {en.dashboard.viewAll}
          </Link>
        }
      />
      {count > 0 ? (
        <div className="border-t border-border">
          <p className="px-5 py-2 text-xs text-text-secondary">{count} due soon or overdue accounts · showing {visibleAccounts.length}</p>
          <ul className="divide-y divide-border border-t border-border">
            {visibleAccounts.map((account) => (
              <AttentionAccountRow key={account.id} account={account} />
            ))}
          </ul>
        </div>
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
        className="inline-flex min-w-0 items-center gap-1 text-sm font-semibold text-brand-green-dark transition-colors hover:text-brand-green motion-reduce:transition-none"
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
