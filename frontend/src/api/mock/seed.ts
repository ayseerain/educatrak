import rawDatabase from "./mock-db.json";
import type { StudentGender } from "@/lib/types";

export type RelativeDate = { daysAgo?: number; daysFromNow?: number; time?: string };
export type RawMockDatabase = typeof rawDatabase;
export const rawMockDatabase = rawDatabase;

export type MockStudentRecord = Omit<RawMockDatabase["students"][number], "dateOfBirth" | "gender" | "residentialAddress"> & {
  dateOfBirth?: string | null;
  gender?: StudentGender | null;
  residentialAddress?: string | null;
};

export type MockGuardianRecord = Omit<RawMockDatabase["guardians"][number], "email"> & { email: string | null };

export interface SeededMockDatabase extends Omit<RawMockDatabase, "students" | "guardians" | "installments" | "payments" | "voidRequests" | "notificationAttempts" | "backupRuns"> {
  students: MockStudentRecord[];
  guardians: MockGuardianRecord[];
  installments: Array<Omit<RawMockDatabase["installments"][number], "due"> & { dueDate: string }>;
  payments: Array<Omit<RawMockDatabase["payments"][number], "paidOn"> & { paidOn: string }>;
  voidRequests: Array<Omit<RawMockDatabase["voidRequests"][number], "requestedAt"> & { requestedAt: string }>;
  notificationAttempts: Array<Omit<RawMockDatabase["notificationAttempts"][number], "sentAt"> & { sentAt: string }>;
  backupRuns: Array<Omit<RawMockDatabase["backupRuns"][number], "occurred"> & { occurredAt: string }>;
}

function manilaDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function resolveRelativeDate(value: RelativeDate, today: string): string {
  const days = (value.daysFromNow ?? 0) - (value.daysAgo ?? 0);
  const [year, month, day] = today.split("-").map(Number);
  const base = new Date(Date.UTC(year!, month! - 1, day!));
  base.setUTCDate(base.getUTCDate() + days);
  const date = base.toISOString().slice(0, 10);
  return value.time ? `${date}T${value.time}:00+08:00` : date;
}

/** Resolves the hand-edited raw fixture without mutating it. */
export function seedMockDatabase(today = manilaDate()): SeededMockDatabase {
  const copy = JSON.parse(JSON.stringify(rawDatabase)) as RawMockDatabase;
  return {
    ...copy,
    students: copy.students.map((student) => ({ ...student, gender: student.gender as StudentGender })),
    installments: copy.installments.map((installment) => ({
      ...installment,
      dueDate: resolveRelativeDate(installment.due, today),
    })),
    payments: copy.payments.map((payment) => ({
      ...payment,
      paidOn: resolveRelativeDate(payment.paidOn, today),
    })),
    voidRequests: copy.voidRequests.map((request) => ({
      ...request,
      requestedAt: resolveRelativeDate(request.requestedAt, today),
    })),
    notificationAttempts: copy.notificationAttempts.map((notification) => ({
      ...notification,
      sentAt: resolveRelativeDate(notification.sentAt, today),
    })),
    backupRuns: copy.backupRuns.map((backup) => ({
      ...backup,
      occurredAt: resolveRelativeDate(backup.occurred, today),
    })),
  };
}

export function defaultMockToday(): string {
  return manilaDate();
}
