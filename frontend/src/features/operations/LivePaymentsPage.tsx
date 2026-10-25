import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { TableFilters, dateRangeError, moneyRangeError, useTableFilters } from "@/components/ui/TableFilters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getPayment, listPayments, listVoidRequests, reprintPayment, requestPaymentVoid } from "@/api/cashierApi";
import type { AuthenticatedUser } from "@/lib/types";
import { can } from "@/lib/permissions";
import { centavos, format } from "@/lib/money";
import { downloadCsv } from "@/lib/csv";
import { ReceiptPrintAction } from "@/components/printing/ReceiptPrintAction";
import { ReceiptDocument } from "@/components/printing/ReceiptDocument";
import { PrintSurface } from "@/components/printing/PrintSurface";
import { printDocumentWhenReady } from "@/lib/printing";

const statusFilters = [
  { value: "", label: "All statuses" },
  { value: "valid", label: "Valid" },
  { value: "void_pending", label: "Void pending" },
  { value: "voided", label: "Voided" },
];
const paymentFilterDefaults = { query: "", status: "", dateFrom: "", dateTo: "", cashier: "", method: "", amountMinimum: "", amountMaximum: "" };

export function LivePaymentsPage({ user, detail = false }: { user: AuthenticatedUser; detail?: boolean }) {
  if (detail) return <LivePaymentDetailPage user={user} />;
  return <LivePaymentListPage user={user} />;
}

export function LivePaymentReceiptPage({ user }: { user: AuthenticatedUser }) {
  const { id = "" } = useParams();
  const location = useLocation();
  const autoPrintStarted = useRef(false);
  const queryClient = useQueryClient();
  const paymentQuery = useQuery({ queryKey: ["payment", id], queryFn: () => getPayment(id), enabled: Boolean(id) });
  const printMutation = useMutation({
    mutationFn: reprintPayment,
    onSuccess: async (payment) => {
      queryClient.setQueryData(["payment", id], payment);
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await printDocumentWhenReady();
    },
  });

  useEffect(() => {
    if (paymentQuery.data && location.state?.printNow === true && !autoPrintStarted.current && !printMutation.isPending) {
      autoPrintStarted.current = true;
      printMutation.mutate(paymentQuery.data.id);
    }
  }, [location.state, paymentQuery.data, printMutation.isPending]);

  if (paymentQuery.isPending) return <LoadingState message="Loading receipt…" />;
  if (paymentQuery.isError) return <ErrorState message={paymentQuery.error.message} onRetry={() => void paymentQuery.refetch()} />;
  const payment = paymentQuery.data;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div><h1 className="text-2xl font-semibold">Acknowledgment Receipt</h1><p className="mt-1 text-sm text-text-secondary">EducaTrak · Mendez Christian Academy</p></div>
        <div className="flex gap-2">{can(user, "payment.record") ? <Link className={secondaryLinkClass} to="/payments/new">Done</Link> : <Link className={secondaryLinkClass} to={`/payments/${payment.id}`}>Back to payment</Link>}{can(user, "receipt.reprint") && <Button disabled={printMutation.isPending} onClick={() => printMutation.mutate(payment.id)}>{printMutation.isPending ? "Preparing receipt…" : payment.firstPrintedAt ? "Reprint Receipt" : "Print Receipt"}</Button>}</div>
      </div>
      {printMutation.isError && <p role="alert" className="mb-3 rounded-md border border-status-error p-3 text-sm text-status-error">{printMutation.error.message}</p>}
      <div className="overflow-x-auto rounded-md border border-border bg-white p-4"><ReceiptDocument payment={payment} /></div>
      <PrintSurface className="receipt-print-root"><ReceiptDocument payment={payment} /></PrintSurface>
    </div>
  );
}

