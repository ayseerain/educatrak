import { request } from "@/api/cashierApi";

export interface NotificationLogEntry {
  id: string;
  studentId: string;
  lrn: string | null;
  studentName: string | null;
  paymentId: string | null;
  channel: string;
  recipient: string | null;
  type: string;
  status: "queued" | "sent" | "failed" | "not_sent";
  attempts: number;
  failureReason: string | null;
  loadFeeCents: number | null;
  createdAt: string;
  sentAt: string | null;
}

export async function listNotificationLogs(filters: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  student?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<{
  data: NotificationLogEntry[];
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
}> {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.dateFrom) query.set("date_from", filters.dateFrom);
  if (filters.dateTo) query.set("date_to", filters.dateTo);
  if (filters.student) query.set("student", filters.student);
  if (filters.page) query.set("page", String(filters.page));
  query.set("per_page", String(filters.perPage ?? 10));
  const result = await request<{
    data: NotificationLogEntry[];
    meta: { currentPage: number; lastPage: number; total: number; perPage: number };
  }>(`/notifications${query.size ? `?${query}` : ""}`);
  return { ...result, ...result.meta };
}

export async function retryNotification(id: string): Promise<{ data: NotificationLogEntry }> {
  return request(`/notifications/${encodeURIComponent(id)}/retry`, { method: "POST" });
}
