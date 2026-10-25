import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getBillingAccount, listBillingAccounts } from "@/api/cashierApi";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { TableFilters, moneyRangeError, useTableFilters } from "@/components/ui/TableFilters";
import { useClientPagination } from "@/components/ui/useClientPagination";
import { centavos, format } from "@/lib/money";
import { can } from "@/lib/permissions";
import type { AuthenticatedUser } from "@/lib/types";

const billingFilterDefaults = { query: "", schoolYear: "", grade: "", status: "", minimumBalance: "", maximumBalance: "" };

export function LiveBillingAccounts() {
  const filters = useTableFilters(billingFilterDefaults);
  const { query, schoolYear, grade, status, minimumBalance, maximumBalance } = filters.applied;
  const minimumBalanceCents = minimumBalance.trim() ? Math.round(Number(minimumBalance) * 100) : undefined;
  const maximumBalanceCents = maximumBalance.trim() ? Math.round(Number(maximumBalance) * 100) : undefined;
  const accounts = useQuery({ queryKey: ["billing-accounts", filters.applied, filters.page, filters.perPage], queryFn: () => listBillingAccounts({ query, schoolYear, grade, status, minimumBalanceCents, maximumBalanceCents, page: filters.page, perPage: filters.perPage }) });

  return <>
    <div className="mb-5"><h1 className="text-2xl font-semibold">Billing accounts</h1><p className="mt-1 text-sm text-text-secondary">Search and review student billing accounts.</p></div>
    <TableFilters scope="Billing accounts" defaults={billingFilterDefaults} draft={filters.draft} applied={filters.applied} search={{ key: "query", label: "Search billing accounts", placeholder: "Name or student number" }} fields={[
      { key: "schoolYear", label: "Filter by school year", placeholder: "School year" },
      { key: "grade", label: "Filter by grade", placeholder: "Grade" },
      { key: "status", label: "Filter by billing status", type: "select", options: [{ value: "", label: "All statuses" }, { value: "current", label: "Current" }, { value: "due_soon", label: "Due soon" }, { value: "overdue", label: "Overdue" }, { value: "paid", label: "Paid" }] },
      { key: "minimumBalance", label: "Minimum balance", type: "number", min: "0", step: "0.01" },
      { key: "maximumBalance", label: "Maximum balance", type: "number", min: "0", step: "0.01" },
    ]} onChange={filters.update} onSearch={filters.search} onApply={filters.apply} onReset={filters.reset} onClear={filters.clear} onRemove={filters.remove} validate={(draft) => moneyRangeError(draft.minimumBalance, draft.maximumBalance)} />
    {accounts.isPending && <LoadingState message="Loading billing accounts…" />}
    {accounts.isError && <ErrorState message={accounts.error.message} onRetry={() => void accounts.refetch()} />}
    {accounts.data && (accounts.data.data.length === 0 ? <Card><EmptyState message="No billing accounts match these filters." /></Card> : <Card className="overflow-x-auto p-0"><table className="w-full min-w-[850px] border-collapse text-left text-sm"><thead><tr className="border-b bg-surface text-xs uppercase text-text-secondary"><th scope="col" className="px-4 py-3">Student</th><th scope="col" className="px-4 py-3">School year</th><th scope="col" className="px-4 py-3 text-right">Total due</th><th scope="col" className="px-4 py-3 text-right">Paid</th><th scope="col" className="px-4 py-3 text-right">Balance</th><th scope="col" className="px-4 py-3">Status</th></tr></thead><tbody>{accounts.data.data.map((account) => <tr key={account.id} className="border-b last:border-0"><td className="px-4 py-3"><Link className="font-medium text-brand-green-dark underline-offset-2 hover:underline" to={`/accounts/${account.id}`}>{account.studentName}</Link><p className="font-mono text-xs text-text-secondary">{account.studentNo} · {[account.gradeLevel, account.section].filter(Boolean).join(" · ")}</p></td><td className="px-4 py-3">{account.schoolYear}</td><td className="px-4 py-3 text-right font-mono">{format(centavos(account.totalDueCents))}</td><td className="px-4 py-3 text-right font-mono">{format(centavos(account.totalPaidCents))}</td><td className="px-4 py-3 text-right font-mono font-semibold">{format(centavos(account.balanceCents))}</td><td className="px-4 py-3 capitalize">{account.status.replace(/_/g, " ")}</td></tr>)}</tbody></table><PaginationControls currentPage={accounts.data.currentPage} lastPage={accounts.data.lastPage} perPage={accounts.data.perPage} total={accounts.data.total} label="accounts" busy={accounts.isFetching} onPageChange={filters.setPage} onPerPageChange={filters.changePerPage} /></Card>)}
  </>;
}

