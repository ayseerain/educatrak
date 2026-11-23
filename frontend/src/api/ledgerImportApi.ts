import { request } from "@/api/cashierApi";

/** Opening-balance ledger import (SRS v3.0). Confirmation is storage-only: it never changes billing accounts. */
export type LedgerBatchStatus = "previewed" | "submitted" | "confirmed" | "rejected" | "cancelled";
export type LedgerRowStatus = "eligible" | "invalid" | "duplicate" | "conflict";

export const LEDGER_COLUMNS = ["source_row_id", "student_lrn", "school_year", "as_of_date", "total_due_cents", "total_paid_cents", "balance_cents", "source_reference", "notes"] as const;
export type LedgerColumn = (typeof LEDGER_COLUMNS)[number];

export interface LedgerImportMeta {
  cutoverDate: string | null;
  cutoverPending: boolean;
  postingMode: "storage_only";
  columns: LedgerColumn[];
}

export interface LedgerImportRow {
  line: number;
  status: LedgerRowStatus;
  outcome: "recorded" | "excluded" | null;
  values: Record<LedgerColumn, string>;
  errors: string[];
}

export interface LedgerImportBatch {
  id: string;
  filename: string;
  fileSha256: string;
  status: LedgerBatchStatus;
  summary: {
    rowCount: number;
    eligibleCount: number;
    invalidCount: number;
    duplicateCount: number;
    conflictCount: number;
    recordedCount: number | null;
    excludedCount: number | null;
  };
  preparedBy: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rows?: LedgerImportRow[];
}

interface BatchResponse { data: LedgerImportBatch; meta: LedgerImportMeta }

export async function listLedgerImports(): Promise<{ data: LedgerImportBatch[]; meta: LedgerImportMeta }> {
  return request("/ledger-imports");
}

export async function getLedgerImport(id: string): Promise<BatchResponse> {
  return request(`/ledger-imports/${encodeURIComponent(id)}`);
}

export async function uploadLedgerImport(file: File, mapping: Partial<Record<LedgerColumn, string | null>>): Promise<BatchResponse> {
  const body = new FormData();
  body.append("file", file);
  for (const [column, source] of Object.entries(mapping)) body.append(`mapping[${column}]`, source ?? "");
  return request("/ledger-imports", { method: "POST", body });
}

export async function submitLedgerImport(id: string): Promise<BatchResponse> {
  return request(`/ledger-imports/${encodeURIComponent(id)}/submit`, { method: "POST" });
}

export async function cancelLedgerImport(id: string): Promise<BatchResponse> {
  return request(`/ledger-imports/${encodeURIComponent(id)}/cancel`, { method: "POST" });
}

export async function rejectLedgerImport(id: string, reviewNote: string): Promise<BatchResponse> {
  return request(`/ledger-imports/${encodeURIComponent(id)}/reject`, { method: "POST", body: JSON.stringify({ review_note: reviewNote }) });
}

export async function confirmLedgerImport(batch: LedgerImportBatch): Promise<BatchResponse> {
  const eligibleLines = (batch.rows ?? []).filter((row) => row.status === "eligible").map((row) => row.line);
  return request(`/ledger-imports/${encodeURIComponent(batch.id)}/confirm`, {
    method: "POST",
    body: JSON.stringify({ file_sha256: batch.fileSha256, eligible_lines: eligibleLines }),
  });
}

export function ledgerErrorReportUrl(id: string): string {
  return `/api/ledger-imports/${encodeURIComponent(id)}/error-report`;
}

/** Reads the start of a file as text (enough for the header row) without loading the whole file. */
export function readFileStart(file: File, bytes = 65536): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("The file could not be read."));
    reader.readAsText(file.slice(0, bytes));
  });
}

/** Reads only the header row so the Cashier can map school column names before upload. */
export function readCsvHeader(text: string): string[] {
  const firstLine = text.replace(/^﻿/, "").split(/\r\n|\n|\r/, 1)[0] ?? "";
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < firstLine.length; index += 1) {
    const character = firstLine[index];
    if (quoted && character === '"' && firstLine[index + 1] === '"') { current += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { cells.push(current.trim()); current = ""; }
    else current += character;
  }
  cells.push(current.trim());
  return cells.filter((cell) => cell !== "");
}
