import { ViewTabs } from "@/components/ui/ViewTabs";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTodayCloseOut, listCloseOuts, signOffCloseOut, submitCloseOut } from "@/api/cashierApi";
import type { CloseOutRecord } from "@/api/cashierApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useClientPagination } from "@/components/ui/useClientPagination";
import { can } from "@/lib/permissions";
import { centavos, format } from "@/lib/money";
import type { AuthenticatedUser } from "@/lib/types";

export function LiveDailyCloseOut({ user, initialView = "today" }: { user: AuthenticatedUser; initialView?: "today" | "history" }) {
  const [view, setView] = useState<"today" | "history">(initialView);
  return <>
    <ViewTabs label="Cashier close-out workspace" items={[
      { key: "today", label: "Today's close-out", selected: view === "today", onSelect: () => setView("today") },
      { key: "history", label: "History", selected: view === "history", onSelect: () => setView("history") },
    ]} />
    <div key={view} className="animate-screen-in motion-reduce:animate-none">{view === "today" ? <DailyCloseOutForm /> : <LiveCloseOutHistory user={user} />}</div>
  </>;
}

function DailyCloseOutForm() {
  const queryClient = useQueryClient();
  const [counted, setCounted] = useState("");
  const [varianceReason, setVarianceReason] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const closeOutQuery = useQuery({ queryKey: ["close-out-today"], queryFn: getTodayCloseOut });
  const mutation = useMutation({
    mutationFn: () => {
      const cents = parseCash(counted);
      if (cents === null) throw new Error("Enter a valid non-negative cash amount with up to two decimal places.");
      return submitCloseOut(cents, varianceReason.trim() || undefined);
    },
    onSuccess: async () => {
      setReviewOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["close-out-today"] }),
        queryClient.invalidateQueries({ queryKey: ["close-outs"] }),
      ]);
    },
  });

  if (closeOutQuery.isPending) return <LoadingState message="Loading today's close-out…" layout="detail" />;
  if (closeOutQuery.isError) return <ErrorState message={closeOutQuery.error.message} onRetry={() => void closeOutQuery.refetch()} />;
  const snapshot = closeOutQuery.data;
  const countedCents = parseCash(counted);
  const varianceCents = countedCents === null ? null : countedCents - snapshot.systemCashCents;
  const hasVariance = varianceCents !== null && varianceCents !== 0;

  return <>
    <div className="page-header-card mb-5"><h1 className="text-2xl font-bold tracking-tight text-text-primary">Close-out</h1><p className="mt-1 text-sm text-text-secondary">Review today's cash total, count the drawer, and lock the submitted record.</p></div>
    <Card className="p-4 sm:p-5">
      <p className="text-sm text-text-secondary">Business date · {snapshot.businessDate} · Cash payments only</p>
      {snapshot.closeOut ? <div className="mt-4 rounded-md border border-status-success bg-status-success/5 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="font-medium text-brand-green-dark">Today's close-out is locked.</p><Button className="no-print" type="button" variant="secondary" onClick={() => window.print()}>Print summary</Button></div><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><Summary label="System cash" cents={snapshot.closeOut.systemCashCents} /><Summary label="Counted cash" cents={snapshot.closeOut.countedCashCents} /><Summary label="Variance" cents={snapshot.closeOut.varianceCents} /></dl>{snapshot.closeOut.varianceReason && <p className="mt-3 text-sm">Variance reason: {snapshot.closeOut.varianceReason}</p>}<p className="mt-3 text-xs text-text-secondary">Submitted {formatTimestamp(snapshot.closeOut.submittedAt)}</p></div> : <>
        <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); setReviewOpen(true); }}>
          <div className="grid gap-4 lg:grid-cols-3"><Summary label="System cash total" cents={snapshot.systemCashCents} /><label className="block rounded-md border border-border bg-white p-4 text-sm font-medium shadow-card">Counted cash<input type="number" min="0" step="0.01" aria-label="Counted cash" inputMode="decimal" value={counted} onChange={(event) => setCounted(event.target.value)} placeholder="0.00" className="form-control mt-1" /></label><section className={`rounded-md border p-4 ${varianceCents === null ? "border-border bg-surface" : varianceCents === 0 ? "border-status-success bg-status-success/5" : varianceCents > 0 ? "border-status-warning bg-status-warning/5" : "border-status-error bg-status-error/5"}`} aria-live="polite"><p className="text-sm text-text-secondary">Variance</p><p className="mt-1 text-xl font-semibold">{varianceCents === null ? "Waiting for count" : format(centavos(varianceCents))}</p><p className="mt-1 text-sm text-text-secondary">{varianceCents === null ? "Enter the drawer count to compare." : varianceCents === 0 ? "The count matches system cash." : varianceCents > 0 ? "The drawer count is over." : "The drawer count is short."}</p></section></div>
          {hasVariance && <label className="block text-sm font-medium">Variance explanation <span aria-hidden="true">*</span><textarea required minLength={10} maxLength={1000} value={varianceReason} onChange={(event) => setVarianceReason(event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-border p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark" /></label>}
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-text-secondary">A submitted close-out is locked for the business date.</p><Button type="submit" disabled={countedCents === null || (hasVariance && varianceReason.trim().length < 10)}>Review close-out</Button></div>
        </form>
      </>}
      {mutation.isError && <p role="alert" className="mt-3 text-sm text-status-error">{mutation.error.message}</p>}
    </Card>
    <Dialog.Root open={reviewOpen} onOpenChange={setReviewOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-text-primary/40" /><Dialog.Content aria-describedby="closeout-description" className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(500px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-6 shadow-raised"><Dialog.Title className="text-lg font-semibold">Confirm daily close-out</Dialog.Title><Dialog.Description id="closeout-description" className="mt-2 text-sm text-text-secondary">This submits and locks the close-out for {snapshot.businessDate}.</Dialog.Description><dl className="mt-4 space-y-2 text-sm"><Summary label="System cash" cents={snapshot.systemCashCents} /><Summary label="Counted cash" cents={countedCents ?? 0} /><Summary label="Variance" cents={varianceCents ?? 0} /></dl>{hasVariance && <p className="mt-3 rounded-md border border-border bg-surface p-3 text-sm">Reason: {varianceReason}</p>}{mutation.isError && <p role="alert" className="mt-3 text-sm text-status-error">{mutation.error.message}</p>}<div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setReviewOpen(false)}>Edit</Button><Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Submitting…" : "Confirm and lock"}</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
}

export function LiveCloseOutHistory({ user }: { user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const historyQuery = useQuery({ queryKey: ["close-outs"], queryFn: listCloseOuts });
  const history = useClientPagination(historyQuery.data ?? [], "close-outs");
  const signOff = useMutation({ mutationFn: signOffCloseOut, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["close-outs"] }); } });
  return <>
    <div className="page-header-card mb-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-text-primary">{user.role === "accounting" ? "Close-out review" : "Close-outs"}</h1><p className="mt-1 text-sm text-text-secondary">Review submitted cash close-outs{can(user, "closeout.signoff") ? " and sign off once reconciled" : ""}.</p></div>{(user.role === "cashier" || user.role === "accounting") && historyQuery.data && historyQuery.data.length > 0 && <Button className="no-print" type="button" variant="secondary" onClick={() => window.print()}>Print summary</Button>}</div></div>
    {historyQuery.isPending && <LoadingState message="Loading close-out history…" layout="table" columns={7} />}
    {historyQuery.isError && <ErrorState message={historyQuery.error.message} onRetry={() => void historyQuery.refetch()} />}
    {signOff.isError && <p role="alert" className="mb-3 text-sm text-status-error">{signOff.error.message}</p>}
    {historyQuery.data && (historyQuery.data.length === 0 ? <Card><EmptyState message="No close-outs have been submitted." /></Card> : <Card className="overflow-x-auto p-0"><table className="w-full min-w-[900px] border-collapse text-left text-sm"><thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">{["Date", "Cashier", "System cash", "Counted cash", "Variance", "Status", "Action"].map((title) => <th key={title} scope="col" className="px-3 py-2">{title}</th>)}</tr></thead><tbody>{history.items.map((record: CloseOutRecord) => <tr key={record.id} className="border-b align-top last:border-0"><td className="px-3 py-2">{record.businessDate}</td><td className="px-3 py-2">{record.cashier ?? "Unavailable"}</td><td className="px-3 py-2 text-right font-mono">{format(centavos(record.systemCashCents))}</td><td className="px-3 py-2 text-right font-mono">{format(centavos(record.countedCashCents))}</td><td className="px-3 py-2 text-right font-mono">{format(centavos(record.varianceCents))}</td><td className="px-3 py-2">{record.signedOffAt ? <><p>Signed off {formatTimestamp(record.signedOffAt)}</p><p className="text-xs text-text-secondary">By {record.signedOffBy ?? "Unavailable"}</p></> : "Unsigned"}{record.varianceReason && <p className="mt-1 max-w-xs whitespace-normal text-xs text-text-secondary">Reason: {record.varianceReason}</p>}</td><td className="px-3 py-2">{!record.signedOffAt && can(user, "closeout.signoff") ? <Button disabled={signOff.isPending} onClick={() => signOff.mutate(record.id)}>Sign off</Button> : "View"}</td></tr>)}</tbody></table>{history.controls}</Card>)}
  </>;
}

function Summary({ label, cents }: { label: string; cents: number }) {
  return <div><dt className="text-sm text-text-secondary">{label}</dt><dd className="mt-1 font-mono font-semibold">{format(centavos(cents))}</dd></div>;
}

function parseCash(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole = "0", fraction = ""] = value.trim().split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));
}