export function LiveBillingAccountDetail({ user }: { user: AuthenticatedUser }) {
  const { id = "" } = useParams();
  const accountQuery = useQuery({ queryKey: ["billing-account", id], queryFn: () => getBillingAccount(id), enabled: Boolean(id) });
  if (accountQuery.isPending) return <LoadingState message="Loading billing account…" />;
  if (accountQuery.isError) return <ErrorState message={accountQuery.error.message} onRetry={() => void accountQuery.refetch()} />;
  const account = accountQuery.data;
  return <>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><Link to="/accounts" className="text-sm text-brand-green-dark underline">Back to billing accounts</Link><h1 className="mt-2 text-2xl font-semibold">{account.studentName}</h1><p className="mt-1 text-sm text-text-secondary">{account.studentNo} · {account.schoolYear} · {[account.gradeLevel, account.section].filter(Boolean).join(" · ")}</p></div>{can(user, "payment.record") && <Link className="inline-flex min-h-control items-center justify-center rounded-md bg-brand-green-dark px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark" to={`/payments/new?student=${account.studentId}`}>Record payment</Link>}</div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total due" cents={account.totalDueCents} /><Metric label="Paid" cents={account.totalPaidCents} /><Metric label="Balance" cents={account.balanceCents} /><Card><p className="text-xs font-medium uppercase text-text-secondary">Status</p><p className="mt-2 font-semibold capitalize">{account.status.replace(/_/g, " ")}</p></Card></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2"><DataTable title="Fee items" headers={["Item", "Category", "Required", "Amount"]} rows={account.items.map((item) => [item.name, item.category, item.required === null ? "Unavailable" : item.required ? "Yes" : "Optional", format(centavos(item.amountCents))])} /><DataTable title="Installment schedule" headers={["Installment", "Due date", "Amount", "Paid", "Status"]} rows={account.installments.map((item) => [item.label, item.dueDate, format(centavos(item.amountCents)), format(centavos(item.paidCents)), item.status])} /><DataTable title="Payments" headers={["Receipt", "Date", "Amount", "Status", "Recorded by"]} rows={account.payments.map((payment) => [payment.receiptNo ?? `Payment ${payment.id}`, payment.paidOn, format(centavos(payment.amountCents)), payment.status, payment.recordedBy ?? "Unavailable"])} /><DataTable title="Adjustments" headers={["Type", "Effective", "Amount", "Reason", "Added by"]} rows={account.adjustments.map((adjustment) => [adjustment.type, adjustment.effectiveAt ? new Date(adjustment.effectiveAt).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" }) : "Unavailable", format(centavos(adjustment.amountCents)), adjustment.reason, adjustment.createdBy ?? "Unavailable"])} /></div>
    <div className="mt-5"><DataTable title="Account activity" headers={["When", "Activity", "Recorded by", "Details"]} rows={account.activity.map((event) => [formatTimestamp(event.occurredAt), activityLabel(event.action), event.actor ?? "Unavailable", activityDetails(event.details)])} /></div>
  </>;
}

function Metric({ label, cents }: { label: string; cents: number }) {
  return <Card><p className="text-xs font-medium uppercase text-text-secondary">{label}</p><p className="mt-2 font-semibold">{format(centavos(cents))}</p></Card>;
}

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  const pagination = useClientPagination(rows, title.toLowerCase());
  return <Card><h2 className="font-semibold">{title}</h2>{rows.length === 0 ? <p className="mt-3 text-sm text-text-secondary">No {title.toLowerCase()} recorded.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-left text-sm"><thead><tr className="border-b text-xs uppercase text-text-secondary">{headers.map((header) => <th key={header} scope="col" className="px-2 py-2">{header}</th>)}</tr></thead><tbody>{pagination.items.map((row, index) => <tr key={`${title}-${index}`} className="border-b last:border-0">{row.map((cell, cellIndex) => <td key={`${title}-${index}-${cellIndex}`} className="px-2 py-2">{cell}</td>)}</tr>)}</tbody></table>{pagination.controls}</div>}</Card>;
}

function activityLabel(action: string): string {
  const labels: Record<string, string> = {
    "account.created": "Account opened",
    "payment.recorded": "Payment recorded",
    "payment.void_requested": "Payment void requested",
    "payment.void_approved": "Payment void approved",
    "payment.void_rejected": "Payment void rejected",
    "receipt.printed": "Receipt printed",
    "receipt.reprinted": "Receipt reprinted",
    "adjustment.created": "Adjustment added",
  };
  return labels[action] ?? action.replace(/[._]/g, " ");
}

function activityDetails(details: { amountCents?: number; receiptNo?: string | null; status?: string; reason?: string; decision?: string; decisionNote?: string; reprintCount?: number; adjustmentType?: string }): string {
  const values: string[] = [];
  if (details.amountCents !== undefined) values.push(format(centavos(details.amountCents)));
  if (details.receiptNo) values.push(`Receipt ${details.receiptNo}`);
  if (details.status) values.push(`Status ${details.status.replace(/_/g, " ")}`);
  if (details.adjustmentType) values.push(details.adjustmentType.replace(/_/g, " "));
  if (details.reason) values.push(details.reason);
  if (details.decision) values.push(`Decision ${details.decision}`);
  if (details.decisionNote) values.push(details.decisionNote);
  if (details.reprintCount !== undefined) values.push(`Reprints ${details.reprintCount}`);
  return values.length > 0 ? values.join(" · ") : "—";
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));
}
