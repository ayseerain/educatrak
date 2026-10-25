import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { decidePaymentVoid, listVoidRequests, type PaymentVoidRequest } from "@/api/cashierApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useClientPagination } from "@/components/ui/useClientPagination";
import { can } from "@/lib/permissions";
import { centavos, format } from "@/lib/money";
import type { AuthenticatedUser } from "@/lib/types";

export function LiveVoidsPage({ user }: { user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const [decisionFor, setDecisionFor] = useState<{ item: PaymentVoidRequest; decision: "approved" | "rejected" } | null>(null);
  const [note, setNote] = useState("");
  const requestsQuery = useQuery({ queryKey: ["void-requests"], queryFn: listVoidRequests });
  const requests = useClientPagination(requestsQuery.data ?? [], "void requests");
  const decisionMutation = useMutation({
    mutationFn: () => {
      if (!decisionFor) throw new Error("Choose a void request first.");
      return decidePaymentVoid(decisionFor.item.id, decisionFor.decision, note.trim());
    },
    onSuccess: async () => {
      setDecisionFor(null);
      setNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["void-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
      ]);
    },
  });
  const canDecide = can(user, "payment.void.approve");

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Void requests</h1>
        <p className="mt-1 text-sm text-text-secondary">{canDecide ? "Review persisted requests. The cashier who recorded a payment cannot approve or reject its void." : "Read-only view of persisted void requests and decisions."}</p>
      </div>
      {requestsQuery.isPending && <LoadingState message="Loading void requests…" />}
      {requestsQuery.isError && <ErrorState message={requestsQuery.error.message} onRetry={() => void requestsQuery.refetch()} />}
      {decisionMutation.isError && <p role="alert" className="mb-4 rounded-md border border-status-error p-3 text-sm text-status-error">{decisionMutation.error.message}</p>}
      {requestsQuery.data && (requestsQuery.data.length === 0 ? <Card><EmptyState message="There are no void requests to show." /></Card> : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead><tr className="border-b bg-surface text-xs uppercase text-text-secondary"><th scope="col" className="px-4 py-3">Receipt</th><th scope="col" className="px-4 py-3">Requester</th><th scope="col" className="px-4 py-3">Reason</th><th scope="col" className="px-4 py-3 text-right">Amount</th><th scope="col" className="px-4 py-3">Requested</th><th scope="col" className="px-4 py-3">Status / decision</th></tr></thead>
              <tbody>{requests.items.map((item) => (
                <tr key={item.id} className="border-b align-top last:border-0">
                  <td className="px-4 py-3 font-mono">{item.receiptNo ?? `Payment ${item.paymentId}`}</td>
                  <td className="px-4 py-3">{item.requestedBy}</td>
                  <td className="max-w-xs whitespace-normal px-4 py-3">{item.reason}</td>
                  <td className="px-4 py-3 text-right font-mono">{format(centavos(item.amountCents))}</td>
                  <td className="px-4 py-3">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(item.requestedAt))}</td>
                  <td className="min-w-72 px-4 py-3">
                    {item.status !== "pending" ? <><p className="font-medium capitalize">{item.status}</p>{item.decisionNote && <p className="mt-1 text-xs text-text-secondary">{item.decisionNote}</p>}</> : canDecide ? (
                      decisionFor?.item.id === item.id ? (
                        <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); decisionMutation.mutate(); }}>
                          <p className="font-medium">{decisionFor.decision === "approved" ? "Approve" : "Reject"} this request?</p>
                          <label className="block text-xs font-medium">Decision note<textarea required minLength={1} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-border p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark" /></label>
                          <div className="flex gap-2"><Button type="submit" disabled={decisionMutation.isPending || !note.trim()}>{decisionMutation.isPending ? "Saving…" : "Confirm"}</Button><Button type="button" variant="secondary" onClick={() => { setDecisionFor(null); setNote(""); }}>Cancel</Button></div>
                        </form>
                      ) : <div className="flex flex-wrap gap-2"><Button type="button" onClick={() => setDecisionFor({ item, decision: "approved" })}>Approve</Button><Button type="button" variant="destructive" onClick={() => setDecisionFor({ item, decision: "rejected" })}>Reject</Button></div>
                    ) : <span>Pending review</span>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {requests.controls}
        </Card>
      ))}
    </>
  );
}
