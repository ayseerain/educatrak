import { isLiveCashierApiEnabled } from "@/api/cashierApi";

export type StaffRole = "super_admin" | "admin" | "cashier" | "accounting" | "auditor" | "registrar";

export interface StaffUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: StaffRole;
  active: boolean;
  archivedAt: string | null;
  anonymizeAt: string | null;
  archivedBy: string | null;
  isProtected: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export interface StaffUserInput {
  username: string;
  full_name: string;
  email?: string;
  role: StaffRole;
}

interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() ?? "GET";
  const csrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method)
    ? await csrfHeaders()
    : {};
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...csrf, ...init?.headers },
  });
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & T;
  if (!response.ok) {
    const detail = body.errors ? Object.values(body.errors).flat()[0] : undefined;
    throw new Error(detail ?? body.message ?? "The account request could not be completed.");
  }
  return body as T;
}

async function csrfHeaders(): Promise<Record<string, string>> {
  await fetch("/sanctum/csrf-cookie", { credentials: "include" });
  const token = document.cookie.split("; ").find((cookie) => cookie.startsWith("XSRF-TOKEN="))?.split("=")[1];
  return token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {};
}

export interface StaffUserPage {
  data: StaffUser[];
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export async function listStaffUsers(filters: { query?: string; role?: StaffRole | ""; status?: "active" | "inactive" | "archived"; sort?: "name" | "created_at"; direction?: "asc" | "desc"; dateFrom?: string; dateTo?: string; page?: number; perPage?: number } = {}): Promise<StaffUserPage> {
  if (!isLiveCashierApiEnabled()) return { data: [], currentPage: 1, lastPage: 1, perPage: filters.perPage ?? 10, total: 0 };
  const query = new URLSearchParams();
  if (filters.query) query.set("query", filters.query);
  if (filters.role) query.set("role", filters.role);
  if (filters.status) query.set("status", filters.status);
  if (filters.sort) query.set("sort", filters.sort);
  if (filters.direction) query.set("direction", filters.direction);
  if (filters.dateFrom) query.set("date_from", filters.dateFrom);
  if (filters.dateTo) query.set("date_to", filters.dateTo);
  if (filters.page) query.set("page", String(filters.page));
  query.set("per_page", String(filters.perPage ?? 10));
  const response = await request<{ data: StaffUser[]; meta: Omit<StaffUserPage, "data"> }>(`/admin/users?${query}`);
  return { data: response.data, ...response.meta };
}

export async function createStaffUser(input: StaffUserInput): Promise<{ user: StaffUser; temporaryPassword: string }> {
  const response = await request<{ data: StaffUser; temporaryPassword: string }>("/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return { user: response.data, temporaryPassword: response.temporaryPassword };
}

export async function updateStaffUser(id: string, input: Partial<Pick<StaffUserInput, "full_name" | "email" | "role">> & { active?: boolean }): Promise<StaffUser> {
  const response = await request<{ data: StaffUser }>(`/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function resetStaffUserPassword(id: string): Promise<{ user: StaffUser; temporaryPassword: string }> {
  const response = await request<{ data: StaffUser; temporaryPassword: string }>(`/admin/users/${encodeURIComponent(id)}/reset-password`, {
    method: "POST",
  });
  return { user: response.data, temporaryPassword: response.temporaryPassword };
}

export async function archiveStaffUser(id: string): Promise<StaffUser> {
  const response = await request<{ data: StaffUser }>(`/admin/users/${encodeURIComponent(id)}/archive`, { method: "POST" });
  return response.data;
}

export async function restoreStaffUser(id: string): Promise<StaffUser> {
  const response = await request<{ data: StaffUser }>(`/admin/users/${encodeURIComponent(id)}/restore`, { method: "POST" });
  return response.data;
}
