import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { en } from "@/i18n/en";
import { format } from "@/lib/money";
import { formatDate, formatDateTime, formatTime } from "@/lib/dates";
import type { DashboardRange, RecentPayment } from "@/api/dashboardTypes";
import { dashboardRangeLabel } from "./dashboardRangeLabels";

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
  range: DashboardRange;
  /** Cashier can act on rows (e.g. view receipt); Auditor is read-only. */
  showActions?: boolean;
}

export function RecentActivity({
  payments,
  range,
  showActions = false,
}: RecentActivityProps) {
  const [activityLimit, setActivityLimit] = useState("5");
  const visiblePayments =
    activityLimit === "all"
      ? payments
      : payments.slice(0, Number(activityLimit));
  const columns: ColumnDef<RecentPayment>[] = [
    {
      accessorKey: "time",
      header: en.table.time,
      cell: ({ getValue }) => (
        <span className="text-text-muted-readable">
          {formatDate(getValue<string>()) === formatDate(new Date())
            ? formatTime(getValue<string>())
            : formatDateTime(getValue<string>())}
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
      cell: ({ getValue }) => en.recordPayment.methods[getValue<RecentPayment["method"]>()],
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
    const message =
      range === "today"
        ? en.states.emptyActivity
        : en.states.emptyActivityInRange.replace("{range}", dashboardRangeLabel(range));

    return <EmptyState message={message} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
          <span>{en.dashboard.activityRows}</span>
          <select
            className="h-10 rounded-md border border-border bg-white px-3 text-sm text-text-primary focus-visible:border-brand-green-dark"
            value={activityLimit}
            onChange={(event) => setActivityLimit(event.target.value)}
          >
            <option value="5">{en.dashboard.activityLatest5}</option>
            <option value="10">{en.dashboard.activityLatest10}</option>
            <option value="all">{en.dashboard.activityAll}</option>
          </select>
        </label>
      </div>
      <DataTable
        columns={columns}
        data={visiblePayments}
        caption={en.dashboard.recentActivity}
      />
    </div>
  );
}
