import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getStudentStatement } from "@/api/reportApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useClientPagination } from "@/components/ui/useClientPagination";
import { downloadCsv } from "@/lib/csv";
import { can } from "@/lib/permissions";
import type { AuthenticatedUser } from "@/lib/types";

export function LiveStudentStatement({ user, studentId }: { user: AuthenticatedUser; studentId: string }) {
  const statement = useQuery({ queryKey: ["student-statement", studentId], queryFn: () => getStudentStatement(studentId), enabled: Boolean(studentId) });
  return <>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><Link to="/reports" className="text-sm text-brand-green-dark underline">Back to reports</Link><h1 className="mt-2 text-2xl font-semibold">Statement</h1><p className="mt-1 text-sm text-text-secondary">Current school-year fees, schedule, payments, and balance.</p></div>
      {statement.data && <div className="flex gap-2">
        {can(user, "report.view") && <Button type="button" variant="secondary" onClick={() => {
          const data = statement.data!;
          const rows = [
            ...data.items.map((item) => ["Fee", item.name, item.category, "", money(item.amountCents), "", ""]),
            ...data.installments.map((item) => ["Installment", item.label, "", item.dueDate, money(item.amountCents), money(item.paidCents), item.status.replace(/_/g, " ")]),
            ...data.payments.map((item) => ["Payment", item.receiptNo ?? "Unavailable", "", item.paidOn, money(item.amountCents), "", item.status.replace(/_/g, " ")]),
            ["Balance", "", "", "", money(data.balanceCents), "", ""],
          ];
          const safeStudentNo = data.studentNo.replace(/[^A-Za-z0-9_-]/g, "_");
          downloadCsv(`student-statement-${safeStudentNo}.csv`, ["Record type", "Name / receipt", "Category", "Date", "Amount", "Paid", "Status"], rows);
        }}>Export for Excel (.csv)</Button>}
        {can(user, "statement.print") && <Button type="button" variant="secondary" onClick={() => window.print()}>Print</Button>}
      </div>}
    </div>
    {statement.isPending && <LoadingState message="Loading student statement…" />}
    {statement.isError && <ErrorState message={statement.error.message} onRetry={() => void statement.refetch()} />}
    {statement.data && <>
      <Card className="mb-5"><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-sm text-text-secondary">Student</p><p className="font-semibold">{statement.data.studentName} · {statement.data.studentNo}</p></div><div><p className="text-sm text-text-secondary">School year</p><p className="font-semibold">{statement.data.schoolYear}</p></div></div><div className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-3"><Metric label="Total due" cents={statement.data.totalDueCents} /><Metric label="Total paid" cents={statement.data.totalPaidCents} /><Metric label="Balance" cents={statement.data.balanceCents} /></div></Card>
      <DataTable title="Fees" headers={["Item", "Category", "Amount"]} rows={statement.data.items.map((item) => [item.name, item.category, money(item.amountCents)])} />
      <DataTable title="Installment schedule" headers={["Installment", "Due date", "Amount", "Paid", "Status"]} rows={statement.data.installments.map((item) => [item.label, item.dueDate, money(item.amountCents), money(item.paidCents), item.status.replace(/_/g, " ")])} />
      <DataTable title="Payments" headers={["Paid on", "Receipt", "Amount", "Status"]} rows={statement.data.payments.map((item) => [item.paidOn, item.receiptNo ?? "Unavailable", money(item.amountCents), item.status.replace(/_/g, " ")])} />
    </>}
  </>;
}

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  const pagination = useClientPagination(rows, title.toLowerCase());
  return <Card className="mb-5 overflow-x-auto p-0"><div className="border-b border-border p-4"><h2 className="font-semibold">{title}</h2></div>{rows.length === 0 ? <p className="p-4 text-sm text-text-secondary">No {title.toLowerCase()} are recorded for this account.</p> : <><table className="w-full min-w-[600px] border-collapse text-left text-sm"><thead><tr className="border-b bg-surface text-xs uppercase text-text-secondary">{headers.map((header) => <th key={header} scope="col" className="px-4 py-3">{header}</th>)}</tr></thead><tbody>{pagination.items.map((row, index) => <tr key={index} className="border-b align-top last:border-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3">{cell}</td>)}</tr>)}</tbody></table>{pagination.controls}</>}</Card>;
}

function Metric({ label, cents }: { label: string; cents: number }) {
  return <div><p className="text-sm text-text-secondary">{label}</p><p className="font-semibold">{money(cents)}</p></div>;
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(cents / 100);
}
