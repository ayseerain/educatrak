import { useQuery } from "@tanstack/react-query";
import { listAuditEntries } from "@/api/auditApi";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { TableFilters, activeTableFilters, dateRangeError, useTableFilters } from "@/components/ui/TableFilters";

const auditFilterDefaults = { user: "", action: "", entityType: "", entityId: "", dateFrom: "", dateTo: "" };

export function LiveAuditLog() {
  const tableFilters = useTableFilters(auditFilterDefaults);
  const entries = useQuery({
    queryKey: ["audit-log", tableFilters.applied, tableFilters.page, tableFilters.perPage],
    queryFn: () => listAuditEntries({ ...activeTableFilters(tableFilters.applied, auditFilterDefaults), page: tableFilters.page, perPage: tableFilters.perPage }),
  });

  return <>
    <div className="page-header-card mb-5">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Audit</h1>
      <p className="mt-1 text-sm text-text-secondary">Review recorded changes by user, action, date, or entity. Entries cannot be changed or deleted.</p>
    </div>
    <Card className="p-0">
      <div className="border-b border-border px-5 py-3"><TableFilters embedded scope="Audit log" defaults={auditFilterDefaults} draft={tableFilters.draft} applied={tableFilters.applied} search={{ key: "user", label: "User" }} fields={[
      { key: "action", label: "Action" }, { key: "entityType", label: "Entity type" }, { key: "entityId", label: "Entity ID" },
      { key: "dateFrom", label: "From", type: "date" }, { key: "dateTo", label: "To", type: "date" },
    ]} onChange={tableFilters.update} onSearch={tableFilters.search} onApply={tableFilters.apply} onClear={tableFilters.clear} onRemove={tableFilters.remove} validate={(draft) => dateRangeError(draft.dateFrom, draft.dateTo)} /></div>
      {entries.isPending && <LoadingState message="Loading audit entries…" layout="table" bare columns={6} />}
      {entries.isError && <ErrorState message={entries.error.message} onRetry={() => void entries.refetch()} />}
      {entries.data && (entries.data.data.length === 0 ? <EmptyState message="No audit entries match these filters." /> : <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">{["When", "User", "Action", "Entity", "Before", "After"].map((heading) => <th key={heading} scope="col" className="px-3 py-2">{heading}</th>)}</tr></thead>
        <tbody>{entries.data.data.map((entry) => <tr key={entry.id} className="border-b align-top last:border-0">
          <td className="whitespace-nowrap px-3 py-2">{formatTimestamp(entry.occurredAt)}</td>
          <td className="px-3 py-2">{entry.actor ?? "Unavailable"}</td>
          <td className="px-3 py-2">{entry.action}</td>
          <td className="px-3 py-2">{entry.entityType} {entry.entityId}</td>
          <td className="max-w-sm whitespace-normal px-3 py-2">{formatDetails(entry.before)}</td>
          <td className="max-w-sm whitespace-normal px-3 py-2">{formatDetails(entry.after)}</td>
        </tr>)}</tbody>
      </table>
      <PaginationControls currentPage={entries.data.currentPage} lastPage={entries.data.lastPage} perPage={entries.data.perPage} total={entries.data.total} label="entries" busy={entries.isFetching} onPageChange={tableFilters.setPage} onPerPageChange={tableFilters.changePerPage} /></div>)}
    </Card>
  </>;
}

function formatDetails(details: Record<string, unknown> | null): string {
  return details && Object.keys(details).length > 0 ? JSON.stringify(details) : "—";
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));
}
