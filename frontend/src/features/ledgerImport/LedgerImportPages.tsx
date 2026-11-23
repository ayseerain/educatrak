import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SortableHeader, TABLE_BODY_CELL_CLASS, TABLE_CLASS, TABLE_SCROLL_CLASS, useTableSort } from "@/components/ui/Table";
import { useClientPagination } from "@/components/ui/useClientPagination";
import {
  cancelLedgerImport,
  confirmLedgerImport,
  getLedgerImport,
  LEDGER_COLUMNS,
  ledgerErrorReportUrl,
  listLedgerImports,
  readCsvHeader,
  readFileStart,
  rejectLedgerImport,
  submitLedgerImport,
  uploadLedgerImport,
  type LedgerColumn,
  type LedgerImportBatch,
  type LedgerImportMeta,
  type LedgerImportRow,
} from "@/api/ledgerImportApi";
import { formatDateTime } from "@/lib/dates";
import { centavos, format as formatMoney } from "@/lib/money";
import { can } from "@/lib/permissions";
import { sortTableRows } from "@/lib/tableSort";
import type { AuthenticatedUser } from "@/lib/types";

const BATCH_STATUS_LABEL: Record<LedgerImportBatch["status"], string> = {
  previewed: "Draft",
  submitted: "Pending accounting review",
  confirmed: "Recorded",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const ROW_STATUS_LABEL: Record<LedgerImportRow["status"], string> = {
  eligible: "Eligible",
  invalid: "Invalid",
  duplicate: "Duplicate",
  conflict: "Conflict",
};

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const COLUMN_LABEL: Record<LedgerColumn, string> = {
  source_row_id: "Source row ID",
  student_lrn: "Student LRN",
  school_year: "School year",
  as_of_date: "As-of date",
  total_due_cents: "Total due (centavos)",
  total_paid_cents: "Total paid (centavos)",
  balance_cents: "Balance (centavos)",
  source_reference: "Source reference",
  notes: "Notes (optional)",
};

/** Policy notices shown on every ledger-import screen: pending cutover and storage-only recording. */
function LedgerPolicyNotice({ meta }: { meta: LedgerImportMeta }) {
  return (
    <Card className="mb-5 p-5">
      <h2 className="text-base font-semibold text-text-primary">Opening-balance import rules</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
        <li>
          {meta.cutoverPending
            ? <><span className="font-semibold text-text-primary">Cutover date pending.</span> Files can be uploaded, checked and reviewed, but Accounting cannot record any balances until the school's finance authority approves the cutover date.</>
            : <>Approved cutover date: <span className="font-semibold text-text-primary">{meta.cutoverDate}</span> (Asia/Manila). Rows dated after it are invalid.</>}
        </li>
        <li>Recording keeps confirmed opening balances for reconciliation only. It does not change billing accounts, installments, payments, receipts, reports or reminders yet; that step needs an approved accounting mapping.</li>
        <li>Imports never create students. Rows for a student who already has a billing account for that school year are flagged as conflicts and are not recorded.</li>
      </ul>
    </Card>
  );
}

export function LedgerImportListPage({ user }: { user: AuthenticatedUser }) {
  const batches = useQuery({ queryKey: ["ledger-imports"], queryFn: listLedgerImports });
  const canPrepare = can(user, "ledger.import.prepare");
  const { sort, toggle } = useTableSort();
  const rows = sortTableRows(batches.data?.data ?? [], sort, (batch, key) => {
    if (key === "file") return batch.filename;
    if (key === "status") return BATCH_STATUS_LABEL[batch.status];
    if (key === "rows") return batch.summary.rowCount;
    if (key === "eligible") return batch.summary.eligibleCount;
    return batch.createdAt;
  });
  const pagination = useClientPagination(rows, "batches");

  return (
    <>
      <PageHeader
        title="Opening-balance import"
        description={canPrepare ? "Upload a ledger CSV, check every row, and submit it for Accounting review." : "Review submitted opening-balance batches and record their eligible rows."}
      />
      {batches.isPending && <LoadingState message="Loading import batches…" layout="table" columns={5} />}
      {batches.isError && <ErrorState message={batches.error.message} onRetry={() => void batches.refetch()} />}
      {batches.data && (
        <>
          <LedgerPolicyNotice meta={batches.data.meta} />
          {canPrepare && <LedgerUploadCard />}
          <Card className="p-0">
            <h2 className="border-b border-border px-5 py-3 text-base font-semibold text-text-primary">{canPrepare ? "Your batches" : "Submitted batches"}</h2>
            {rows.length === 0 ? <EmptyState message={canPrepare ? "No import batch has been uploaded yet." : "No batch has been submitted for review."} /> : (
              <div className={TABLE_SCROLL_CLASS}>
                <table className={`${TABLE_CLASS} min-w-[44rem]`}>
                  <caption className="sr-only">Opening-balance import batches</caption>
                  <thead>
                    <tr className="border-b border-border">
                      <SortableHeader sortKey="file" sort={sort} onSort={toggle}>File</SortableHeader>
                      <SortableHeader sortKey="status" sort={sort} onSort={toggle} className="w-56">Status</SortableHeader>
                      <SortableHeader sortKey="rows" sort={sort} onSort={toggle} className="w-24 text-right">Rows</SortableHeader>
                      <SortableHeader sortKey="eligible" sort={sort} onSort={toggle} className="w-24 text-right">Eligible</SortableHeader>
                      <SortableHeader sortKey="uploaded" sort={sort} onSort={toggle} className="w-48">Uploaded</SortableHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.items.map((batch) => (
                      <tr key={batch.id} className="border-b border-border last:border-b-0 hover:bg-surface">
                        <th scope="row" className={`${TABLE_BODY_CELL_CLASS} truncate text-left font-normal`}>
                          <Link to={`/import/${batch.id}`} className="font-semibold text-brand-green-dark transition-colors duration-150 hover:text-brand-green motion-reduce:transition-none">{batch.filename}</Link>
                        </th>
                        <td className={TABLE_BODY_CELL_CLASS}><StatusBadge status={BATCH_STATUS_LABEL[batch.status]} /></td>
                        <td className={`${TABLE_BODY_CELL_CLASS} text-right tabular-nums`}>{batch.summary.rowCount}</td>
                        <td className={`${TABLE_BODY_CELL_CLASS} text-right tabular-nums`}>{batch.summary.eligibleCount}</td>
                        <td className={TABLE_BODY_CELL_CLASS}>{batch.createdAt ? formatDateTime(batch.createdAt) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {rows.length > 0 && pagination.controls}
          </Card>
        </>
      )}
    </>
  );
}

function LedgerUploadCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<LedgerColumn, string>>>({});
  const [fileError, setFileError] = useState("");
  const upload = useMutation({
    mutationFn: () => uploadLedgerImport(file as File, mapping),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["ledger-imports"] });
      navigate(`/import/${result.data.id}`);
    },
  });

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null;
    setFile(chosen);
    setFileError("");
    upload.reset();
    if (!chosen) { setHeaders([]); return; }
    const found = readCsvHeader(await readFileStart(chosen));
    setHeaders(found);
    if (found.length === 0) setFileError("The file has no header row.");
    const lower = new Map(found.map((header) => [header.toLowerCase(), header]));
    setMapping(Object.fromEntries(LEDGER_COLUMNS.map((column) => [column, lower.get(column) ?? ""])) as Partial<Record<LedgerColumn, string>>);
  }

  const unmapped = LEDGER_COLUMNS.filter((column) => column !== "notes" && !mapping[column]);
  const chosenHeaders = Object.values(mapping).filter(Boolean);
  const duplicateMapping = new Set(chosenHeaders).size !== chosenHeaders.length;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setFileError("Choose a CSV file."); return; }
    if (unmapped.length > 0 || duplicateMapping) return;
    upload.mutate();
  }

  return (
    <Card className="mb-5 p-5">
      <h2 className="text-base font-semibold text-text-primary">Upload a ledger file</h2>
      <p className="mt-1 text-sm text-text-secondary">CSV only, up to 2,000 rows. Amounts are whole centavos (₱1.00 = 100). Nothing is recorded until a different Accounting user reviews it.</p>
      <form className="mt-4 space-y-4" onSubmit={submit} noValidate>
        <label className="block text-sm font-medium text-text-primary">
          Ledger CSV file <span aria-hidden="true">*</span>
          <input type="file" accept=".csv,text/csv" required aria-invalid={Boolean(fileError)} aria-describedby={fileError ? "ledger-file-error" : undefined} onChange={(event) => void chooseFile(event)} className="form-control mt-1 w-full cursor-pointer py-2" />
        </label>
        {fileError && <p id="ledger-file-error" role="alert" className="text-sm text-status-error">{fileError}</p>}
        {headers.length > 0 && (
          <fieldset>
            <legend className="text-sm font-semibold text-text-primary">Match the file's columns</legend>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {LEDGER_COLUMNS.map((column) => (
                <label key={column} className="text-sm font-medium text-text-primary">
                  {COLUMN_LABEL[column]}
                  <span className="mt-1 block">
                    <DropdownSelect
                      aria-label={COLUMN_LABEL[column]}
                      aria-invalid={column !== "notes" && !mapping[column]}
                      value={mapping[column] ?? ""}
                      options={[{ value: "", label: column === "notes" ? "Not in file" : "Choose a column" }, ...headers.map((header) => ({ value: header, label: header }))]}
                      onChange={(value) => setMapping((current) => ({ ...current, [column]: value }))}
                      className="w-full"
                    />
                  </span>
                </label>
              ))}
            </div>
            {unmapped.length > 0 && <p role="alert" className="mt-2 text-sm text-status-error">Match every required column: {unmapped.map((column) => COLUMN_LABEL[column]).join(", ")}.</p>}
            {duplicateMapping && <p role="alert" className="mt-2 text-sm text-status-error">Each file column can be matched only once.</p>}
          </fieldset>
        )}
        {upload.isError && <p role="alert" className="text-sm text-status-error">{upload.error.message}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={upload.isPending}>{upload.isPending ? "Checking file…" : "Check file"}</Button>
        </div>
      </form>
    </Card>
  );
}

