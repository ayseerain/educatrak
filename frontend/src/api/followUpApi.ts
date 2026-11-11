import { request } from "@/api/cashierApi";

export interface FollowUpItem {
  id: string;
  studentId: string | null;
  lrn: string | null;
  studentName: string;
  grade: string | null;
  section: string | null;
  schoolYear: string | null;
  installment: string;
  dueDate: string;
  amountDueCents: number;
  daysOverdue: number;
  status: "due_soon" | "overdue";
  guardians: { name: string; email: string | null; mobile: string | null; emailStatus: string }[];
  lastReminderAt: string | null;
}

export interface FollowUpFilters {
  status?: "due_soon" | "overdue";
  grade?: string;
  section?: string;
  search?: string;
  sort?: "due_date" | "amount_due" | "days_overdue";
  direction?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

export interface ReminderDeliveryResult {
  id: string;
  installmentId: string;
  channel: "email" | "sms";
  recipient: string | null;
  status: "queued" | "failed" | "not_sent";
  failureReason: string | null;
}

export async function sendReminders(input: { idempotencyKey: string; installmentIds: string[]; channels: ("email" | "sms")[] }): Promise<{
  data: ReminderDeliveryResult[];
  summary: { queued: number; failed: number; notSent: number };
}> {
  return request("/follow-up/reminders", {
    method: "POST",
    body: JSON.stringify({ idempotency_key: input.idempotencyKey, installment_ids: input.installmentIds, channels: input.channels }),
  });
}

export async function getFollowUpItems(filters: FollowUpFilters = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key === "perPage") continue;
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  query.set("per_page", String(filters.perPage ?? 10));
  const response = await request<{
    data: FollowUpItem[];
    meta: { currentPage: number; lastPage: number; total: number; perPage: number; today: string };
  }>(`/follow-up${query.size ? `?${query}` : ""}`);
  return { ...response, ...response.meta };
}
