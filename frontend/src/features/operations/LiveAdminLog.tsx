import { useQuery } from "@tanstack/react-query";
import { listSecurityEvents } from "@/api/cashierApi";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { TableFilters, dateRangeError, useTableFilters } from "@/components/ui/TableFilters";

const securityFilterDefaults = { user: "", action: "", dateFrom: "", dateTo: "" };

const labels: Record<string, string> = {
  "auth.login": "Sign-in",
  "auth.login_failed": "Sign-in denied",
  "auth.logout": "Sign-out",
  "auth.change_password": "Password changed",
  "user.created": "Account created",
  "user.updated": "Account updated",
  "user.password_reset": "Password reset",
};

export function LiveAdminLog() {
  const tableFilters = useTableFilters(securityFilterDefaults);
  const eventsQuery = useQuery({
    queryKey: ["admin-security-events", tableFilters.applied, tableFilters.page, tableFilters.perPage],
    queryFn: () => listSecurityEvents({ ...tableFilters.applied, page: tableFilters.page, perPage: tableFilters.perPage }),
  });

  return <>
    <div className="mb-5"><h1 className="text-2xl font-semibold">Security</h1><p className="mt-1 text-sm text-text-secondary">Review authentication and account-administration events. Entries cannot be changed or deleted.</p></div>
    <TableFilters scope="Security events" defaults={securityFilterDefaults} draft={tableFilters.draft} applied={tableFilters.applied} search={{ key: "user", label: "User" }} fields={[
      { key: "action", label: "Action" }, { key: "dateFrom", label: "From", type: "date" }, { key: "dateTo", label: "To", type: "date" },
    ]} onChange={tableFilters.update} onSearch={tableFilters.search} onApply={tableFilters.apply} onReset={tableFilters.reset} onClear={tableFilters.clear} onRemove={tableFilters.remove} validate={(draft) => dateRangeError(draft.dateFrom, draft.dateTo)} />
    {eventsQuery.isPending && <LoadingState message="Loading security events…" />}
    {eventsQuery.isError && <ErrorState message={eventsQuery.error.message} onRetry={() => void eventsQuery.refetch()} />}
    {eventsQuery.data && (eventsQuery.data.data.length === 0 ? <Card><EmptyState message="No security events are recorded." /></Card> : <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
        <thead><tr className="border-b bg-surface text-xs uppercase text-text-secondary">{["When", "Actor", "Account / target", "Event", "Status", "Details"].map((heading) => <th key={heading} scope="col" className="px-4 py-3">{heading}</th>)}</tr></thead>
        <tbody>{eventsQuery.data.data.map((event) => {
          const details = safeDetails(event.details);
          const account = [event.accountName, event.account].filter((item): item is string => Boolean(item)).join(" · ");
          return <tr key={event.id} className="border-b align-top last:border-0">
            <td className="whitespace-nowrap px-4 py-3">{formatTimestamp(event.occurredAt)}</td>
            <td className="px-4 py-3">{event.actorName ?? "Unauthenticated / unavailable"}</td>
            <td className="px-4 py-3">{account || (event.entityType && event.entityId ? `${event.entityType} ${event.entityId}` : "Unavailable")}</td>
            <td className="px-4 py-3">{labels[event.action] ?? event.action}</td>
            <td className="px-4 py-3">{event.action === "auth.login_failed" ? "Denied" : "Recorded"}</td>
            <td className="max-w-md whitespace-normal px-4 py-3">{details.summary ?? details.changes ?? "Event recorded"}</td>
          </tr>;
        })}</tbody>
      </table>
      <PaginationControls currentPage={eventsQuery.data.currentPage} lastPage={eventsQuery.data.lastPage} perPage={eventsQuery.data.perPage} total={eventsQuery.data.total} label="events" busy={eventsQuery.isFetching} onPageChange={tableFilters.setPage} onPerPageChange={tableFilters.changePerPage} /></Card>)}
  </>;
}

function safeDetails(value: Record<string, unknown> | null): { summary?: string; changes?: string } {
  if (!value) return {};
  const safeKeys = ["role", "active", "status"];
  const changes = safeKeys.filter((key) => value[key] !== undefined).map((key) => `${key}: ${String(value[key])}`).join(" · ");
  const summary = typeof value.summary === "string"
    ? value.summary
    : typeof value.message === "string"
      ? value.message
      : typeof value.outcome === "string"
        ? value.outcome
        : undefined;
  return { summary, changes: changes || undefined };
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));
}
