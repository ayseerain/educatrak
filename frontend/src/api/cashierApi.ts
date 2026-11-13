import { recordMockBillingPayment } from "@/api/mock";
import { centavos } from "@/lib/money";
import type { AuthenticatedUser, Role } from "@/lib/types";

declare global {
  interface ImportMetaEnv {
    readonly VITE_USE_LIVE_API?: string;
    readonly VITE_DATA_SOURCE?: "mock" | "live";
    readonly VITE_REMINDER_DELIVERY_ENABLED?: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

export class CashierApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

export interface SavedCashPayment {
  id: string;
  receiptNo: string;
  balanceAfter: ReturnType<typeof centavos>;
  emailQueued: boolean;
  smsQueued: boolean;
  smsLoadFeeCents: ReturnType<typeof centavos> | null;
}

export type NotificationChannel = "email" | "sms";

export interface PaymentStudent {
  id: string;
  number: string;
  name: string;
  grade: string | null;
  section: string | null;
  balanceCents: number;
}

export interface PaymentContext {
  student: Pick<PaymentStudent, "id" | "number" | "name">;
  billingAccountId: string;
  balanceCents: number;
  nextInstallment: { id: string; label: string; dueDate: string; amountDueCents: number } | null;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string | null;
  lrn: string | null;
  studentGrade?: string | null;
  studentSection?: string | null;
  schoolYear?: string | null;
  billingAccountId: string;
  amountCents: number;
  method: string;
  paidOn: string;
  status: string;
  receiptNo: string | null;
  firstPrintedAt?: string | null;
  recordedAt: string | null;
  recordedBy: string | null;
  reprintCount: number;
  balanceAfterCents: number | null;
  allocations?: { installmentLabel: string; amountCents: number }[];
  notifications?: { channel: string; status: string; loggedAt: string | null }[];
  auditTrail?: { action: string; actorName: string | null; occurredAt: string | null }[];
}

export interface PaymentPage {
  data: PaymentRecord[];
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
}

function mapPayment(payment: {
  id: string; student_id: string; student_name: string | null; lrn: string | null; billing_account_id: string;
  student_grade?: string | null; student_section?: string | null; school_year?: string | null;
  amount_cents: number; method: string; paid_on: string; status: string; receipt_no: string | null;
  first_printed_at?: string | null;
  recorded_at: string | null; recorded_by: string | null; reprint_count: number; balance_after_cents: number | null;
  allocations?: { installment_label: string; amount_cents: number }[];
  notifications?: { channel: string; status: string; logged_at: string | null }[];
  audit_trail?: { action: string; actor_name: string | null; occurred_at: string | null }[];
}): PaymentRecord {
  return {
    id: payment.id,
    studentId: payment.student_id,
    studentName: payment.student_name,
    lrn: payment.lrn,
    studentGrade: payment.student_grade ?? null,
    studentSection: payment.student_section ?? null,
    schoolYear: payment.school_year ?? null,
    billingAccountId: payment.billing_account_id,
    amountCents: payment.amount_cents,
    method: payment.method,
    paidOn: payment.paid_on,
    status: payment.status,
    receiptNo: payment.receipt_no,
    firstPrintedAt: payment.first_printed_at ?? null,
    recordedAt: payment.recorded_at,
    recordedBy: payment.recorded_by,
    reprintCount: payment.reprint_count,
    balanceAfterCents: payment.balance_after_cents,
    allocations: payment.allocations?.map((allocation) => ({ installmentLabel: allocation.installment_label, amountCents: allocation.amount_cents })),
    notifications: payment.notifications?.map((notification) => ({ channel: notification.channel, status: notification.status, loggedAt: notification.logged_at })),
    auditTrail: payment.audit_trail?.map((entry) => ({ action: entry.action, actorName: entry.actor_name, occurredAt: entry.occurred_at })),
  };
}

export async function listPayments(filters: { query?: string; status?: string; dateFrom?: string; dateTo?: string; cashier?: string; method?: string; amountMinCents?: number; amountMaxCents?: number; page?: number; perPage?: number } = {}): Promise<PaymentPage> {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.status) params.set("status", filters.status);
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  if (filters.cashier) params.set("cashier", filters.cashier);
  if (filters.method) params.set("method", filters.method);
  if (filters.amountMinCents !== undefined) params.set("amount_min_cents", String(filters.amountMinCents));
  if (filters.amountMaxCents !== undefined) params.set("amount_max_cents", String(filters.amountMaxCents));
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  params.set("per_page", String(filters.perPage ?? 10));
  const suffix = params.size ? `?${params.toString()}` : "";
  const result = await request<{
    data: Parameters<typeof mapPayment>[0][];
    meta: { current_page: number; last_page: number; total: number; per_page: number };
  }>(`/payments${suffix}`);
  return {
    data: result.data.map(mapPayment),
    currentPage: result.meta.current_page,
    lastPage: result.meta.last_page,
    total: result.meta.total,
    perPage: result.meta.per_page,
  };
}

export async function getPayment(paymentId: string): Promise<PaymentRecord> {
  const result = await request<{ data: Parameters<typeof mapPayment>[0] }>(`/payments/${encodeURIComponent(paymentId)}`);
  return mapPayment(result.data);
}

export async function reprintPayment(paymentId: string): Promise<PaymentRecord> {
  const result = await request<{ data: Parameters<typeof mapPayment>[0] }>(`/payments/${encodeURIComponent(paymentId)}/reprint`, { method: "POST" });
  return mapPayment(result.data);
}

export interface PaymentVoidRequest {
  id: string;
  paymentId: string;
  receiptNo: string | null;
  amountCents: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedBy: string;
  requestedAt: string;
  decisionNote: string | null;
}

function mapVoidRequest(item: {
  id: string; payment_id: string; receipt_no: string | null; amount_cents: number; reason: string;
  status: PaymentVoidRequest["status"]; requested_by: string; requested_at: string; decision_note: string | null;
}): PaymentVoidRequest {
  return {
    id: item.id,
    paymentId: item.payment_id,
    receiptNo: item.receipt_no,
    amountCents: item.amount_cents,
    reason: item.reason,
    status: item.status,
    requestedBy: item.requested_by,
    requestedAt: item.requested_at,
    decisionNote: item.decision_note,
  };
}

export async function listVoidRequests(): Promise<PaymentVoidRequest[]> {
  const result = await request<{ data: Parameters<typeof mapVoidRequest>[0][] }>("/void-requests");
  return result.data.map(mapVoidRequest);
}

export async function requestPaymentVoid(paymentId: string, reason: string): Promise<PaymentVoidRequest> {
  const result = await request<{ data: Parameters<typeof mapVoidRequest>[0] }>(`/payments/${encodeURIComponent(paymentId)}/void-requests`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return mapVoidRequest(result.data);
}

export async function decidePaymentVoid(requestId: string, decision: "approved" | "rejected", decisionNote: string): Promise<PaymentVoidRequest> {
  const result = await request<{ data: Parameters<typeof mapVoidRequest>[0] }>(`/void-requests/${encodeURIComponent(requestId)}`, {
    method: "PATCH",
    body: JSON.stringify({ decision, decision_note: decisionNote }),
  });
  return mapVoidRequest(result.data);
}

export interface CloseOutRecord {
  id: string;
  businessDate: string;
  cashier: string | null;
  systemCashCents: number;
  systemTotals: Record<string, number>;
  countedCashCents: number;
  varianceCents: number;
  varianceReason: string | null;
  submittedAt: string;
  signedOffAt: string | null;
  signedOffBy: string | null;
}

function mapCloseOut(item: {
  id: string; business_date: string; cashier: string | null; system_cash_cents: number; system_totals?: Record<string, number>; counted_cash_cents: number;
  variance_cents: number; variance_reason: string | null; submitted_at: string; signed_off_at: string | null; signed_off_by: string | null;
}): CloseOutRecord {
  return {
    id: item.id,
    businessDate: item.business_date,
    cashier: item.cashier,
    systemCashCents: item.system_cash_cents,
    systemTotals: item.system_totals ?? { cash: item.system_cash_cents },
    countedCashCents: item.counted_cash_cents,
    varianceCents: item.variance_cents,
    varianceReason: item.variance_reason,
    submittedAt: item.submitted_at,
    signedOffAt: item.signed_off_at,
    signedOffBy: item.signed_off_by,
  };
}

export async function getTodayCloseOut(): Promise<{ businessDate: string; systemCashCents: number; systemTotals: Record<string, number>; closeOut: CloseOutRecord | null }> {
  const result = await request<{ data: { business_date: string; system_cash_cents: number; system_totals?: Record<string, number>; close_out: Parameters<typeof mapCloseOut>[0] | null } }>("/close-outs/today");
  return {
    businessDate: result.data.business_date,
    systemCashCents: result.data.system_cash_cents,
    systemTotals: result.data.system_totals ?? { cash: result.data.system_cash_cents },
    closeOut: result.data.close_out ? mapCloseOut(result.data.close_out) : null,
  };
}

export interface BusinessDateSimulation {
  businessDate: string;
  businessDateTime: string;
  simulatedAt: string | null;
}

function mapBusinessDateSimulation(data: { business_date: string; business_datetime: string; simulated_at: string | null }): BusinessDateSimulation {
  return { businessDate: data.business_date, businessDateTime: data.business_datetime, simulatedAt: data.simulated_at };
}

export async function getBusinessDateSimulation(): Promise<BusinessDateSimulation> {
  const result = await request<{ data: { business_date: string; business_datetime: string; simulated_at: string | null } }>("/close-outs/business-date");
  return mapBusinessDateSimulation(result.data);
}

export async function simulateBusinessDate(businessDateTime: string): Promise<BusinessDateSimulation> {
  const result = await request<{ data: { business_date: string; business_datetime: string; simulated_at: string | null } }>("/close-outs/business-date", {
    method: "POST",
    body: JSON.stringify({ business_datetime: businessDateTime }),
  });
  return mapBusinessDateSimulation(result.data);
}

export async function restoreBusinessDate(): Promise<BusinessDateSimulation> {
  const result = await request<{ data: { business_date: string; business_datetime: string; simulated_at: string | null } }>("/close-outs/business-date", { method: "DELETE" });
  return mapBusinessDateSimulation(result.data);
}

export async function submitCloseOut(countedCashCents: number, varianceReason?: string): Promise<CloseOutRecord> {
  const result = await request<{ data: Parameters<typeof mapCloseOut>[0] }>("/close-outs", {
    method: "POST",
    body: JSON.stringify({ counted_cash_cents: countedCashCents, variance_reason: varianceReason }),
  });
  return mapCloseOut(result.data);
}

export async function listCloseOuts(): Promise<CloseOutRecord[]> {
  const result = await request<{ data: Parameters<typeof mapCloseOut>[0][] }>("/close-outs");
  return result.data.map(mapCloseOut);
}

export async function signOffCloseOut(closeOutId: string): Promise<CloseOutRecord> {
  const result = await request<{ data: Parameters<typeof mapCloseOut>[0] }>(`/close-outs/${encodeURIComponent(closeOutId)}/sign-off`, { method: "POST" });
  return mapCloseOut(result.data);
}

export interface SecurityEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  account: string | null;
  accountName: string | null;
  actorName: string | null;
  details: Record<string, unknown> | null;
  occurredAt: string;
}

export async function listSecurityEvents(filters: { user?: string; action?: string; dateFrom?: string; dateTo?: string; page?: number; perPage?: number } = {}): Promise<{ data: SecurityEvent[]; currentPage: number; lastPage: number; total: number; perPage: number }> {
  const params = new URLSearchParams();
  if (filters.user) params.set("user", filters.user);
  if (filters.action) params.set("action", filters.action);
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  params.set("per_page", String(filters.perPage ?? 10));
  const result = await request<{ data: SecurityEvent[]; meta: { currentPage: number; lastPage: number; total: number; perPage: number } }>(`/admin/security-events?${params.toString()}`);
  return { data: result.data, ...result.meta };
}

export interface StudentListItem {
  id: string;
  lrn: string;
  fullName: string;
  gradeLevel: string | null;
  section: string | null;
  status: string;
  balanceCents?: number;
  guardians?: { fullName: string; relationship: string; email: string | null; mobile: string | null; emailStatus: string }[];
}

export interface StudentRecordOptions {
  grades: { id: string; name: string; sections: { id: string; name: string }[] }[];
  statuses: string[];
}

export interface StudentRecordInput {
  lrn: string;
  fullName: string;
  gradeLevelId: string;
  sectionId: string;
  status: string;
  guardianName: string;
  guardianRelationship: string;
  guardianEmail: string;
  guardianMobile: string;
}

export async function listStudents(filters: { query?: string; grade?: string; section?: string; status?: string; page?: number; perPage?: number }): Promise<{ data: StudentListItem[]; currentPage: number; lastPage: number; total: number; perPage: number }> {
  const params = new URLSearchParams();
  for (const key of ["query", "grade", "section", "status"] as const) if (filters[key]?.trim()) params.set(key, filters[key]!.trim());
  if (filters.page) params.set("page", String(filters.page));
  params.set("per_page", String(filters.perPage ?? 10));
  const query = params.toString();
  const result = await request<{ data: StudentListItem[]; meta: { currentPage: number; lastPage: number; total: number; perPage: number } }>(`/students${query ? `?${query}` : ""}`);
  return { data: result.data, ...result.meta };
}

export async function getStudent(studentId: string): Promise<StudentListItem> {
  const result = await request<{ data: StudentListItem }>(`/students/${encodeURIComponent(studentId)}`);
  return result.data;
}

export async function getStudentRecordOptions(): Promise<StudentRecordOptions> {
  const result = await request<{ data: StudentRecordOptions }>("/student-record-options");
  return result.data;
}

export async function createStudent(input: StudentRecordInput): Promise<StudentListItem> {
  const result = await request<{ data: StudentListItem }>("/students", { method: "POST", body: JSON.stringify(toStudentPayload(input)) });
  return result.data;
}

export async function updateStudent(studentId: string, input: StudentRecordInput): Promise<StudentListItem> {
  const result = await request<{ data: StudentListItem }>(`/students/${encodeURIComponent(studentId)}`, { method: "PATCH", body: JSON.stringify(toStudentPayload(input)) });
  return result.data;
}

function toStudentPayload(input: StudentRecordInput) {
  return {
    lrn: input.lrn,
    full_name: input.fullName,
    grade_level_id: Number(input.gradeLevelId),
    section_id: Number(input.sectionId),
    status: input.status,
    guardian_name: input.guardianName,
    guardian_relationship: input.guardianRelationship,
    guardian_email: input.guardianEmail,
    guardian_mobile: input.guardianMobile,
  };
}

export interface BillingAccountSummary {
  id: string;
  studentId: string;
  lrn: string;
  studentName: string;
  gradeLevel: string | null;
  section: string | null;
  schoolYearId: string;
  schoolYear: string;
  status: string;
  totalDueCents: number;
  totalPaidCents: number;
  balanceCents: number;
}

export interface BillingAccountDetail extends BillingAccountSummary {
  items: { name: string; category: string; amountCents: number; required: boolean | null }[];
  installments: { id: string; label: string; dueDate: string; amountCents: number; paidCents: number; status: string }[];
  payments: { id: string; receiptNo: string | null; amountCents: number; paidOn: string; status: string; recordedBy: string | null; allocations: { installment: string | null; amountCents: number }[] }[];
  adjustments: { id: string; type: string; amountCents: number; reason: string; effectiveAt: string | null; createdBy: string | null }[];
  activity: { id: string; action: string; occurredAt: string; actor: string | null; details: { amountCents?: number; receiptNo?: string | null; status?: string; reason?: string; decision?: string; decisionNote?: string; reprintCount?: number; adjustmentType?: string } }[];
}

export interface BillingAccountPage {
  data: BillingAccountSummary[];
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  currentSchoolYearId: string | null;
  schoolYears: { id: string; label: string }[];
}

export async function listBillingAccounts(filters: { query?: string; schoolYearId?: string; schoolYearScope?: "current" | "all"; grade?: string; status?: string; minimumBalanceCents?: number; maximumBalanceCents?: number; page?: number; perPage?: number }): Promise<BillingAccountPage> {
  const params = new URLSearchParams();
  if (filters.query?.trim()) params.set("query", filters.query.trim());
  if (filters.schoolYearId) params.set("school_year_id", filters.schoolYearId);
  if (filters.schoolYearScope) params.set("school_year_scope", filters.schoolYearScope);
  if (filters.grade?.trim()) params.set("grade", filters.grade.trim());
  if (filters.status?.trim()) params.set("status", filters.status.trim());
  if (filters.minimumBalanceCents !== undefined) params.set("minimum_balance_cents", String(filters.minimumBalanceCents));
  if (filters.maximumBalanceCents !== undefined) params.set("maximum_balance_cents", String(filters.maximumBalanceCents));
  if (filters.page) params.set("page", String(filters.page));
  params.set("per_page", String(filters.perPage ?? 10));
  const query = params.toString();
  const result = await request<{ data: BillingAccountSummary[]; meta: { currentPage: number; lastPage: number; total: number; perPage: number; currentSchoolYearId?: string | null; schoolYears?: { id: string; label: string }[] } }>(`/billing-accounts${query ? `?${query}` : ""}`);
  return { data: result.data, ...result.meta, currentSchoolYearId: result.meta.currentSchoolYearId ?? null, schoolYears: result.meta.schoolYears ?? [] };
}

export async function createBillingAdjustment(accountId: string, input: { type: "discount" | "scholarship" | "correction"; amountCents: number; reason: string }): Promise<void> {
  await request(`/billing-accounts/${encodeURIComponent(accountId)}/adjustments`, { method: "POST", body: JSON.stringify({ type: input.type, amount_cents: input.amountCents, reason: input.reason }) });
}

export async function getBillingAccount(accountId: string): Promise<BillingAccountDetail> {
  const result = await request<{ data: BillingAccountDetail }>(`/billing-accounts/${encodeURIComponent(accountId)}`);
  return result.data;
}

export function isLiveCashierApiEnabled(): boolean {
  // The functional prototype is intentionally MockDB-first. Live integration
  // remains available only when an operator explicitly opts into it.
  return import.meta.env.VITE_DATA_SOURCE === "live" || import.meta.env.VITE_USE_LIVE_API === "true";
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() ?? "GET";
  const csrfToken = ["POST", "PUT", "PATCH", "DELETE"].includes(method)
    ? await csrfHeader()
    : undefined;
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...csrfToken, ...init?.headers },
  });
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & T;

  if (!response.ok) {
    const validationMessage = body.errors ? Object.values(body.errors).flat()[0] : undefined;
    const retryAfterHeader = response.headers?.get?.("Retry-After") ?? null;
    const retryAfterSeconds = retryAfterHeader !== null && /^\d+$/.test(retryAfterHeader)
      ? Number(retryAfterHeader)
      : undefined;
    throw new CashierApiError(
      validationMessage ?? body.message ?? "The request could not be completed. Please try again.",
      response.status,
      retryAfterSeconds,
    );
  }

  return body as T;
}

