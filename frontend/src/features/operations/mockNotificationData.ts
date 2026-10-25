import { getMockState, getStudentById } from "@/api/mock";

export const mockGuardianEmail = "guardian@example.test";
export const mockGuardianMobile = "0917 555 0102";

export const notificationRows = getMockState().notificationAttempts.map((row) => ({
  student: getStudentById(row.studentId)?.name ?? "Unavailable student",
  type: row.type,
  channel: row.channel,
  recipient: row.recipient,
  loadFee: "—",
  status: row.status,
  attempts: String(row.attempts),
}));

export const notificationStatusOptions = [
  { value: "all", label: "All statuses" },
  ...Array.from(new Set(notificationRows.map((row) => row.status))).map((status) => ({ value: status.toLowerCase(), label: status })),
];