export function LedgerImportDetailPage({ user }: { user: AuthenticatedUser }) {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const batch = useQuery({ queryKey: ["ledger-import", id], queryFn: () => getLedgerImport(id) });
  const [rowFilter, setRowFilter] = useState<"all" | LedgerImportRow["status"]>("all");
  const [dialog, setDialog] = useState<"confirm" | "reject" | "cancel" | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const { sort, toggle } = useTableSort();
  const refresh = (data: { data: LedgerImportBatch; meta: LedgerImportMeta }) => {
    queryClient.setQueryData(["ledger-import", id], data);
    void queryClient.invalidateQueries({ queryKey: ["ledger-imports"] });
    setDialog(null);
  };
  const action = useMutation({
    mutationFn: async (kind: "submit" | "cancel" | "confirm" | "reject") => {
      const current = batch.data!.data;
      if (kind === "submit") return submitLedgerImport(current.id);
      if (kind === "cancel") return cancelLedgerImport(current.id);
      if (kind === "reject") return rejectLedgerImport(current.id, rejectNote.trim());
      return confirmLedgerImport(current);
    },
    onSuccess: refresh,
    onError: () => void batch.refetch(),
  });

  const allRows = batch.data?.data.rows ?? [];
  const filtered = rowFilter === "all" ? allRows : allRows.filter((row) => row.status === rowFilter);
  const sorted = sortTableRows(filtered, sort, (row, key) => key === "line" ? row.line : key === "status" ? row.status : key === "balance" ? Number(row.values.balance_cents) || 0 : row.values[key as LedgerColumn] ?? "");
  const pagination = useClientPagination(sorted, "rows");

  if (batch.isPending) return <LoadingState message="Loading import batch…" layout="table" columns={8} />;
  if (batch.isError) return <ErrorState message={batch.error.message} onRetry={() => void batch.refetch()} />;

  const { data: current, meta } = batch.data;
  const summary = current.summary;
  const notEligible = summary.rowCount - summary.eligibleCount;
  const isPreparer = can(user, "ledger.import.prepare") && current.preparedBy === user.id;
  const isReviewer = can(user, "ledger.import.review");
  const confirmBlocker = meta.cutoverPending
    ? "Recording is unavailable until the cutover date is approved and configured."
    : summary.eligibleCount === 0 ? "There are no eligible rows to record." : null;

  const headerActions = (
    <>
      {notEligible > 0 && <a href={ledgerErrorReportUrl(current.id)} download className={buttonVariants({ variant: "secondary" })}>Download error report</a>}
      {isPreparer && current.status === "previewed" && <>
        <Button type="button" variant="secondary" onClick={() => setDialog("cancel")}>Cancel batch</Button>
        <Button type="button" disabled={summary.eligibleCount === 0 || action.isPending} onClick={() => action.mutate("submit")}>Submit for review</Button>
      </>}
      {isReviewer && current.status === "submitted" && <>
        <Button type="button" variant="secondary" onClick={() => { setRejectNote(""); setDialog("reject"); }}>Reject batch</Button>
        <Button type="button" disabled={confirmBlocker !== null} onClick={() => setDialog("confirm")}>Record eligible rows</Button>
      </>}
    </>
  );

  return (
    <>
      <PageHeader title={current.filename} description="Opening-balance import batch" backTo="/import" backLabel="Back to imports" action={headerActions} />
      <LedgerPolicyNotice meta={meta} />
      {action.isError && <p role="alert" className="mb-4 text-sm text-status-error">{action.error.message}</p>}
      {isPreparer && current.status === "previewed" && summary.eligibleCount === 0 && <p className="mb-4 text-sm text-text-secondary">This batch has no eligible rows, so it cannot be submitted. Correct the file and upload it again.</p>}
      {isReviewer && current.status === "submitted" && confirmBlocker && <p className="mb-4 text-sm text-text-secondary">{confirmBlocker}</p>}

      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">Validation summary</h2>
          <StatusBadge status={BATCH_STATUS_LABEL[current.status]} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
          {([["Rows", summary.rowCount], ["Eligible", summary.eligibleCount], ["Invalid", summary.invalidCount], ["Duplicate", summary.duplicateCount], ["Conflict", summary.conflictCount]] as const).map(([label, value]) => (
            <div key={label}><dt className="font-medium text-text-secondary">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-text-primary">{value}</dd></div>
          ))}
        </dl>
        {current.status === "confirmed" && <p className="mt-4 text-sm text-text-primary">Recorded {countLabel(summary.recordedCount ?? 0, "opening balance", "opening balances")}; {countLabel(summary.excludedCount ?? 0, "row was", "rows were")} excluded and stay unrecorded.</p>}
        <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
          <div><dt className="font-medium text-text-secondary">Uploaded</dt><dd className="mt-1 text-text-primary">{current.createdAt ? formatDateTime(current.createdAt) : "—"}</dd></div>
          <div><dt className="font-medium text-text-secondary">Submitted</dt><dd className="mt-1 text-text-primary">{current.submittedAt ? formatDateTime(current.submittedAt) : "Not submitted"}</dd></div>
          <div><dt className="font-medium text-text-secondary">Reviewed</dt><dd className="mt-1 text-text-primary">{current.reviewedAt ? formatDateTime(current.reviewedAt) : "Not reviewed"}</dd></div>
          {current.reviewNote && <div className="sm:col-span-3"><dt className="font-medium text-text-secondary">Review note</dt><dd className="mt-1 text-text-primary">{current.reviewNote}</dd></div>}
          <div className="sm:col-span-3"><dt className="font-medium text-text-secondary">File SHA-256</dt><dd className="mt-1 break-all font-mono text-xs text-text-primary">{current.fileSha256}</dd></div>
        </dl>
      </Card>

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-text-primary">Rows</h2>
          <DropdownSelect
            aria-label="Show rows"
            value={rowFilter}
            options={[{ value: "all", label: "All rows" }, ...(["eligible", "invalid", "duplicate", "conflict"] as const).map((status) => ({ value: status, label: ROW_STATUS_LABEL[status] }))]}
            onChange={(value) => { setRowFilter(value); pagination.setPage(1); }}
            className="w-44"
          />
        </div>
        {sorted.length === 0 ? <EmptyState message="No rows match this filter." /> : (
          <div className={TABLE_SCROLL_CLASS}>
            <table className={`${TABLE_CLASS} min-w-[60rem]`}>
              <caption className="sr-only">Rows in this import batch</caption>
              <thead>
                <tr className="border-b border-border">
                  <SortableHeader sortKey="line" sort={sort} onSort={toggle} className="w-20">Line</SortableHeader>
                  <SortableHeader sortKey="status" sort={sort} onSort={toggle} className="w-32">Status</SortableHeader>
                  <SortableHeader sortKey="source_row_id" sort={sort} onSort={toggle} label="Source row" className="w-28">Source row</SortableHeader>
                  <SortableHeader sortKey="student_lrn" sort={sort} onSort={toggle} className="w-36">LRN</SortableHeader>
                  <SortableHeader sortKey="school_year" sort={sort} onSort={toggle} className="w-32">School year</SortableHeader>
                  <SortableHeader sortKey="balance" sort={sort} onSort={toggle} className="w-32 text-right">Balance</SortableHeader>
                  <SortableHeader sortKey="errors" sort={sort} onSort={toggle}>Findings</SortableHeader>
                </tr>
              </thead>
              <tbody>
                {pagination.items.map((row) => (
                  <tr key={row.line} className="border-b border-border last:border-b-0 align-top">
                    <th scope="row" className={`${TABLE_BODY_CELL_CLASS} text-left font-normal tabular-nums`}>{row.line}</th>
                    <td className={TABLE_BODY_CELL_CLASS}><StatusBadge status={row.outcome === "recorded" ? "Recorded" : ROW_STATUS_LABEL[row.status]} /></td>
                    <td className={`${TABLE_BODY_CELL_CLASS} truncate`}>{row.values.source_row_id || "—"}</td>
                    <td className={`${TABLE_BODY_CELL_CLASS} tabular-nums`}>{row.values.student_lrn || "—"}</td>
                    <td className={TABLE_BODY_CELL_CLASS}>{row.values.school_year || "—"}</td>
                    <td className={`${TABLE_BODY_CELL_CLASS} text-right tabular-nums`}>{/^\d{1,15}$/.test(row.values.balance_cents) ? formatMoney(centavos(Number(row.values.balance_cents))) : row.values.balance_cents || "—"}</td>
                    <td className={`${TABLE_BODY_CELL_CLASS} text-text-secondary`}>{row.errors.length === 0 ? "No issues" : row.errors.join(" ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sorted.length > 0 && pagination.controls}
      </Card>

      <LedgerDialog open={dialog === "confirm"} onClose={() => setDialog(null)} title="Record eligible opening balances?">
        <p className="mt-2 text-sm text-text-secondary">This records {countLabel(summary.eligibleCount, "opening balance", "opening balances")} for reconciliation and excludes {countLabel(notEligible, "row", "rows")}. Billing accounts, payments and receipts do not change. This cannot be undone.</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-text-secondary">Will be recorded</dt><dd className="font-semibold tabular-nums">{summary.eligibleCount}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-text-secondary">Excluded (invalid, duplicate, conflict)</dt><dd className="font-semibold tabular-nums">{notEligible}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-text-secondary">Cutover date</dt><dd className="font-semibold">{meta.cutoverDate}</dd></div>
        </dl>
        {action.isError && <p role="alert" className="mt-3 text-sm text-status-error">{action.error.message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
          <Button type="button" disabled={action.isPending || confirmBlocker !== null} onClick={() => action.mutate("confirm")}>{action.isPending ? "Recording…" : `Record ${countLabel(summary.eligibleCount, "row", "rows")}`}</Button>
        </div>
      </LedgerDialog>

      <LedgerDialog open={dialog === "reject"} onClose={() => setDialog(null)} title="Reject this batch?">
        <p className="mt-2 text-sm text-text-secondary">Nothing is recorded. The Cashier must correct the file and upload a new batch.</p>
        <label className="mt-4 block text-sm font-medium text-text-primary">
          Reason for rejection <span aria-hidden="true">*</span>
          <textarea value={rejectNote} onChange={(event) => setRejectNote(event.target.value)} rows={3} maxLength={1000} aria-invalid={rejectNote.trim().length > 0 && rejectNote.trim().length < 10} aria-describedby="reject-hint" className="form-control mt-1 w-full" />
        </label>
        <p id="reject-hint" className="mt-1 text-xs text-text-secondary">At least 10 characters.</p>
        {action.isError && <p role="alert" className="mt-3 text-sm text-status-error">{action.error.message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setDialog(null)}>Keep reviewing</Button>
          <Button type="button" variant="destructive" disabled={action.isPending || rejectNote.trim().length < 10} onClick={() => action.mutate("reject")}>{action.isPending ? "Rejecting…" : "Reject batch"}</Button>
        </div>
      </LedgerDialog>

      <LedgerDialog open={dialog === "cancel"} onClose={() => setDialog(null)} title="Cancel this batch?">
        <p className="mt-2 text-sm text-text-secondary">The batch stays in your history as cancelled and is never sent for review.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setDialog(null)}>Keep batch</Button>
          <Button type="button" variant="destructive" disabled={action.isPending} onClick={() => action.mutate("cancel")}>Cancel batch</Button>
        </div>
      </LedgerDialog>
    </>
  );
}

function LedgerDialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-text-primary/40" />
        <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-6 shadow-raised">
          <Dialog.Title className="text-lg font-semibold text-text-primary">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
