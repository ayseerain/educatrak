import { students } from "@/features/students/mockStudents";

export const mockGuardianEmail = "guardian@example.test";
export const mockGuardianMobile = "0917 555 0102";

export const notificationRows = [
  {
    student: students[0]!.name,
    type: "Payment confirmation",
    channel: "Email",
    recipient: mockGuardianEmail,
    loadFee: "—",
    status: "Queued",
    attempts: "1",
  },
  {
    student: students[1]!.name,
    type: "Payment confirmation",
    channel: "SMS",
    recipient: "0917 555 0101",
    loadFee: "Not configured",
    status: "Sent",
    attempts: "1",
  },
  {
    student: students[2]!.name,
    type: "Reminder",
    channel: "SMS",
    recipient: "No guardian mobile number",
    loadFee: "—",
    status: "Failed",
    attempts: "0",
  },
];

export const notificationStatusOptions = [
  { value: "all", label: "All statuses" },
  ...Array.from(new Set(notificationRows.map((row) => row.status))).map(
    (status) => ({ value: status.toLowerCase(), label: status }),
  ),
];