async function csrfHeader(): Promise<Record<string, string>> {
  await fetch("/sanctum/csrf-cookie", { credentials: "include" });
  const token = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

  return token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {};
}

export async function signInWithLiveApi(username: string, password: string, rememberMe = false): Promise<AuthenticatedUser> {
  const response = await request<{ data: { id: string; fullName: string; role: string; mustChangePassword?: boolean; lastLoginAt?: string | null } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password, remember: rememberMe }),
  });
  return mapLiveUser(response.data);
}

export async function getLiveSession(): Promise<AuthenticatedUser | null> {
  try {
    const response = await request<{ data: { id: string; fullName: string; role: string; mustChangePassword?: boolean; lastLoginAt?: string | null } }>("/auth/me");
    return mapLiveUser(response.data);
  } catch (error) {
    if (error instanceof CashierApiError && error.status === 401) return null;
    throw error;
  }
}

export async function changeLivePassword(currentPassword: string, password: string): Promise<AuthenticatedUser> {
  const response = await request<{ data: { id: string; fullName: string; role: string; mustChangePassword?: boolean; lastLoginAt?: string | null } }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, password, password_confirmation: password }),
  });
  return mapLiveUser(response.data);
}

function mapLiveUser(profile: { id: string; fullName: string; role: string; mustChangePassword?: boolean; lastLoginAt?: string | null }): AuthenticatedUser {
  const roleMap: Record<string, Role> = {
    super_admin: "super_admin",
    admin: "administrator",
    cashier: "cashier",
    accounting: "accounting",
    auditor: "auditor",
    registrar: "registrar",
  };
  const role = roleMap[profile.role];
  if (!role) throw new CashierApiError("The account has an unsupported role configuration.", 403);
  return {
    id: profile.id,
    name: profile.fullName,
    role,
    mustChangePassword: profile.mustChangePassword,
    lastLoginAt: profile.lastLoginAt,
  };
}