function LivePaymentListPage({ user }: { user: AuthenticatedUser }) {
  const tableFilters = useTableFilters(paymentFilterDefaults);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const { query, status, dateFrom, dateTo, cashier, method, amountMinimum, amountMaximum } = tableFilters.applied;
  const minimumAmountCents = amountMinimum.trim() ? Math.round(Number(amountMinimum) * 100) : undefined;
  const maximumAmountCents = amountMaximum.trim() ? Math.round(Number(amountMaximum) * 100) : undefined;
  const filters = { query, status, dateFrom, dateTo, cashier: user.role === "cashier" ? "" : cashier, method,
    ...(minimumAmountCents !== undefined ? { amountMinCents: minimumAmountCents } : {}),
    ...(maximumAmountCents !== undefined ? { amountMaxCents: maximumAmountCents } : {}),
  };
  const paymentsQuery = useQuery({
    queryKey: ["payments", { ...filters, page: tableFilters.page, perPage: tableFilters.perPage }],
    queryFn: () => listPayments({ ...filters, page: tableFilters.page, perPage: tableFilters.perPage }),
  });
  const ownVoidRequestsQuery = useQuery({
    queryKey: ["void-requests", user.id],
    queryFn: listVoidRequests,
    enabled: can(user, "payment.void.request"),
  });

  async function exportPayments() {
    setExportError("");
    setIsExporting(true);
    try {
      const firstPage = await listPayments({ ...filters, page: 1, perPage: tableFilters.perPage });
      const payments = [...firstPage.data];
      for (let currentPage = 2; currentPage <= firstPage.lastPage; currentPage += 1) {
        payments.push(...(await listPayments({ ...filters, page: currentPage, perPage: tableFilters.perPage })).data);
      }
      downloadCsv("payment-history.csv", ["Receipt", "Student", "Student no.", "Amount (PHP)", "Method", "Date of payment", "Recorded by", "Status"], payments.map((payment) => [
        payment.receiptNo ?? `Payment ${payment.id}`,
        payment.studentName ?? "Unavailable",
        payment.studentNo ?? "Unavailable",
        (payment.amountCents / 100).toFixed(2),
        payment.method,
        payment.paidOn,
        payment.recordedBy ?? "Unavailable",
        payment.status.replace(/_/g, " "),
      ]));
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Payment history could not be exported.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold">{user.role === "accounting" ? "Payment review" : "Payments"}</h1><p className="mt-1 text-sm text-text-secondary">{user.role === "cashier" ? "Your recorded payments are shown by default." : "Search and filter recorded payments."}</p></div><div className="flex gap-2"><Button type="button" variant="secondary" disabled={!paymentsQuery.data || isExporting} onClick={() => void exportPayments()}>{isExporting ? "Preparing export…" : "Export for Excel (.csv)"}</Button>{can(user, "payment.record") && <Link className={primaryLinkClass} to="/payments/new">Record payment</Link>}</div></div>
      {exportError && <p className="mb-4 text-sm text-status-error" role="alert">{exportError}</p>}
      <TableFilters scope="Payments" defaults={paymentFilterDefaults} draft={tableFilters.draft} applied={tableFilters.applied} search={{ key: "query", label: "Search receipt or student", placeholder: "Receipt number, name, or student number" }} fields={[
        { key: "status", label: "Status", type: "select", options: statusFilters },
        { key: "dateFrom", label: "Date of payment from", type: "date" },
        { key: "dateTo", label: "Date of payment through", type: "date" },
        ...(user.role === "cashier" ? [] : [{ key: "cashier" as const, label: "Cashier", placeholder: "Filter by cashier name" }]),
        { key: "method", label: "Payment method", placeholder: "Filter by recorded method" },
        { key: "amountMinimum", label: "Minimum amount (PHP)", type: "number", min: "0", step: "0.01" },
        { key: "amountMaximum", label: "Maximum amount (PHP)", type: "number", min: "0", step: "0.01" },
      ]} onChange={tableFilters.update} onSearch={tableFilters.search} onApply={tableFilters.apply} onReset={tableFilters.reset} onClear={tableFilters.clear} onRemove={tableFilters.remove} validate={(draft) => dateRangeError(draft.dateFrom, draft.dateTo) || moneyRangeError(draft.amountMinimum, draft.amountMaximum)} />
      {paymentsQuery.isPending ? <LoadingState message="Loading payment history…" /> : null}
      {paymentsQuery.isError ? <ErrorState message={paymentsQuery.error.message} onRetry={() => void paymentsQuery.refetch()} /> : null}
      {paymentsQuery.data && (paymentsQuery.data.data.length === 0 ? <Card><EmptyState message="No payments match the selected filters." /></Card> : <Card className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full min-w-[840px] border-collapse text-left text-sm"><thead><tr className="border-b bg-surface text-xs uppercase text-text-secondary"><th scope="col" className="px-4 py-3">Receipt</th><th scope="col" className="px-4 py-3">Student</th><th scope="col" className="px-4 py-3 text-right">Amount</th><th scope="col" className="px-4 py-3">Method</th><th scope="col" className="px-4 py-3">Date</th><th scope="col" className="px-4 py-3">Recorded by</th><th scope="col" className="px-4 py-3">Status</th></tr></thead><tbody>{paymentsQuery.data.data.map((payment) => <tr key={payment.id} className="border-b last:border-0"><td className="px-4 py-3"><Link className="font-mono font-medium text-brand-green-dark underline-offset-2 hover:underline" to={`/payments/${payment.id}`}>{payment.receiptNo ?? `Payment ${payment.id}`}</Link></td><td className="px-4 py-3">{payment.studentName ?? "Unavailable"}</td><td className="px-4 py-3 text-right font-mono">{format(centavos(payment.amountCents))}</td><td className="px-4 py-3">{payment.method}</td><td className="px-4 py-3">{payment.paidOn}</td><td className="px-4 py-3">{payment.recordedBy ?? "Unavailable"}</td><td className="px-4 py-3"><StatusBadge status={payment.status} /></td></tr>)}</tbody></table></div><PaginationControls currentPage={paymentsQuery.data.currentPage} lastPage={paymentsQuery.data.lastPage} perPage={paymentsQuery.data.perPage} total={paymentsQuery.data.total} label="payments" busy={paymentsQuery.isFetching} onPageChange={tableFilters.setPage} onPerPageChange={tableFilters.changePerPage} /></Card>)}
      {can(user, "payment.void.request") && <Card className="mt-5">
        <h2 className="font-semibold">My void requests</h2>
        <p className="mt-1 text-sm text-text-secondary">Check the status of requests you submitted. Accounting reviews each request.</p>
        {ownVoidRequestsQuery.isPending ? <p className="mt-4 text-sm text-text-secondary">Loading your requests…</p> : null}
        {ownVoidRequestsQuery.isError ? <ErrorState message={ownVoidRequestsQuery.error.message} onRetry={() => void ownVoidRequestsQuery.refetch()} /> : null}
        {ownVoidRequestsQuery.data && (ownVoidRequestsQuery.data.length === 0
          ? <p className="mt-4 text-sm text-text-secondary">You have not submitted any void requests.</p>
          : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-left text-sm"><thead><tr className="border-b bg-surface text-xs uppercase text-text-secondary"><th scope="col" className="px-3 py-2">Requested</th><th scope="col" className="px-3 py-2">Receipt</th><th scope="col" className="px-3 py-2 text-right">Amount</th><th scope="col" className="px-3 py-2">Reason</th><th scope="col" className="px-3 py-2">Status</th><th scope="col" className="px-3 py-2">Decision note</th></tr></thead><tbody>{ownVoidRequestsQuery.data.map((request) => <tr key={request.id} className="border-b last:border-0"><td className="px-3 py-3">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(request.requestedAt))}</td><td className="px-3 py-3 font-mono">{request.receiptNo ?? "Unavailable"}</td><td className="px-3 py-3 text-right font-mono">{format(centavos(request.amountCents))}</td><td className="px-3 py-3">{request.reason}</td><td className="px-3 py-3"><StatusBadge status={request.status} /></td><td className="px-3 py-3">{request.decisionNote ?? "Pending Accounting review"}</td></tr>)}</tbody></table></div>)}
      </Card>}
    </>
  );
}

function LivePaymentDetailPage({ user }: { user: AuthenticatedUser }) {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [voidReason, setVoidReason] = useState("");
  const [showVoidForm, setShowVoidForm] = useState(false);
  const paymentQuery = useQuery({ queryKey: ["payment", id], queryFn: () => getPayment(id), enabled: Boolean(id) });
  const voidMutation = useMutation({
    mutationFn: () => requestPaymentVoid(id, voidReason.trim()),
    onSuccess: async () => {
      setShowVoidForm(false);
      setVoidReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payment", id] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["void-requests"] }),
      ]);
    },
  });
  if (paymentQuery.isPending) return <LoadingState message="Loading payment details…" />;
  if (paymentQuery.isError) return <ErrorState message={paymentQuery.error.message} onRetry={() => void paymentQuery.refetch()} />;
  const payment = paymentQuery.data;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><Link className="text-sm text-brand-green-dark underline" to="/payments">Back to transaction history</Link><h1 className="mt-2 text-2xl font-semibold">Payment {payment.receiptNo ?? payment.id}</h1><p className="mt-1 text-sm text-text-secondary">Recorded {payment.recordedAt ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(payment.recordedAt)) : payment.paidOn} · Original transaction history is retained.</p></div><div className="flex gap-2">{can(user, "receipt.reprint") && <ReceiptPrintAction paymentId={payment.id} label={payment.firstPrintedAt ? "Reprint Receipt" : "Print Receipt"} />} {can(user, "payment.void.request") && payment.status === "valid" && <Button variant="secondary" onClick={() => setShowVoidForm((open) => !open)}>Request void</Button>}</div></div>
      <Dialog.Root open={showVoidForm} onOpenChange={setShowVoidForm}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" /><Dialog.Content aria-describedby="void-request-description" className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-white p-6 shadow-xl"><Dialog.Title className="text-lg font-semibold">Request payment void</Dialog.Title><Dialog.Description id="void-request-description" className="mt-2 text-sm text-text-secondary">Request approval to void receipt {payment.receiptNo ?? payment.id} for {format(centavos(payment.amountCents))}. The payment stays in the record while the Accounting Officer reviews this request.</Dialog.Description><form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); voidMutation.mutate(); }}><label className="block text-sm font-medium">Reason for request<textarea required minLength={10} maxLength={1000} value={voidReason} onChange={(event) => setVoidReason(event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-border p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark" /></label>{voidMutation.isError && <p role="alert" className="text-sm text-status-error">{voidMutation.error.message}</p>}<div className="flex justify-end gap-2"><Dialog.Close asChild><Button type="button" variant="neutral">Cancel</Button></Dialog.Close><Button type="submit" variant="destructive" disabled={voidMutation.isPending || voidReason.trim().length < 10}>{voidMutation.isPending ? "Submitting…" : "Confirm request"}</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Student" value={payment.studentName ?? "Unavailable"} /><Metric label="Amount" value={format(centavos(payment.amountCents))} /><Metric label="Method" value={payment.method} /><Metric label="Status" value={payment.status} /></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><Card><h2 className="font-semibold">Payment allocation</h2>{payment.allocations?.length ? <ul className="mt-3 divide-y divide-border">{payment.allocations.map((allocation, index) => <li key={`${allocation.installmentLabel}-${index}`} className="flex justify-between gap-4 py-2 text-sm"><span>{allocation.installmentLabel}</span><span className="font-mono">{format(centavos(allocation.amountCents))}</span></li>)}</ul> : <p className="mt-3 text-sm text-text-secondary">Allocation detail is unavailable.</p>}<p className="mt-3 flex justify-between border-t border-border pt-3 text-sm"><span>Balance after payment</span><span className="font-mono">{payment.balanceAfterCents === null ? "Historical snapshot unavailable" : format(centavos(payment.balanceAfterCents))}</span></p></Card><Card><h2 className="font-semibold">Record details</h2><dl className="mt-3 space-y-3 text-sm"><div><dt className="text-text-secondary">Receipt number</dt><dd className="font-mono">{payment.receiptNo ?? "Unavailable"}</dd></div><div><dt className="text-text-secondary">Recorded by</dt><dd>{payment.recordedBy ?? "Unavailable"}</dd></div><div><dt className="text-text-secondary">Reprint count</dt><dd>{payment.reprintCount}</dd></div><div><dt className="text-text-secondary">Date of payment</dt><dd>{payment.paidOn}</dd></div></dl></Card></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><Card><h2 className="font-semibold">Receipt notification status</h2>{payment.notifications?.length ? <ul className="mt-3 divide-y divide-border">{payment.notifications.map((notification, index) => <li key={`${notification.channel}-${index}`} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span className="capitalize">{notification.channel}</span><span className="capitalize">{notification.status.replace(/_/g, " ")}</span></li>)}</ul> : <p className="mt-3 text-sm text-text-secondary">No notification status is recorded for this payment.</p>}</Card><Card><h2 className="font-semibold">Audit trail</h2>{payment.auditTrail?.length ? <ol className="mt-3 space-y-3">{payment.auditTrail.map((entry, index) => <li key={`${entry.action}-${index}`} className="border-l-2 border-border pl-3 text-sm"><p className="font-medium">{entry.action.replace(/[._]/g, " ")}</p><p className="text-text-secondary">{entry.actorName ?? "Unknown user"}{entry.occurredAt ? ` · ${new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(entry.occurredAt))}` : ""}</p></li>)}</ol> : <p className="mt-3 text-sm text-text-secondary">No audit events are recorded for this payment.</p>}</Card></div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card><p className="text-xs font-medium uppercase text-text-secondary">{label}</p><p className="mt-2 font-semibold">{value}</p></Card>;
}

const primaryLinkClass = "inline-flex min-h-control items-center justify-center rounded-md bg-brand-green-dark px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark";
const secondaryLinkClass = "inline-flex min-h-control items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-medium text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark";
