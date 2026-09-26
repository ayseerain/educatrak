import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { en } from "@/i18n/en";
import { format } from "@/lib/money";
import { formatTime } from "@/lib/dates";
import type { RecentPayment } from "@/api/dashboardTypes";

const METHOD_LABEL: Record<RecentPayment["method"], string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  gcash: "GCash",
  check: "Check",
};

const STATUS_BADGE: Record<
  RecentPayment["status"],
  { tone: "success" | "warning" | "error"; label: string }
> = {
  posted: { tone: "success", label: en.status.posted },
  pending: { tone: "warning", label: en.status.pending },
  voided: { tone: "error", label: en.status.voided },
};

interface RecentActivityProps {
  payments: RecentPayment[];
  /** Cashier can act on rows (e.g. view receipt); Auditor is read-only. */
  showActions?: boolean;
}

export function RecentActivity({
  payments,
  showActions = false,
}: RecentActivityProps) {
  const columns: ColumnDef<RecentPayment>[] = [
    {
      accessorKey: "time",
      header: en.table.time,
      cell: ({ getValue }) => (
        <span className="text-text-muted-readable">
          {formatTime(getValue<string>())}
        </span>
      ),
    },
    {
      accessorKey: "studentName",
      header: en.table.student,
    },
    {
      accessorKey: "receiptNo",
      header: en.table.receiptNo,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "amount",
      header: en.table.amount,
      cell: ({ getValue }) => (
        <span className="font-medium">{format(getValue<RecentPayment["amount"]>())}</span>
      ),
    },
    {
      accessorKey: "method",
      header: en.table.method,
      cell: ({ getValue }) => METHOD_LABEL[getValue<RecentPayment["method"]>()],
    },
    {
      accessorKey: "status",
      header: en.table.status,
      cell: ({ getValue }) => {
        const badge = STATUS_BADGE[getValue<RecentPayment["status"]>()];
        return <Badge tone={badge.tone} label={badge.label} />;
      },
    },
    ...(showActions
      ? [
          {
            id: "actions",
            header: en.table.actions,
            cell: () => (
              <button
                type="button"
                className="text-sm font-medium text-brand-green-dark underline-offset-2 hover:underline"
              >
                {en.table.viewReceipt}
              </button>
            ),
          } as ColumnDef<RecentPayment>,
        ]
      : []),
  ];

  if (payments.length === 0) {
    return <EmptyState message={en.states.emptyActivity} />;
  }

  return (
    <DataTable columns={columns} data={payments} caption={en.dashboard.recentActivity} />
  );
}
