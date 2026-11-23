import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LedgerImportDetailPage, LedgerImportListPage } from "@/features/ledgerImport/LedgerImportPages";
import { BackupPage } from "@/features/operations/OperationalPages";
import { can } from "@/lib/permissions";
import type { AuthenticatedUser } from "@/lib/types";

const cashier: AuthenticatedUser = { id: "7", name: "Casey Cashier (sample)", role: "cashier" };
const accounting: AuthenticatedUser = { id: "8", name: "Ari Accounting (sample)", role: "accounting" };
const administrator: AuthenticatedUser = { id: "9", name: "Ada Admin (sample)", role: "administrator" };
const superAdmin: AuthenticatedUser = { id: "1", name: "Sol Super (sample)", role: "super_admin" };

function batch(status = "submitted") {
  return {
    id: "5",
    filename: "ledger-sample.csv",
    fileSha256: "a".repeat(64),
    status,
    summary: { rowCount: 3, eligibleCount: 1, invalidCount: 1, duplicateCount: 0, conflictCount: 1, recordedCount: null, excludedCount: null },
    preparedBy: "7",
    reviewedBy: null,
    reviewNote: null,
    createdAt: "2026-11-23T10:00:00+08:00",
    submittedAt: "2026-11-23T10:05:00+08:00",
    reviewedAt: null,
    rows: [
      { line: 2, status: "eligible", outcome: null, values: { source_row_id: "R1", student_lrn: "000000009001", school_year: "SY 2025-2026", as_of_date: "2026-05-31", total_due_cents: "2000000", total_paid_cents: "1500000", balance_cents: "500000", source_reference: "Ledger p.4", notes: "" }, errors: [] },
      { line: 3, status: "invalid", outcome: null, values: { source_row_id: "R2", student_lrn: "123", school_year: "SY 2025-2026", as_of_date: "2026-05-31", total_due_cents: "10", total_paid_cents: "0", balance_cents: "10", source_reference: "Ledger p.5", notes: "" }, errors: ["student_lrn must be exactly 12 digits."] },
      { line: 4, status: "conflict", outcome: null, values: { source_row_id: "R3", student_lrn: "000000009003", school_year: "SY 2025-2026", as_of_date: "2026-05-31", total_due_cents: "10", total_paid_cents: "0", balance_cents: "10", source_reference: "Ledger p.6", notes: "" }, errors: ["The student already has a billing account for this school year."] },
    ],
  };
}

function meta(cutoverDate: string | null) {
  return { cutoverDate, cutoverPending: cutoverDate === null, postingMode: "storage_only", columns: [] };
}

function renderAt(path: string, element: React.ReactElement, routePath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[path]}><Routes><Route path={routePath} element={element} /><Route path="/import/:id" element={<p>Batch detail opened</p>} /></Routes></MemoryRouter></QueryClientProvider>);
}

