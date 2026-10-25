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
  downPaymentValue: number;
  active: boolean;
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

export interface FeeItemInput {
  name: string;
  category: "tuition" | "miscellaneous" | "other";
  amountCents: number;
  required: boolean;
}

export async function createFinanceFeeItem(scheduleId: string, input: FeeItemInput): Promise<void> {
  await request(`/settings/finance/fees/${encodeURIComponent(scheduleId)}/items`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      category: input.category,
      amount_cents: input.amountCents,
      required: input.required,
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
    }),
  });
}

export async function deactivateFinanceFeeItem(feeItemId: string): Promise<void> {
  await request(`/settings/finance/fee-items/${encodeURIComponent(feeItemId)}/deactivate`, { method: "POST" });
}
