import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { listNotificationLogs, retryNotification, type NotificationLogEntry } from "@/api/notificationApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { TableFilters, activeTableFilters, dateRangeError, useTableFilters } from "@/components/ui/TableFilters";
import { can } from "@/lib/permissions";
import type { AuthenticatedUser } from "@/lib/types";

const notificationFilterDefaults = { status: "", dateFrom: "", dateTo: "", student: "" };
type Filters = typeof notificationFilterDefaults;

function filtersFromSearch(search: string): Filters {
  const params = new URLSearchParams(search);
  const requestedStatus = params.get("status");
  const status = ["queued", "sent", "failed", "not_sent"].includes(requestedStatus ?? "")
    ? requestedStatus ?? undefined
    : undefined;
  const student = params.get("student")?.trim() || undefined;
  const dateFrom = params.get("dateFrom") || undefined;
  const dateTo = params.get("dateTo") || undefined;
  return { status: status ?? "", student: student ?? "", dateFrom: dateFrom ?? "", dateTo: dateTo ?? "" };
}

export function LiveNotificationLog({ user, workspaceSwitch }: { user: AuthenticatedUser; workspaceSwitch?: ReactNode }) {
  const canRetry = can(user, "notification.retry") && import.meta.env.VITE_REMINDER_DELIVERY_ENABLED === "true";
  const [selectedEntry, setSelectedEntry] = useState<NotificationLogEntry | null>(null);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const tableFilters = useTableFilters(notificationFilterDefaults, filtersFromSearch(searchKey));
  const logs = useQuery({ queryKey: ["notification-log", tableFilters.applied, tableFilters.page, tableFilters.perPage], queryFn: () => listNotificationLogs({ ...activeTableFilters(tableFilters.applied, notificationFilterDefaults), page: tableFilters.page, perPage: tableFilters.perPage }) });
  const retryMutation = useMutation({ mutationFn: retryNotification, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["notification-log"] }); } });
  useEffect(() => {
    const next = filtersFromSearch(searchKey);
    tableFilters.replace(next);
  }, [searchKey]);

  function submit() {
    tableFilters.apply();
    syncSearch(tableFilters.draft);
  }

  function syncSearch(next: Filters) {
    const nextParams = new URLSearchParams(searchParams);
    for (const key of ["status", "student", "dateFrom", "dateTo"] as const) {
      const value = next[key].trim();
      if (value) nextParams.set(key, value);
      else nextParams.delete(key);
    }
    setSearchParams(nextParams);
  }

  function clearFilters() {
    tableFilters.clear();
    syncSearch(notificationFilterDefaults);
  }

  function removeFilter(key: keyof Filters) {
    const next = { ...tableFilters.applied, [key]: "" };
    tableFilters.remove(key);
    syncSearch(next);
  }

  return <>
    <div className="page-header-card mb-5">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Notifications</h1>
      <p className="mt-1 text-sm text-text-secondary">Review persisted email and SMS attempts. A queued status records an application entry and does not confirm delivery.</p>
    </div>
    {workspaceSwitch}
    {can(user, "notification.retry") && !canRetry && <p role="status" className="mb-3 text-sm text-text-secondary">Reminder retry is unavailable until delivery policies are approved.</p>}
    <Card className="p-0">
      <div className="border-b border-border px-5 py-3"><TableFilters embedded scope="Notification log" defaults={notificationFilterDefaults} draft={tableFilters.draft} applied={tableFilters.applied} search={{ key: "student", label: "Student name or number" }} fields={[
      { key: "status", label: "Status", type: "select", options: [{ value: "", label: "All statuses" }, { value: "queued", label: "Queued" }, { value: "sent", label: "Sent" }, { value: "failed", label: "Failed" }, { value: "not_sent", label: "Not sent" }] },
      { key: "dateFrom", label: "From", type: "date" }, { key: "dateTo", label: "To", type: "date" },
    ]} onChange={tableFilters.update} onApply={submit} onClear={clearFilters} onRemove={removeFilter} validate={(draft) => dateRangeError(draft.dateFrom, draft.dateTo)} /></div>
      {logs.isPending && <LoadingState message="Loading notification entries…" layout="table" bare columns={8} />}
      {logs.isError && <ErrorState message={logs.error.message} onRetry={() => void logs.refetch()} />}
      {logs.data && (logs.data.data.length === 0 ? <EmptyState message="No notification entries match these filters." /> : <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
        <thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">{["Created", "Student", "Type", "Channel", "Recipient", "Status", "Attempts", "Details", "Actions"].map((heading) => <th key={heading} scope="col" className="px-3 py-2">{heading}</th>)}</tr></thead>
        <tbody>{logs.data.data.map((entry) => <tr key={entry.id} className="border-b align-top last:border-0">
          <td className="whitespace-nowrap px-3 py-2">{formatTimestamp(entry.createdAt)}</td>
          <td className="px-3 py-2">{entry.studentName ?? entry.studentNo ?? "Unavailable"}</td>
          <td className="px-3 py-2">{entry.type.replace(/_/g, " ")}</td>
          <td className="px-3 py-2">{entry.channel.toUpperCase()}</td>
          <td className="px-3 py-2">{entry.recipient ?? "Unavailable"}</td>
          <td className="px-3 py-2">{entry.status.replace(/_/g, " ")}</td>
          <td className="px-3 py-2">{entry.attempts}</td>
          <td className="max-w-sm whitespace-normal px-3 py-2">{entry.failureReason ?? (entry.sentAt ? `Sent ${formatTimestamp(entry.sentAt)}` : entry.status === "queued" ? "Awaiting provider delivery confirmation" : "—")}</td>
          <td className="px-3 py-2"><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" size="sm" onClick={() => setSelectedEntry(entry)}>View entry</Button>{canRetry && entry.type === "reminder" && entry.status === "failed" && <Button type="button" variant="secondary" size="sm" disabled={retryMutation.isPending} onClick={() => { if (window.confirm("Retry this failed reminder?")) retryMutation.mutate(entry.id); }}>{retryMutation.isPending ? "Retrying…" : "Retry"}</Button>}</div></td>
        </tr>)}</tbody>
      </table>
      {retryMutation.isError && <p className="px-4 py-3 text-sm text-status-error" role="alert">{retryMutation.error.message}</p>}
      <PaginationControls currentPage={logs.data.currentPage} lastPage={logs.data.lastPage} perPage={logs.data.perPage} total={logs.data.total} label="entries" busy={logs.isFetching} onPageChange={tableFilters.setPage} onPerPageChange={tableFilters.changePerPage} /></div>)}
    </Card>
    <NotificationEntryDialog entry={selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)} />
  </>;
}

