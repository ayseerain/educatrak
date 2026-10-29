import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDailyReport } from "@/api/reportApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { TableFilters, useTableFilters } from "@/components/ui/TableFilters";
import { downloadCsv } from "@/lib/csv";
import type { AuthenticatedUser } from "@/lib/types";
import { PrintDocumentFooter, PrintDocumentHeader } from "@/components/printing/PrintDocumentHeader";
import { formatDate } from "@/lib/dates";
import { PrintDocumentTable } from "@/components/printing/PrintDocumentTable";
import type { DailyReport } from "@/api/reportApi";
import { printDocumentWhenReady } from "@/lib/printing";
import { PrintSurface } from "@/components/printing/PrintSurface";
import { PrinterIcon } from "@/components/printing/ReceiptPrintAction";

export function LiveDailyReport({ user }: { user: AuthenticatedUser }) {
  const tableFilters = useTableFilters({ date: manilaToday() });
  const date = tableFilters.applied.date;
  const [page, setPage] = useState(1);
  const [voidPage, setVoidPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [printError, setPrintError] = useState("");
  const [printData, setPrintData] = useState<{ payments: DailyReport["payments"]; voids: DailyReport["voids"] } | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const report = useQuery({ queryKey: ["daily-report", date, page, voidPage, perPage], queryFn: () => getDailyReport(date, page, perPage, voidPage) });

  async function exportReport() {
    setExportError("");
    setIsExporting(true);
    try {
      const firstPage = await getDailyReport(date, 1, perPage, 1);
      const payments = [...firstPage.payments];
      for (let currentPage = 2; currentPage <= firstPage.meta.lastPage; currentPage += 1) {
        payments.push(...(await getDailyReport(date, currentPage, perPage, 1)).payments);
      }
      const voids = [...firstPage.voids];
      for (let currentPage = 2; currentPage <= firstPage.voidMeta.lastPage; currentPage += 1) {
        voids.push(...(await getDailyReport(date, 1, perPage, currentPage)).voids);
      }
      const rows = [
        ...payments.map((row) => [date, "Payment", row.studentNo, row.studentName, row.receiptNo ?? "Unavailable", row.cashier, row.method, row.status.replace(/_/g, " "), money(row.amountCents), ""]),
        ...voids.map((row) => [date, "Void request", row.studentNo, row.studentName, row.receiptNo ?? "Unavailable", row.requestedBy, "", row.status, money(row.amountCents), row.reason]),
      ];
      downloadCsv(`daily-collection-${date}.csv`, ["Date", "Record type", "Student no.", "Student", "Receipt", "Cashier / requester", "Method", "Status", "Amount", "Reason"], rows);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "The report could not be exported.");
    } finally {
      setIsExporting(false);
    }
  }

  async function printReport() {
    if (!report.data || isPreparingPrint) return;
    setIsPreparingPrint(true);
    setPrintError("");
    try {
      const first = await getDailyReport(date, 1, 50, 1);
      const payments = [...first.payments];
      for (let currentPage = 2; currentPage <= first.meta.lastPage; currentPage += 1) payments.push(...(await getDailyReport(date, currentPage, 50, 1)).payments);
      const voids = [...first.voids];
      for (let currentPage = 2; currentPage <= first.voidMeta.lastPage; currentPage += 1) voids.push(...(await getDailyReport(date, 1, 50, currentPage)).voids);
      setPrintData({ payments, voids });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await printDocumentWhenReady();
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : "The complete report could not be prepared for printing.");
    } finally {
      setIsPreparingPrint(false);
    }
  }

  return <>
    {report.data && printData && <PrintSurface className="report-print-root">
      <PrintDocumentHeader title="DAILY COLLECTION REPORT" subtitle={`Reporting date: ${formatDate(date)}`} details={[user.role === "cashier" ? "Scope: your recorded payments" : "Scope: all cashiers", `Prepared by: ${user.name}`]} />
      <p className="report-print-summary"><strong>Total collected:</strong> {money(report.data.totalCents)} <span>(voided payments excluded; pending voids included)</span></p>
      <PrintDocumentTable title="Collections by payment method" headings={["Method", "Transactions", "Amount"]} rightAlignColumns={[2]} rows={report.data.byMethod.map((row) => [row.method, String(row.transactionCount), money(row.totalCents)])} />
      <PrintDocumentTable title="Collections by cashier" headings={["Cashier", "Transactions", "Amount"]} rightAlignColumns={[2]} rows={report.data.byCashier.map((row) => [row.cashier, String(row.transactionCount), money(row.totalCents)])} />
      <PrintDocumentTable title={`Payments (${printData.payments.length})`} headings={["Student", "Student no.", "Receipt", "Cashier", "Method", "Amount", "Status"]} rightAlignColumns={[5]} rows={printData.payments.map((row) => [row.studentName, row.studentNo, row.receiptNo ?? "Unavailable", row.cashier, row.method, money(row.amountCents), row.status.replace(/_/g, " ")])} />
      <PrintDocumentTable title={`Void requests and decisions (${printData.voids.length})`} headings={["Student", "Receipt", "Amount", "Status", "Reason", "Requested by"]} rightAlignColumns={[2]} rows={printData.voids.map((row) => [row.studentName, row.receiptNo ?? "Unavailable", money(row.amountCents), row.status, row.reason, row.requestedBy])} />
      <PrintDocumentFooter preparedBy={user.name} />
    </PrintSurface>}
    <div className="page-header-card mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold tracking-tight text-text-primary">Daily report</h1><p className="mt-1 text-sm text-text-secondary">{user.role === "cashier" ? "Today's collection activity recorded by your account." : "Persisted payments and void activity for the selected school date."}</p></div>
      <div className="flex gap-2"><Button type="button" variant="secondary" disabled={!report.data || isExporting} onClick={() => void exportReport()}>{isExporting ? "Preparing export…" : "Export for Excel (.csv)"}</Button><Button type="button" variant="secondary" disabled={!report.data || isPreparingPrint} onClick={() => void printReport()}><span className="inline-flex items-center gap-2"><PrinterIcon />{isPreparingPrint ? "Preparing report…" : "Print Report"}</span></Button></div>
    </div>
    {exportError && <p className="mb-4 text-sm text-error" role="alert">{exportError}</p>}
    {printError && <p className="mb-4 text-sm text-error" role="alert">{printError}</p>}
    {user.role === "cashier"
      ? <Card className="mb-5 text-sm">Report date: {date}</Card>
      : <TableFilters scope="Daily report" defaults={{ date: manilaToday() }} draft={tableFilters.draft} applied={tableFilters.applied} fields={[{ key: "date", label: "Report date", type: "date" }]} onChange={tableFilters.update} onApply={() => { tableFilters.apply(); setPage(1); setVoidPage(1); }} onReset={tableFilters.reset} onClear={() => { tableFilters.clear(); setPage(1); setVoidPage(1); }} onRemove={(key) => { tableFilters.remove(key); setPage(1); setVoidPage(1); }} />}
    {report.isPending && <LoadingState message="Loading daily report…" layout="detail" />}
    {report.isError && <ErrorState message={report.error.message} onRetry={() => void report.refetch()} />}
    {report.data && <>
      <Card className="mb-5"><p className="text-sm text-text-secondary">Total collected (voided payments excluded; pending voids remain included)</p><p className="mt-1 text-2xl font-semibold">{money(report.data.totalCents)}</p></Card>
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card><h2 className="mb-3 text-base font-semibold text-text-primary">By payment method</h2>{report.data.byMethod.length ? <Table headers={["Method", "Transactions", "Amount"]} rows={report.data.byMethod.map((row) => [row.method, String(row.transactionCount), money(row.totalCents)])} /> : <EmptyState message="No collection totals for this date." />}</Card>
        <Card><h2 className="mb-3 text-base font-semibold text-text-primary">By cashier</h2>{report.data.byCashier.length ? <Table headers={["Cashier", "Transactions", "Amount"]} rows={report.data.byCashier.map((row) => [row.cashier, String(row.transactionCount), money(row.totalCents)])} /> : <EmptyState message="No cashier totals for this date." />}</Card>
      </div>
      <Card className="mb-5 overflow-x-auto p-0"><div className="border-b border-border p-4"><h2 className="text-base font-semibold text-text-primary">Payments</h2></div>{report.data.payments.length ? <Table headers={["Student", "Receipt", "Cashier", "Method", "Amount", "Status"]} rows={report.data.payments.map((row) => [`${row.studentName} (${row.studentNo})`, row.receiptNo ?? "Unavailable", row.cashier, row.method, money(row.amountCents), row.status.replace(/_/g, " ")])} /> : <div className="p-4"><EmptyState message="No payments were recorded for this date." /></div>}<PaginationControls currentPage={report.data.meta.currentPage} lastPage={report.data.meta.lastPage} perPage={report.data.meta.perPage} total={report.data.meta.totalPayments} label="payments" busy={report.isFetching} onPageChange={setPage} onPerPageChange={(size) => { setPerPage(size); setPage(1); setVoidPage(1); }} /></Card>
      <Card className="mb-5 overflow-x-auto p-0"><div className="border-b border-border p-4"><h2 className="text-base font-semibold text-text-primary">Void requests and decisions</h2></div>{report.data.voids.length ? <Table headers={["Student", "Receipt", "Amount", "Status", "Reason", "Requested by"]} rows={report.data.voids.map((row) => [`${row.studentName} (${row.studentNo})`, row.receiptNo ?? "Unavailable", money(row.amountCents), row.status, row.reason, row.requestedBy])} /> : <div className="p-4"><EmptyState message="No void requests were opened or decided for this date." /></div>}<PaginationControls currentPage={report.data.voidMeta.currentPage} lastPage={report.data.voidMeta.lastPage} perPage={report.data.voidMeta.perPage} total={report.data.voidMeta.total} label="void requests" busy={report.isFetching} onPageChange={setVoidPage} onPerPageChange={(size) => { setPerPage(size); setPage(1); setVoidPage(1); }} /></Card>
    </>}
  </>;
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <table className="w-full min-w-[650px] border-collapse text-left text-sm"><thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">{headers.map((header) => <th key={header} scope="col" className="px-3 py-2">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-b align-top last:border-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2">{cell}</td>)}</tr>)}</tbody></table>;
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(cents / 100);
}

function manilaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
