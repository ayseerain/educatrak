import { useState } from "react";
import { getPayment, reprintPayment, type PaymentRecord } from "@/api/cashierApi";
import { PrintDocumentHeader } from "@/components/printing/PrintDocumentHeader";
import { Button } from "@/components/ui/Button";
import { centavos, format } from "@/lib/money";
import { printDocumentWhenReady } from "@/lib/printing";
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
      const printAttempt = await reprintPayment(persisted.id);
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
    {payment && <section aria-hidden="true" className="print-root receipt-print-root" aria-label="Receipt print document">
      <article className="receipt-document">
        <PrintDocumentHeader title="ACKNOWLEDGMENT RECEIPT" />
        <div className="receipt-status-row"><span>Receipt No. <strong>{payment.receiptNo ?? "Unavailable"}</strong></span><strong>{payment.status === "voided" ? "VOID" : payment.reprintCount > 0 ? `REPRINT ${payment.reprintCount}` : "ORIGINAL"}</strong></div>
        <section className="receipt-section"><h2>Student information</h2><dl className="receipt-grid"><div><dt>Student name</dt><dd>{payment.studentName ?? "Unavailable"}</dd></div><div><dt>Student number</dt><dd>{payment.studentNo ?? "Unavailable"}</dd></div></dl></section>
        <section className="receipt-section"><h2>Payment details</h2><dl className="receipt-grid"><div><dt>Transaction date</dt><dd>{payment.paidOn}</dd></div><div><dt>Amount received</dt><dd className="receipt-amount">{format(centavos(payment.amountCents))}</dd></div><div><dt>Payment method</dt><dd>{payment.method}</dd></div><div><dt>Recorded by</dt><dd>{payment.recordedBy ?? "Unavailable"}</dd></div></dl></section>
        <section className="receipt-section"><h2>Payment allocation</h2>{payment.allocations?.length ? <table><thead><tr><th scope="col">Fee or installment</th><th scope="col">Amount</th></tr></thead><tbody>{payment.allocations.map((allocation, index) => <tr key={`${allocation.installmentLabel}-${index}`}><td>{allocation.installmentLabel}</td><td>{format(centavos(allocation.amountCents))}</td></tr>)}</tbody></table> : <p>Allocation detail is unavailable for this receipt.</p>}
          <dl className="receipt-grid receipt-balance"><div><dt>Balance after payment</dt><dd>{payment.balanceAfterCents === null ? "Historical snapshot unavailable" : format(centavos(payment.balanceAfterCents))}</dd></div></dl>
        </section>
        <p className="receipt-acknowledgment">Received with thanks. This acknowledgment reflects the payment recorded in the school's system.</p>
        <footer className="receipt-footer">Transaction reference: {payment.id}</footer>
      </article>
    </section>}
  </>;
}