export async function signOutFromLiveApi(): Promise<void> {
  await request<void>("/auth/logout", { method: "POST" });
}

export async function searchPaymentStudents(query: string): Promise<PaymentStudent[]> {
  const response = await request<{ data: { id: string; number: string; name: string; grade: string | null; section: string | null; balance_cents: number }[] }>(
    `/payment-students?query=${encodeURIComponent(query)}`,
  );
  return response.data.map((student) => ({
    id: student.id,
    number: student.number,
    name: student.name,
    grade: student.grade,
    section: student.section,
    balanceCents: student.balance_cents,
  }));
}

export async function getPaymentContext(studentId: string): Promise<PaymentContext> {
  const response = await request<{ data: {
    student: { id: string; number: string; name: string };
    billing_account_id: string;
    balance_cents: number;
    next_installment: { id: string; label: string; due_date: string; amount_due_cents: number } | null;
  } }>(`/payment-students/${encodeURIComponent(studentId)}/context`);
  return {
    student: response.data.student,
    billingAccountId: response.data.billing_account_id,
    balanceCents: response.data.balance_cents,
    nextInstallment: response.data.next_installment ? {
      id: response.data.next_installment.id,
      label: response.data.next_installment.label,
      dueDate: response.data.next_installment.due_date,
      amountDueCents: response.data.next_installment.amount_due_cents,
    } : null,
  };
}

