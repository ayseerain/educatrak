import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/Table";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { en } from "@/i18n/en";
import { format } from "@/lib/money";
import { formatDate, formatDateTime, formatTime } from "@/lib/dates";
import type { DashboardRange, RecentPayment } from "@/api/dashboardTypes";
import { dashboardRangeLabel } from "./dashboardRangeLabels";

const PAYMENT_STATUS_LABEL: Record<RecentPayment["status"], string> = {
  posted: en.status.posted,
  void_pending: en.status.voidPending,
  voided: en.status.voided,
};

const ACTIVITY_LIMIT_OPTIONS = [
  { value: "5", label: en.dashboard.activityLatest5 },
  { value: "10", label: en.dashboard.activityLatest10 },
  { value: "all", label: en.dashboard.activityAll },
];

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
        const label = PAYMENT_STATUS_LABEL[getValue<RecentPayment["status"]>()];
        return <StatusBadge status={label} />;
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

  const emptyMessage =
    range === "today"
      ? en.states.emptyActivity
      : en.states.emptyActivityInRange.replace("{range}", dashboardRangeLabel(range));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="recent-activity-heading"
          className="text-lg font-semibold text-text-primary"
        >
          {en.dashboard.recentActivity}
        </h2>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-text-secondary">
          <span>{en.dashboard.activityRows}</span>
          <DropdownSelect
            aria-label={en.dashboard.activityRows}
            value={activityLimit}
            options={ACTIVITY_LIMIT_OPTIONS}
            onChange={setActivityLimit}
            className="min-w-[150px]"
            contentClassName="min-w-[150px]"
          />
        </label>
      </div>
      {payments.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <DataTable
          columns={columns}
          data={visiblePayments}
          caption={en.dashboard.recentActivity}
        />
      )}
    </div>
  );
}
