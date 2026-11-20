import { request } from "@/api/cashierApi";

export interface FinanceFeeSchedule {
  id: string;
  schoolYear: string;
  gradeLevel: string;
  name: string;
  active: boolean;
  items: {
    id: string;
    name: string;
    category: string;
    amountCents: number;
    required: boolean;
    active: boolean;
    version: number;
  }[];
}

export interface FinancePaymentPlan {
  id: string;
  name: string;
  downPaymentType: string;
  /** Centavos when type is "amount"; basis points (10000 = 100%) when "percent". */
  downPaymentValue: number;
  active: boolean;
  version: number;
  previousVersionId: string | null;
  installments: {
    label: string;
    sequence: number;
    dueDayOffset: number;
    percentOfRemainingBasisPoints: number;
  }[];
}

export async function listFinanceFeeSchedules(): Promise<FinanceFeeSchedule[]> {
  const result = await request<{ data: FinanceFeeSchedule[] }>("/settings/finance/fees");
  return result.data;
}

export async function listFinancePaymentPlans(): Promise<FinancePaymentPlan[]> {
  const result = await request<{ data: FinancePaymentPlan[] }>("/settings/finance/plans");
  return result.data;
}

/** Plan create/revise body (API contract rows 65–66). Installment percents are basis points summing to 10000. */
export interface PaymentPlanInput {
  name: string;
  down_payment_type: "amount" | "percent";
  down_payment_value: number;
  installments: { label: string; due_day_offset: number; percent_of_remaining_basis_points: number }[];
}

export interface PaymentPlanPreview {
  planId: string;
  version: number;
  totalCents: number;
  installments: { label: string; sequence: number; dueDayOffset: number; dueDate: string; amountCents: number }[];
}

export async function createFinancePaymentPlan(input: PaymentPlanInput): Promise<void> {
  await request("/settings/finance/plans", { method: "POST", body: JSON.stringify(input) });
}

/** Creates version N+1 for new accounts only; existing accounts keep the old version. */
export async function reviseFinancePaymentPlan(planId: string, input: PaymentPlanInput): Promise<void> {
  await request(`/settings/finance/plans/${encodeURIComponent(planId)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deactivateFinancePaymentPlan(planId: string): Promise<void> {
  await request(`/settings/finance/plans/${encodeURIComponent(planId)}/deactivate`, { method: "POST" });
}

export async function previewFinancePaymentPlan(planId: string, totalCents: number): Promise<PaymentPlanPreview> {
  const result = await request<{ data: PaymentPlanPreview }>(`/settings/finance/plans/${encodeURIComponent(planId)}/preview`, {
    method: "POST",
    body: JSON.stringify({ total_cents: totalCents }),
  });
  return result.data;
}

export interface FeeItemInput {
  name: string;
  category: "tuition" | "miscellaneous" | "other";
  amountCents: number;
  required: boolean;
  applyToAll: boolean;
}

export async function createFinanceFeeItem(scheduleId: string, input: FeeItemInput): Promise<void> {
  await request(`/settings/finance/fees/${encodeURIComponent(scheduleId)}/items`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      category: input.category,
      amount_cents: input.amountCents,
      required: input.required,
      apply_to_all: input.applyToAll,
    }),
  });
}

export async function reviseFinanceFeeItem(feeItemId: string, input: FeeItemInput): Promise<void> {
  await request(`/settings/finance/fee-items/${encodeURIComponent(feeItemId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: input.name,
      category: input.category,
      amount_cents: input.amountCents,
      required: input.required,
      apply_to_all: input.applyToAll,
    }),
  });
}

export async function deactivateFinanceFeeItem(feeItemId: string): Promise<void> {
  await request(`/settings/finance/fee-items/${encodeURIComponent(feeItemId)}/deactivate`, { method: "POST" });
}