export async function recordCashPaymentForStudent(input: {
  billingAccountId: string;
  studentLrn?: string;
  amount: ReturnType<typeof centavos>;
  paidOn: string;
  backdateReason?: string;
  duplicateOverrideReason?: string;
  notes?: string;
  notificationChannels: NotificationChannel[];
  idempotencyKey: string;
}): Promise<SavedCashPayment> {
  if (!isLiveCashierApiEnabled()) {
    // Keep mock-mode pages on one mutable billing dataset instead of creating
    // a detached success response that account and receipt views cannot see.
    const payment = recordMockBillingPayment({
      billingAccountId: input.billingAccountId,
      studentLrn: input.studentLrn ?? "",
      amount: input.amount,
      paidOn: input.paidOn,
    });

    return {
      id: payment.id,
      receiptNo: payment.receiptNo,
      balanceAfter: centavos(payment.balanceAfter),
      emailQueued: input.notificationChannels.includes("email"),
      smsQueued: input.notificationChannels.includes("sms"),
      smsLoadFeeCents: null,
    };
  }

  const result = await request<{ data: { id: string; receipt_no: string; balance_after_cents: number; email_queued: boolean; sms_queued: boolean; sms_load_fee_cents: number | null } }>("/payments", {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({
      billing_account_id: input.billingAccountId,
      amount_cents: input.amount,
      paid_on: input.paidOn,
      backdate_reason: input.backdateReason,
      duplicate_override_reason: input.duplicateOverrideReason,
      notes: input.notes,
      notification_channels: input.notificationChannels,
    }),
  });

  return {
    id: result.data.id,
    receiptNo: result.data.receipt_no,
    balanceAfter: centavos(result.data.balance_after_cents),
    emailQueued: result.data.email_queued,
    smsQueued: result.data.sms_queued,
    smsLoadFeeCents: result.data.sms_load_fee_cents === null
      ? null
      : centavos(result.data.sms_load_fee_cents),
  };
}
