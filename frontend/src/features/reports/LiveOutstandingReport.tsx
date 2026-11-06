import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOutstandingReport } from "@/api/reportApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { TableFilters, activeTableFilters, useTableFilters } from "@/components/ui/TableFilters";
import { downloadCsv } from "@/lib/csv";
import { PrintDocumentFooter, PrintDocumentHeader } from "@/components/printing/PrintDocumentHeader";
import type { AuthenticatedUser } from "@/lib/types";
import { PrintDocumentTable } from "@/components/printing/PrintDocumentTable";
import type { OutstandingAccount } from "@/api/reportApi";
import { printDocumentWhenReady } from "@/lib/printing";
import { PrintSurface } from "@/components/printing/PrintSurface";
import { PrinterIcon } from "@/components/printing/ReceiptPrintAction";

const outstandingFilterDefaults = { grade: "", section: "", minimumBalance: "", maximumBalance: "", overdueOnly: "" };

export function LiveOutstandingReport({ user }: { user?: AuthenticatedUser }) {
  const tableFilters = useTableFilters(outstandingFilterDefaults);
  const [validationError, setValidationError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [printError, setPrintError] = useState("");
  const [printAccounts, setPrintAccounts] = useState<OutstandingAccount[] | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const applied = tableFilters.applied;
  const active = activeTableFilters(applied, outstandingFilterDefaults);
  const filters = {
    ...(active.grade ? { grade: active.grade.trim() } : {}),
    ...(active.section ? { section: active.section.trim() } : {}),
    ...(active.minimumBalance ? { minimumBalanceCents: Math.round(Number(active.minimumBalance) * 100) } : {}),
    ...(active.maximumBalance ? { maximumBalanceCents: Math.round(Number(active.maximumBalance) * 100) } : {}),
    ...(active.overdueOnly === "true" ? { overdueOnly: true } : {}),
  };
  const report = useQuery({ queryKey: ["outstanding-report", tableFilters.applied, tableFilters.page, tableFilters.perPage], queryFn: () => getOutstandingReport({ ...filters, page: tableFilters.page, perPage: tableFilters.perPage }) });

  async function exportReport() {
    setExportError("");
    setIsExporting(true);
    try {
      const firstPage = await getOutstandingReport({ ...filters, page: 1, perPage: tableFilters.perPage });
      const accounts = [...firstPage.data];
      for (let currentPage = 2; currentPage <= firstPage.lastPage; currentPage += 1) {
        accounts.push(...(await getOutstandingReport({ ...filters, page: currentPage, perPage: tableFilters.perPage })).data);
      }
      downloadCsv("outstanding-balances.csv", ["Student no.", "Student", "Grade", "Section", "School year", "Balance (PHP)", "Status"], accounts.map((account) => [
        account.studentNo,
        account.studentName,
        account.gradeLevel ?? "",
        account.section ?? "",
        account.schoolYear,
        (account.balanceCents / 100).toFixed(2),
        account.status.replace(/_/g, " "),
      ]));
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
      const first = await getOutstandingReport({ ...filters, page: 1, perPage: 50 });
      const accounts = [...first.data];
      for (let startPage = 2; startPage <= first.lastPage; startPage += 5) {
        const pages = Array.from({ length: Math.min(5, first.lastPage - startPage + 1) }, (_, index) => startPage + index);
        const results = await Promise.all(pages.map((page) => getOutstandingReport({ ...filters, page, perPage: 50 })));
        results.forEach((result) => accounts.push(...result.data));
      }
      setPrintAccounts(accounts);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await printDocumentWhenReady();
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : "The complete report could not be prepared for printing.");
    } finally {
      setIsPreparingPrint(false);
    }
  }

  function submit() {
    const { minimumBalance, maximumBalance } = tableFilters.draft;
    const validAmount = (value: string) => !value.trim() || (/^\d+(\.\d{1,2})?$/.test(value.trim()) && Number.isFinite(Number(value)));
    if (!validAmount(minimumBalance) || !validAmount(maximumBalance)) {
      setValidationError("Enter valid minimum and maximum balances in pesos.");
      return;
    }
    const minimumCents = minimumBalance.trim() ? Math.round(Number(minimumBalance) * 100) : undefined;
    const maximumCents = maximumBalance.trim() ? Math.round(Number(maximumBalance) * 100) : undefined;
    if (minimumCents !== undefined && maximumCents !== undefined && maximumCents < minimumCents) {
      setValidationError("Maximum balance must be greater than or equal to minimum balance.");
      return;
    }
    setValidationError("");
    tableFilters.apply();
  }

  return <>
    {printAccounts && <PrintSurface className="report-print-root">
      <PrintDocumentHeader title="OUTSTANDING BALANCE REPORT" subtitle={["All school years", active.grade && `Grade: ${active.grade}`, active.section && `Section: ${active.section}`, active.minimumBalance && `Minimum: ₱${active.minimumBalance}`, active.maximumBalance && `Maximum: ₱${active.maximumBalance}`, active.overdueOnly === "true" && "Overdue only"].filter(Boolean).join(" · ")} details={[user && `Prepared by: ${user.name}`]} />
      <p className="report-print-summary"><strong>Accounts:</strong> {printAccounts.length} <span>·</span> <strong>Total outstanding:</strong> {money(printAccounts.reduce((sum, account) => sum + account.balanceCents, 0))}</p>
      <PrintDocumentTable title="Outstanding billing accounts" headings={["Student", "Student no.", "Grade", "Section", "School year", "Balance", "Status"]} rightAlignColumns={[5]} rows={printAccounts.map((account) => [account.studentName, account.studentNo, account.gradeLevel ?? "", account.section ?? "", account.schoolYear, money(account.balanceCents), account.status.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase())])} />
      <PrintDocumentFooter preparedBy={user?.name} />
    </PrintSurface>}
    <div className="page-header-card mb-5 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-text-primary">Outstanding</h1><p className="mt-1 text-sm text-text-secondary">Billing accounts with an unpaid balance across school years.</p></div><div className="flex gap-2"><Button type="button" variant="secondary" disabled={!report.data || isExporting} onClick={() => void exportReport()}>{isExporting ? "Preparing export…" : "Export for Excel (.csv)"}</Button><Button type="button" variant="secondary" disabled={!report.data || isPreparingPrint} onClick={() => void printReport()}><span className="inline-flex items-center gap-2"><PrinterIcon />{isPreparingPrint ? "Preparing report…" : "Print Report"}</span></Button></div></div>
    {exportError && <p className="mb-4 text-sm text-error" role="alert">{exportError}</p>}
    {printError && <p className="mb-4 text-sm text-error" role="alert">{printError}</p>}
    <Card className="p-0">
      <div className="border-b border-border px-5 py-3"><TableFilters embedded scope="Outstanding balances" defaults={outstandingFilterDefaults} draft={tableFilters.draft} applied={tableFilters.applied} fields={[
      { key: "grade", label: "Grade" }, { key: "section", label: "Section" },
      { key: "minimumBalance", label: "Minimum balance (PHP)", type: "number", min: "0", step: "0.01" },
      { key: "maximumBalance", label: "Maximum balance (PHP)", type: "number", min: "0", step: "0.01" },
      { key: "overdueOnly", label: "Overdue only", type: "checkbox" },
    ]} onChange={tableFilters.update} onApply={submit} onClear={() => { tableFilters.clear(); setValidationError(""); }} onRemove={tableFilters.remove} error={validationError} /></div>
      {report.isPending && <LoadingState message="Loading outstanding accounts…" layout="table" bare columns={6} />}
      {report.isError && <ErrorState message={report.error.message} onRetry={() => void report.refetch()} />}
      {report.data && (report.data.data.length === 0 ? <EmptyState message="No outstanding accounts match these filters." /> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left text-sm"><thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">{["Student", "Student no.", "Grade & section", "School year", "Balance", "Status"].map((heading) => <th key={heading} scope="col" className="px-3 py-2">{heading}</th>)}</tr></thead><tbody>{report.data.data.map((account) => <tr key={account.id} className="border-b align-top last:border-0"><td className="px-3 py-2">{account.studentName}</td><td className="px-3 py-2 font-mono">{account.studentNo}</td><td className="px-3 py-2">{[account.gradeLevel, account.section].filter(Boolean).join(" · ") || "Unassigned"}</td><td className="px-3 py-2">{account.schoolYear}</td><td className="px-3 py-2 text-right font-mono">{money(account.balanceCents)}</td><td className="px-3 py-2 capitalize">{account.status.replace(/_/g, " ")}</td></tr>)}</tbody></table><PaginationControls currentPage={report.data.currentPage} lastPage={report.data.lastPage} perPage={report.data.perPage} total={report.data.total} label="accounts" busy={report.isFetching} onPageChange={tableFilters.setPage} onPerPageChange={tableFilters.changePerPage} /></div>)}
    </Card>
  </>;
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(cents / 100);
}