function NotificationEntryDialog({ entry, onOpenChange }: { entry: NotificationLogEntry | null; onOpenChange: (open: boolean) => void }) {
  return <Dialog.Root open={entry !== null} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-text-primary/40" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-5 shadow-raised"><Dialog.Title className="text-lg font-semibold text-text-primary">Notification entry</Dialog.Title>{entry && <><dl className="mt-4 grid gap-3 text-sm"><Detail label="Student" value={entry.studentName ?? entry.studentNo ?? "Unavailable"} /><Detail label="Type" value={entry.type.replace(/_/g, " ")} /><Detail label="Channel" value={entry.channel.toUpperCase()} /><Detail label="Recipient" value={entry.recipient ?? "Unavailable"} /><Detail label="Status" value={entry.status.replace(/_/g, " ")} /><Detail label="Attempts" value={String(entry.attempts)} /><Detail label="Created" value={formatTimestamp(entry.createdAt)} /><Detail label="Delivery detail" value={entry.failureReason ?? (entry.sentAt ? `Sent ${formatTimestamp(entry.sentAt)}` : entry.status === "queued" ? "Awaiting provider delivery confirmation" : "—")} /></dl><div className="mt-5 flex justify-end"><Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Close</Button></div></>}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-medium text-text-secondary">{label}</dt><dd className="mt-1 break-words text-text-primary">{value}</dd></div>;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));
}
