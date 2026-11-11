import type { PaymentRecord } from "@/api/cashierApi";
import { PrintDocumentHeader } from "@/components/printing/PrintDocumentHeader";
import { formatDate, formatDateTime } from "@/lib/dates";
import { centavos, format } from "@/lib/money";

/** The single receipt layout used by direct printing, the receipt route, and the development preview. */
export function ReceiptDocument({ payment, printedAt = new Date(), identifierLabel = "Student number" }: { payment: PaymentRecord; printedAt?: Date; identifierLabel?: string }) {
  const voided = payment.status === "voided";
  const copyLabel = voided ? "VOID" : payment.reprintCount > 0 ? `REPRINT ${payment.reprintCount}` : "ORIGINAL";
  const gradeSection = [payment.studentGrade, payment.studentSection].filter(Boolean).join(" · ");
  const allocationTotal = payment.allocations?.reduce((sum, allocation) => sum + allocation.amountCents, 0) ?? 0;

  return <article className={voided ? "receipt-document receipt-voided" : "receipt-document"}>
    {voided && <p className="receipt-void-mark" aria-hidden="true">VOID</p>}
    <PrintDocumentHeader title="ACKNOWLEDGMENT RECEIPT" generatedAt={printedAt} generatedPrefix="Printed" />

    <div className="receipt-status-row">
      <dl>
        <div><dt>Receipt No.</dt><dd className="receipt-number">{payment.receiptNo ?? "Unavailable"}</dd></div>
        <div><dt>Transaction date</dt><dd>{payment.paidOn ? formatDate(payment.paidOn) : "Unavailable"}</dd></div>
      </dl>
      <p className="receipt-copy-label">{copyLabel}</p>
    </div>

    <div className="receipt-columns">
      <section className="receipt-section">
        <h2>Student information</h2>
        <dl className="receipt-fields">
          <div><dt>Student name</dt><dd>{payment.studentName ?? "Unavailable"}</dd></div>
          <div><dt>{identifierLabel}</dt><dd>{payment.studentNo ?? "Unavailable"}</dd></div>
          {gradeSection && <div><dt>Grade and section</dt><dd>{gradeSection}</dd></div>}
          {payment.schoolYear && <div><dt>School year</dt><dd>{payment.schoolYear}</dd></div>}
        </dl>
      </section>
      <section className="receipt-section">
        <h2>Payment details</h2>
        <dl className="receipt-fields">
          <div><dt>Payment method</dt><dd className="receipt-method">{payment.method}</dd></div>
          <div><dt>Received by</dt><dd>{payment.recordedBy ?? "Unavailable"}</dd></div>
          {payment.recordedAt && <div><dt>Recorded</dt><dd>{formatDateTime(payment.recordedAt)}</dd></div>}
        </dl>
      </section>
    </div>

    <section className="receipt-section">
      <h2>Payment allocation</h2>
      {payment.allocations?.length ? <table>
        <thead><tr><th scope="col">Fee or installment</th><th scope="col">Amount</th></tr></thead>
        <tbody>{payment.allocations.map((allocation, index) => <tr key={`${allocation.installmentLabel}-${index}`}><td>{allocation.installmentLabel}</td><td>{format(centavos(allocation.amountCents))}</td></tr>)}</tbody>
        <tfoot><tr><th scope="row">Total applied</th><td>{format(centavos(allocationTotal))}</td></tr></tfoot>
      </table> : <p className="receipt-note">Allocation detail is unavailable for this receipt.</p>}
    </section>

    <div className="receipt-totals">
      <div className="receipt-amount-box"><span>Amount received</span><strong>{format(centavos(payment.amountCents))}</strong></div>
      <div><span>Balance after payment</span><strong>{payment.balanceAfterCents === null ? "Not recorded" : format(centavos(payment.balanceAfterCents))}</strong></div>
    </div>

    <p className="receipt-acknowledgment">Received with thanks. This acknowledges the payment recorded in the school's billing system{voided ? "; this receipt has been voided and is no longer valid" : ""}.</p>
    <footer className="receipt-footer">
      <span>Transaction reference {payment.id}</span>
      <span>{payment.reprintCount > 0 ? "Reprinted copy · original receipt number retained" : "Keep this receipt for your records"}</span>
    </footer>
  </article>;
}
