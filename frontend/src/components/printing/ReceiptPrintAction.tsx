import { useState } from "react";
import { getPayment, reprintPayment, type PaymentRecord } from "@/api/cashierApi";
import { ReceiptDocument } from "@/components/printing/ReceiptDocument";
import { Button } from "@/components/ui/Button";
import { printDocumentWhenReady } from "@/lib/printing";
import { PrintSurface } from "@/components/printing/PrintSurface";
import { useQueryClient } from "@tanstack/react-query";

export function PrinterIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6zM18 12h.01"/></svg>;
}

export function ReceiptPrintAction({ paymentId, label, disabled = false }: { paymentId: string; label: string; disabled?: boolean }) {
  const queryClient = useQueryClient();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function prepareAndPrint() {
    if (busy || disabled) return;
    setBusy(true);
    setError("");
    try {
      const persisted = await getPayment(paymentId);
      // The print-attempt response carries the updated reprint count; keep detail fields from the persisted record as a fallback.
      const printAttempt = { ...persisted, ...(await reprintPayment(persisted.id)) };
      queryClient.setQueryData(["payment", paymentId], printAttempt);
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      setPayment(printAttempt);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await printDocumentWhenReady();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The receipt could not be prepared for printing.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Button type="button" variant="secondary" disabled={disabled || busy} onClick={() => void prepareAndPrint()}>
      <span className="inline-flex items-center gap-2"><PrinterIcon />{busy ? "Preparing receipt…" : payment?.firstPrintedAt ? "Reprint Receipt" : label}</span>
    </Button>
    {error && <p className="mt-2 text-sm text-status-error" role="alert">{error}</p>}
    {payment && <PrintSurface className="receipt-print-root"><ReceiptDocument payment={payment} /></PrintSurface>}
  </>;
}