describe("opening-balance ledger import", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("separates prepare and review permissions and keeps backup execution off Super Admin", () => {
    expect(can(cashier, "ledger.import.prepare")).toBe(true);
    expect(can(cashier, "ledger.import.review")).toBe(false);
    expect(can(accounting, "ledger.import.review")).toBe(true);
    expect(can(accounting, "ledger.import.prepare")).toBe(false);
    expect(can(administrator, "ledger.import.view")).toBe(false);
    expect(can(superAdmin, "backup.view")).toBe(true);
    expect(can(superAdmin, "backup.manage")).toBe(false);
  });

  it("blocks recording while the cutover date is pending", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: batch(), meta: meta(null) }) })));
    renderAt("/import/5", <LedgerImportDetailPage user={accounting} />, "/import/:id");

    expect(await screen.findByText("Cutover date pending.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record eligible rows" })).toBeDisabled();
    expect(screen.getByText("Recording is unavailable until the cutover date is approved and configured.")).toBeInTheDocument();
  });

  it("shows recorded and excluded counts and sends only the eligible lines", async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/sanctum/csrf-cookie") return { ok: true, status: 204, json: async () => ({}) };
      if (init?.method === "POST") {
        bodies.push(JSON.parse(String(init.body)));
        return { ok: true, status: 200, json: async () => ({ data: { ...batch("confirmed"), summary: { ...batch().summary, recordedCount: 1, excludedCount: 2 } }, meta: meta("2026-06-30") }) };
      }
      return { ok: true, status: 200, json: async () => ({ data: batch(), meta: meta("2026-06-30") }) };
    }));
    renderAt("/import/5", <LedgerImportDetailPage user={accounting} />, "/import/:id");

    fireEvent.click(await screen.findByRole("button", { name: "Record eligible rows" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Will be recorded").nextSibling).toHaveTextContent("1");
    expect(within(dialog).getByText("Excluded (invalid, duplicate, conflict)").nextSibling).toHaveTextContent("2");
    fireEvent.click(within(dialog).getByRole("button", { name: "Record 1 row" }));

    expect(await screen.findByText("Recorded 1 opening balance; 2 rows were excluded and stay unrecorded.")).toBeInTheDocument();
    expect(bodies[0]).toEqual({ file_sha256: "a".repeat(64), eligible_lines: [2] });
    expect(screen.getByRole("link", { name: "Download error report" })).toHaveAttribute("href", "/api/ledger-imports/5/error-report");
  });

  it("shows the cutover comparison on a conflict row and records Accounting's resolution", async () => {
    const conflictBatch = () => {
      const data = batch();
      data.rows[2] = { ...data.rows[2]!, reconciliation: { classification: "discrepancy", accountId: "44", accountBalanceCents: 1000, importedBalanceCents: 1500, differenceCents: 500, reason: "The imported balance differs from the account balance at cutover." } } as never;
      return data;
    };
    const bodies: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/sanctum/csrf-cookie") return { ok: true, status: 204, json: async () => ({}) };
      if (init?.method === "POST") {
        bodies.push({ url, body: JSON.parse(String(init.body)) });
        const data = conflictBatch();
        data.rows[2] = { ...data.rows[2]!, resolution: { resolution: "requires_correction", reason: "Fictional ledger differs.", classification: "discrepancy", differenceCents: 500, resolvedBy: "8", resolvedAt: "2026-11-23T11:00:00+08:00" } } as never;
        return { ok: true, status: 200, json: async () => ({ data, meta: meta("2026-06-30") }) };
      }
      return { ok: true, status: 200, json: async () => ({ data: conflictBatch(), meta: meta("2026-06-30") }) };
    }));
    renderAt("/import/5", <LedgerImportDetailPage user={accounting} />, "/import/:id");

    expect(await screen.findByText(/Discrepancy: imported ₱15\.00, account at cutover ₱10\.00, difference ₱5\.00\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByText("Already accounted for")).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: "Fictional ledger differs." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Record resolution" }));

    expect(await screen.findByText(/Resolved: Refer to approved correction procedure/)).toBeInTheDocument();
    expect(bodies[0]).toEqual({ url: "/api/ledger-imports/5/rows/4/resolution", body: { resolution: "requires_correction", reason: "Fictional ledger differs." } });
    expect(screen.queryByRole("button", { name: "Resolve" })).not.toBeInTheDocument();
  });

  it("lets the Cashier check a file with auto-matched columns", async () => {
    const uploads: FormData[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/sanctum/csrf-cookie") return { ok: true, status: 204, json: async () => ({}) };
      if (init?.method === "POST") {
        uploads.push(init.body as FormData);
        return { ok: true, status: 201, json: async () => ({ data: batch("previewed"), meta: meta(null) }) };
      }
      return { ok: true, status: 200, json: async () => ({ data: [], meta: meta(null) }) };
    }));
    renderAt("/import", <LedgerImportListPage user={cashier} />, "/import");

    const csv = "source_row_id,student_lrn,school_year,as_of_date,total_due_cents,total_paid_cents,balance_cents,source_reference,notes\nR1,000000009001,SY 2025-2026,2026-05-31,10,0,10,Ref,\n";
    const file = new File([csv], "ledger.csv", { type: "text/csv" });
    fireEvent.change(await screen.findByLabelText(/Ledger CSV file/), { target: { files: [file] } });
    expect(await screen.findByText("Match the file's columns")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check file" }));

    expect(await screen.findByText("Batch detail opened")).toBeInTheDocument();
    expect(uploads[0]?.get("mapping[student_lrn]")).toBe("student_lrn");
    expect((uploads[0]?.get("file") as File).name).toBe("ledger.csv");
  });
});

describe("live backup page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function stubBackups(available: boolean) {
    vi.stubEnv("VITE_USE_LIVE_API", "true");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [], meta: { manualBackupAvailable: available, unavailableReason: available ? null : "The backup destination is not configured, does not exist, or is not writable.", dailyAt: "21:00", timezone: "Asia/Manila", rotationEnabled: false, destinationFreeBytes: null, restoreTestRecorded: false } }) })));
  }

  it("offers Run backup now only to an Administrator when the executor is configured", async () => {
    stubBackups(true);
    const { unmount } = renderAt("/admin/backup", <BackupPage user={administrator} />, "/admin/backup");
    expect(await screen.findByRole("button", { name: "Run backup now" })).toBeInTheDocument();
    expect(screen.getByText("Off. Old backups are kept; watch the free space.")).toBeInTheDocument();
    unmount();

    renderAt("/admin/backup", <BackupPage user={superAdmin} />, "/admin/backup");
    expect(await screen.findByText("21:00 (Asia/Manila)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Run backup now" })).not.toBeInTheDocument();
  });

  it("hides the run control and explains why when the executor is not configured", async () => {
    stubBackups(false);
    renderAt("/admin/backup", <BackupPage user={administrator} />, "/admin/backup");
    await waitFor(() => expect(screen.getByText(/Unavailable: The backup destination is not configured/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Run backup now" })).not.toBeInTheDocument();
  });
});
