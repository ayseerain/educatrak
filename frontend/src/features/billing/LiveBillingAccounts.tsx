import { BackButton } from "@/components/ui/BackButton";
import { cn } from "@/lib/cn";
import { Button, buttonVariants } from "@/components/ui/Button";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { useState, type FormEvent } from "react";
import { createBillingAdjustment, getBillingAccount, listBillingAccounts, type BillingAccountDetail } from "@/api/cashierApi";
import { Card, CARD_SURFACE } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { TableFilters, moneyRangeError, useTableFilters } from "@/components/ui/TableFilters";
import { useClientPagination } from "@/components/ui/useClientPagination";
import { centavos, format } from "@/lib/money";
import { can } from "@/lib/permissions";
import { formatStatusLabel } from "@/lib/status";
import type { AuthenticatedUser } from "@/lib/types";

const billingFilterDefaults = { query: "", schoolYear: "current", grade: "", status: "", minimumBalance: "", maximumBalance: "" };

export function LiveBillingAccounts() {
  const filters = useTableFilters(billingFilterDefaults);
  const { query, schoolYear, grade, status, minimumBalance, maximumBalance } = filters.applied;
  const minimumBalanceCents = minimumBalance.trim() ? Math.round(Number(minimumBalance) * 100) : undefined;
  const maximumBalanceCents = maximumBalance.trim() ? Math.round(Number(maximumBalance) * 100) : undefined;
  const schoolYearId = schoolYear !== "current" && schoolYear !== "all" ? schoolYear : undefined;
  const accounts = useQuery({ queryKey: ["billing-accounts", filters.applied, filters.page, filters.perPage], queryFn: () => listBillingAccounts({ query, schoolYearId, schoolYearScope: schoolYearId ? undefined : schoolYear as "current" | "all", grade, status, minimumBalanceCents, maximumBalanceCents, page: filters.page, perPage: filters.perPage }) });
  const schoolYearOptions = [{ value: "current", label: "Current school year" }, { value: "all", label: "All school years" }, ...(accounts.data?.schoolYears ?? []).filter((year) => year.id !== accounts.data?.currentSchoolYearId).map((year) => ({ value: year.id, label: year.label }))];

  return <>
    <div className="page-header-card mb-5"><h1 className="text-2xl font-bold tracking-tight text-text-primary">Accounts</h1><p className="mt-1 text-sm text-text-secondary">Search and review student billing accounts.</p></div>
    <Card className="account-list p-0">
      <div className="border-b border-border px-5 py-3"><TableFilters embedded scope="Billing accounts" defaults={billingFilterDefaults} draft={filters.draft} applied={filters.applied} search={{ key: "query", label: "Search billing accounts", placeholder: "Name or LRN" }} fields={[
      { key: "schoolYear", label: "School year", type: "select", options: schoolYearOptions },
      { key: "grade", label: "Filter by grade", placeholder: "Grade" },
      { key: "status", label: "Filter by billing status", type: "select", options: [{ value: "", label: "All statuses" }, { value: "current", label: "Current" }, { value: "due_soon", label: "Due soon" }, { value: "overdue", label: "Overdue" }, { value: "paid", label: "Paid" }] },
      { key: "minimumBalance", label: "Minimum balance", type: "number", min: "0", step: "0.01" },
      { key: "maximumBalance", label: "Maximum balance", type: "number", min: "0", step: "0.01" },
    ]} onChange={filters.update} onSearch={filters.search} onApply={filters.apply} onClear={filters.clear} onRemove={filters.remove} validate={(draft) => moneyRangeError(draft.minimumBalance, draft.maximumBalance)} /></div>
      {accounts.isPending && <LoadingState message="Loading billing accounts…" layout="table" bare columns={6} />}
      {accounts.isError && <ErrorState message={accounts.error.message} onRetry={() => void accounts.refetch()} />}
      {accounts.data && (accounts.data.data.length === 0 ? <EmptyState message="No billing accounts match these filters." /> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left text-sm"><thead><tr className="border-b border-border text-xs font-semibold text-text-secondary"><th scope="col" className="px-3 py-2">Student</th><th scope="col" className="px-3 py-2">School year</th><th scope="col" className="px-3 py-2 text-right">Total due</th><th scope="col" className="px-3 py-2 text-right">Paid</th><th scope="col" className="px-3 py-2 text-right">Balance</th><th scope="col" className="px-3 py-2">Status</th></tr></thead><tbody>{accounts.data.data.map((account) => <tr key={account.id} className="border-b last:border-0"><td className="px-3 py-2"><Link className="font-medium text-brand-green-dark transition-colors hover:text-brand-green" to={`/accounts/${account.id}`}>{account.studentName}</Link><p className="font-mono text-xs text-text-secondary">{account.lrn} · {[account.gradeLevel, account.section].filter(Boolean).join(" · ")}</p></td><td className="px-3 py-2">{account.schoolYear}</td><td className="px-3 py-2 text-right font-mono">{format(centavos(account.totalDueCents))}</td><td className="px-3 py-2 text-right font-mono">{format(centavos(account.totalPaidCents))}</td><td className="px-3 py-2 text-right font-mono">{format(centavos(account.balanceCents))}</td><td className="px-3 py-2">{formatStatusLabel(account.status)}</td></tr>)}</tbody></table><PaginationControls currentPage={accounts.data.currentPage} lastPage={accounts.data.lastPage} perPage={accounts.data.perPage} total={accounts.data.total} label="accounts" busy={accounts.isFetching} onPageChange={filters.setPage} onPerPageChange={filters.changePerPage} /></div>)}
    </Card>
  </>;
}

export function LiveBillingAccountDetail({ user }: { user: AuthenticatedUser }) {
  const { id = "" } = useParams();
  const accountQuery = useQuery({ queryKey: ["billing-account", id], queryFn: () => getBillingAccount(id), enabled: Boolean(id) });
  if (accountQuery.isPending) return <LoadingState message="Loading billing account…" layout="detail" />;
  if (accountQuery.isError) return <ErrorState message={accountQuery.error.message} onRetry={() => void accountQuery.refetch()} />;
  const account = accountQuery.data;
  return <>
    <BackButton to="/accounts" label="Back to billing accounts" className="mb-2" /><div className={cn(CARD_SURFACE, "mb-5 flex flex-wrap items-start justify-between gap-4 p-5")}><div><h1 className="text-2xl font-bold tracking-tight">{account.studentName}</h1><p className="mt-1 text-sm text-text-secondary">{account.lrn} · {account.schoolYear} · {[account.gradeLevel, account.section].filter(Boolean).join(" · ")}</p></div><div className="flex flex-wrap gap-2">{can(user, "account.adjust") && <AdjustmentDialog account={account} />}{can(user, "payment.record") && <Link className={buttonVariants({ variant: "primary" })} to={`/payments/new?student=${account.studentId}`}>Record payment</Link>}</div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total due" cents={account.totalDueCents} /><Metric label="Paid" cents={account.totalPaidCents} /><Metric label="Balance" cents={account.balanceCents} /><Card><p className="text-sm font-semibold text-text-secondary">Status</p><p className="mt-2 font-semibold">{formatStatusLabel(account.status)}</p></Card></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2"><DataTable title="Fee items" headers={["Item", "Category", "Required", "Amount"]} rows={account.items.map((item) => [item.name, item.category, item.required === null ? "Unavailable" : item.required ? "Yes" : "Optional", format(centavos(item.amountCents))])} /><DataTable title="Installment schedule" headers={["Installment", "Due date", "Amount", "Paid", "Status"]} rows={account.installments.map((item) => [item.label, item.dueDate, format(centavos(item.amountCents)), format(centavos(item.paidCents)), formatStatusLabel(item.status)])} /><DataTable title="Payments" headers={["Receipt", "Date", "Amount", "Status", "Recorded by"]} rows={account.payments.map((payment) => [payment.receiptNo ?? `Payment ${payment.id}`, payment.paidOn, format(centavos(payment.amountCents)), formatStatusLabel(payment.status), payment.recordedBy ?? "Unavailable"])} /><DataTable title="Adjustments" headers={["Type", "Effective", "Amount", "Reason", "Added by"]} rows={account.adjustments.map((adjustment) => [adjustment.type, adjustment.effectiveAt ? new Date(adjustment.effectiveAt).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" }) : "Unavailable", format(centavos(adjustment.amountCents)), adjustment.reason, adjustment.createdBy ?? "Unavailable"])} /></div>
    <div className="mt-5"><DataTable title="Account activity" headers={["When", "Activity", "Recorded by", "Details"]} rows={account.activity.map((event) => [formatTimestamp(event.occurredAt), activityLabel(event.action), event.actor ?? "Unavailable", activityDetails(event.details)])} /></div>
  </>;
}

function AdjustmentDialog({ account }: { account: BillingAccountDetail }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false); const [type, setType] = useState<"discount" | "scholarship" | "correction">("discount"); const [amount, setAmount] = useState(""); const [reason, setReason] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const normalized = amount.trim(); if (!/^-?\d+(\.\d{1,2})?$/.test(normalized) || Number(normalized) === 0) return setError("Enter a non-zero amount with up to two decimal places."); if (type !== "correction" && Number(normalized) < 0) return setError("Enter a positive amount for a discount or scholarship."); if (reason.trim().length < 10) return setError("Enter a reason with at least 10 characters."); setSaving(true); setError(""); try { await createBillingAdjustment(account.id, { type, amountCents: Math.round(Number(normalized) * 100) * (type === "correction" ? 1 : -1), reason: reason.trim() }); await queryClient.invalidateQueries({ queryKey: ["billing-account", account.id] }); await queryClient.invalidateQueries({ queryKey: ["billing-accounts"] }); setOpen(false); setAmount(""); setReason(""); setType("discount"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save this adjustment."); } finally { setSaving(false); } }
  return <Dialog.Root open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setError(""); }}><Dialog.Trigger asChild><Button variant="secondary">Manage adjustments</Button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-text-primary/40" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-6 shadow-raised"><Dialog.Title className="text-lg font-semibold text-text-primary">Manage adjustments</Dialog.Title><Dialog.Description className="mt-1 text-sm text-text-secondary">Add an auditable adjustment without changing fees, payments, receipts, or prior entries.</Dialog.Description><form className="mt-5 space-y-4" onSubmit={submit}><label className="block text-sm font-medium text-text-primary">Adjustment type<DropdownSelect aria-label="Adjustment type" value={type} options={[{ value: "discount", label: "Discount" }, { value: "scholarship", label: "Scholarship" }, { value: "correction", label: "Financial correction" }]} onChange={setType} className="mt-1 w-full" align="start" /></label><label className="block text-sm font-medium text-text-primary">Amount<input aria-label="Adjustment amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="form-control mt-1" placeholder={type === "correction" ? "Use - to reduce, + to add" : "0.00"} /></label><p className="-mt-2 text-xs text-text-secondary">{type === "correction" ? "A negative correction reduces the balance; a positive correction adds to it." : "This amount reduces the account balance."}</p><label className="block text-sm font-medium text-text-primary">Reason<textarea aria-label="Adjustment reason" value={reason} onChange={(event) => setReason(event.target.value)} className="form-control mt-1 min-h-24 py-2" maxLength={1000} /></label>{error && <p role="alert" className="text-sm text-status-error">{error}</p>}<div className="flex justify-end gap-2 border-t border-border pt-4"><Dialog.Close asChild><Button variant="neutral" disabled={saving}>Cancel</Button></Dialog.Close><Button type="submit" disabled={saving}>{saving ? "Saving adjustment..." : "Save adjustment"}</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function Metric({ label, cents }: { label: string; cents: number }) {
  return <Card><p className="text-sm font-medium text-text-secondary">{label}</p><p className="mt-2 text-xl font-semibold tabular-nums text-text-primary">{format(centavos(cents))}</p></Card>;
}

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  const pagination = useClientPagination(rows, title.toLowerCase());
  return <Card><h2 className="text-base font-semibold text-text-primary">{title}</h2>{rows.length === 0 ? <p className="mt-3 text-sm text-text-secondary">No {title.toLowerCase()} recorded.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-left text-sm"><thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">{headers.map((header) => <th key={header} scope="col" className="px-2 py-2">{header}</th>)}</tr></thead><tbody>{pagination.items.map((row, index) => <tr key={`${title}-${index}`} className="border-b last:border-0">{row.map((cell, cellIndex) => <td key={`${title}-${index}-${cellIndex}`} className="px-2 py-2">{cell}</td>)}</tr>)}</tbody></table>{pagination.controls}</div>}</Card>;
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
