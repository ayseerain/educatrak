import { recordMockBillingPayment } from "@/features/students/mockBilling";
import { centavos } from "@/lib/money";

declare global {
  interface ImportMetaEnv {
    readonly VITE_USE_LIVE_API?: string;
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
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export interface SavedCashPayment {
  id: string;
  receiptNo: string;
  balanceAfter: ReturnType<typeof centavos>;
  emailQueued: boolean;
}

export function isLiveCashierApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === "true";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
    throw new CashierApiError(validationMessage ?? body.message ?? "The payment could not be saved. Please try again.", response.status);
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

export async function signInWithLiveApi(username: string, password: string): Promise<{
  id: string;
  name: string;
  role: "cashier" | "accounting" | "administrator" | "auditor" | "registrar";
}> {
  const response = await request<{ data: { id: string; fullName: string; role: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  const role = response.data.role === "admin" ? "administrator" : response.data.role;

  return { id: response.data.id, name: response.data.fullName, role: role as "cashier" | "accounting" | "administrator" | "auditor" | "registrar" };
}

export async function signOutFromLiveApi(): Promise<void> {
  await request<void>("/auth/logout", { method: "POST" });
}

export async function recordCashPaymentForStudent(input: {
  studentNumber: string;
  amount: ReturnType<typeof centavos>;
  paidOn: string;
}): Promise<SavedCashPayment> {
  if (!isLiveCashierApiEnabled()) {
    // Keep mock-mode pages on one mutable billing dataset instead of creating
    // a detached success response that account and receipt views cannot see.
    const payment = recordMockBillingPayment({
      studentNumber: input.studentNumber,
      amount: input.amount,
      paidOn: input.paidOn,
    });

    return {
      id: payment.id,
      receiptNo: payment.receiptNo,
      balanceAfter: centavos(payment.balanceAfter),
      emailQueued: true,
    };
  }

  const students = await request<{ data: { id: string; number: string }[] }>(
    `/payment-students?query=${encodeURIComponent(input.studentNumber)}`,
  );
  const student = students.data.find((candidate) => candidate.number === input.studentNumber);

  if (!student) {
    throw new CashierApiError("This student is not available for a payment in the live database.", 404);
  }

  const context = await request<{ data: { billing_account_id: string } }>(
    `/payment-students/${student.id}/context`,
  );
  const result = await request<{ data: { id: string; receipt_no: string; balance_after_cents: number; email_queued: boolean } }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      billing_account_id: context.data.billing_account_id,
      amount_cents: input.amount,
      paid_on: input.paidOn,
    }),
  });

  return {
    id: result.data.id,
    receiptNo: result.data.receipt_no,
    balanceAfter: centavos(result.data.balance_after_cents),
    emailQueued: result.data.email_queued,
  };
}
