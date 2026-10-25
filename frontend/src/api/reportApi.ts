import { request } from "@/api/cashierApi";

export interface DailyReport {
  date: string;
  totalCents: number;
  byMethod: { method: string; totalCents: number; transactionCount: number }[];
  byCashier: { cashierId: string; cashier: string; totalCents: number; transactionCount: number }[];
  payments: { id: string; studentNo: string; studentName: string; receiptNo: string | null; amountCents: number; method: string; status: string; cashier: string; voidStatus: string | null }[];
  voids: { id: string; paymentId: string; receiptNo: string | null; studentNo: string; studentName: string; amountCents: number; status: string; reason: string; requestedBy: string; requestedAt: string; decidedAt: string | null }[];
  meta: { currentPage: number; lastPage: number; totalPayments: number; perPage: number };
  voidMeta: { currentPage: number; lastPage: number; total: number; perPage: number };
}

export async function getDailyReport(date: string, page = 1, perPage = 10, voidPage = 1): Promise<DailyReport> {
  const query = new URLSearchParams({ date, page: String(page), per_page: String(perPage), void_page: String(voidPage) });
  const result = await request<{ data: DailyReport }>(`/reports/daily?${query}`);
  return result.data;
}

export interface StudentStatement {
  studentId: string;
  studentNo: string;
  studentName: string;
  schoolYear: string;
  totalDueCents: number;
  totalPaidCents: number;
  balanceCents: number;
  items: { name: string; category: string; amountCents: number }[];
  installments: { label: string; dueDate: string; amountCents: number; paidCents: number; status: string }[];
  payments: { receiptNo: string | null; amountCents: number; paidOn: string; status: string }[];
}

export async function getStudentStatement(studentId: string): Promise<StudentStatement> {
  const result = await request<{ data: StudentStatement }>(`/reports/students/${encodeURIComponent(studentId)}/statement`);
  return result.data;
}

export interface OutstandingAccount {
  id: string;
  studentId: string;
  studentNo: string;
  studentName: string;
  gradeLevel: string | null;
  section: string | null;
  schoolYear: string;
  balanceCents: number;
  status: string;
}

export async function getOutstandingReport(filters: {
  grade?: string;
  section?: string;
  minimumBalanceCents?: number;
  maximumBalanceCents?: number;
  overdueOnly?: boolean;
  page?: number;
  perPage?: number;
}): Promise<{ data: OutstandingAccount[]; currentPage: number; lastPage: number; total: number; perPage: number }> {
  const query = new URLSearchParams();
  if (filters.grade) query.set("grade", filters.grade);
  if (filters.section) query.set("section", filters.section);
  if (filters.minimumBalanceCents !== undefined) query.set("minimum_balance_cents", String(filters.minimumBalanceCents));
  if (filters.maximumBalanceCents !== undefined) query.set("maximum_balance_cents", String(filters.maximumBalanceCents));
  if (filters.overdueOnly) query.set("overdue_only", "1");
  if (filters.page) query.set("page", String(filters.page));
  query.set("per_page", String(filters.perPage ?? 10));
  const result = await request<{ data: OutstandingAccount[]; meta: { currentPage: number; lastPage: number; total: number; perPage: number } }>(`/reports/outstanding${query.size ? `?${query}` : ""}`);
  return { data: result.data, ...result.meta };
}
