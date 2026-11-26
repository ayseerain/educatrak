import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { decidePaymentVoid, listVoidRequests, type PaymentVoidRequest } from "@/api/cashierApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableActionButton, TableActionGroup } from "@/components/ui/TableActionButton";
import { useClientPagination } from "@/components/ui/useClientPagination";
import { ViewTabs } from "@/components/ui/ViewTabs";
import { can } from "@/lib/permissions";
import { centavos, format } from "@/lib/money";
import type { AuthenticatedUser } from "@/lib/types";

type VoidView = "pending" | "history";

export function LiveVoidsPage({ user }: { user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<VoidView>("pending");
  const [decisionFor, setDecisionFor] = useState<{ item: PaymentVoidRequest; decision: "approved" | "rejected" } | null>(null);
  const [note, setNote] = useState("");
  const requestsQuery = useQuery({ queryKey: ["void-requests"], queryFn: listVoidRequests });
  const pending = requestsQuery.data?.filter((item) => item.status === "pending") ?? [];
  const history = requestsQuery.data?.filter((item) => item.status !== "pending") ?? [];
  const items = view === "pending" ? pending : history;
  const requests = useClientPagination(items, view === "pending" ? "pending void requests" : "void history");
  const canDecide = can(user, "payment.void.approve");
  const decisionMutation = useMutation({
    mutationFn: () => {
      if (!decisionFor) throw new Error("Choose a void request first.");
      return decidePaymentVoid(decisionFor.item.id, decisionFor.decision, note.trim());
    },
    onSuccess: async () => {
      setDecisionFor(null);
      setNote("");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["void-requests"] }), queryClient.invalidateQueries({ queryKey: ["payments"] })]);
    },
  });

  return <>
    <div className="page-header-card mb-5"><h1 className="text-2xl font-bold tracking-tight text-text-primary">Void requests</h1><p className="mt-1 text-sm text-text-secondary">{canDecide ? "Review persisted requests. The cashier who recorded a payment cannot approve or reject its void." : "Read-only view of persisted void requests and decisions."}</p></div>
    <ViewTabs label="Void request views" className="mb-4" items={[
      { key: "pending", label: `Pending requests (${pending.length})`, selected: view === "pending", onSelect: () => setView("pending") },
      { key: "history", label: `Void history (${history.length})`, selected: view === "history", onSelect: () => setView("history") },
    ]} />
    {requestsQuery.isPending && <LoadingState message="Loading void requests…" layout="table" columns={6} />}
    {requestsQuery.isError && <ErrorState message={requestsQuery.error.message} onRetry={() => void requestsQuery.refetch()} />}
    {decisionMutation.isError && <p role="alert" className="mb-4 rounded-md border border-status-error p-3 text-sm text-status-error">{decisionMutation.error.message}</p>}
    {requestsQuery.data && (items.length === 0 ? <Card><EmptyState message={view === "pending" ? "There are no pending void requests." : "There is no void decision history yet."} /></Card> : <Card className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left text-sm"><caption className="sr-only">{view === "pending" ? "Pending void requests" : "Void request history"}</caption><thead><tr className="border-b border-border text-xs font-semibold text-text-secondary"><th scope="col" className="px-3 py-2">Receipt</th><th scope="col" className="px-3 py-2">Requester</th><th scope="col" className="px-3 py-2">Reason</th><th scope="col" className="px-3 py-2 text-right">Amount</th><th scope="col" className="px-3 py-2">Requested</th><th scope="col" className="w-[22%] px-3 py-2">Status / decision</th></tr></thead><tbody>{requests.items.map((item) => <tr key={item.id} className="border-b align-top last:border-0"><th scope="row" className="px-3 py-2 text-left tabular-nums font-medium">{item.receiptNo ?? `Payment ${item.paymentId}`}</th><td className="px-3 py-2">{item.requestedBy}</td><td className="max-w-xs whitespace-normal px-3 py-2">{item.reason}</td><td className="px-3 py-2 text-right tabular-nums">{format(centavos(item.amountCents))}</td><td className="px-3 py-2">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(item.requestedAt))}</td><td className="min-w-72 px-3 py-2">{item.status !== "pending" ? <><StatusBadge status={item.status} />{item.decisionNote && <p className="mt-1 text-xs text-text-secondary">{item.decisionNote}</p>}</> : canDecide ? <TableActionGroup><TableActionButton icon={Check} label="Approve" onClick={() => setDecisionFor({ item, decision: "approved" })} /><TableActionButton icon={X} label="Reject" variant="destructive" onClick={() => setDecisionFor({ item, decision: "rejected" })} /></TableActionGroup> : <span>Pending review</span>}</td></tr>)}</tbody></table></div>{requests.controls}</Card>)}
    {decisionFor && <DecisionDialog decisionFor={decisionFor} note={note} saving={decisionMutation.isPending} error={decisionMutation.isError ? decisionMutation.error.message : undefined} onNoteChange={setNote} onCancel={() => { if (!decisionMutation.isPending) { setDecisionFor(null); setNote(""); } }} onConfirm={() => decisionMutation.mutate()} />}
  </>;
}

function DecisionDialog({ decisionFor, note, saving, error, onNoteChange, onCancel, onConfirm }: { decisionFor: { item: PaymentVoidRequest; decision: "approved" | "rejected" }; note: string; saving: boolean; error?: string; onNoteChange: (value: string) => void; onCancel: () => void; onConfirm: () => void }) {
  const action = decisionFor.decision === "approved" ? "Approve" : "Reject";
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onCancel(); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-text-primary/40" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-6 shadow-raised focus:outline-none"><Dialog.Title className="text-lg font-semibold text-text-primary">{action} void request</Dialog.Title><Dialog.Description className="mt-1 text-sm text-text-secondary">{action} the void request for receipt {decisionFor.item.receiptNo ?? decisionFor.item.paymentId} ({format(centavos(decisionFor.item.amountCents))}). The payment record remains preserved.</Dialog.Description><form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); onConfirm(); }}><label className="block text-sm font-medium">Decision note<textarea required minLength={1} maxLength={1000} value={note} onChange={(event) => onNoteChange(event.target.value)} className="form-control mt-1 min-h-24" /></label>{error && <p role="alert" className="text-sm text-status-error">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="neutral" disabled={saving} onClick={onCancel}>Cancel</Button><Button type="submit" variant={decisionFor.decision === "rejected" ? "destructive" : "primary"} disabled={saving || !note.trim()}>{saving ? "Saving…" : action}</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
