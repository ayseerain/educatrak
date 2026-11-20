import { request } from "@/api/cashierApi";

/** Cashier account wizard choices (API contract row 73). currentSchoolYear is null unless exactly one year is current. */
export interface AccountCreationOptions {
  currentSchoolYear: { id: string; label: string } | null;
  paymentPlans: {
    id: string;
    name: string;
    version: number;
    downPaymentType: "amount" | "percent";
    downPaymentValue: number;
    installments: { label: string; sequence: number; dueDayOffset: number; percentOfRemainingBasisPoints: number }[];
  }[];
}

export interface AccountCreationInput {
  studentId: string;
  schoolYearId: string;
  paymentPlanId: string;
  excludedFeeItemIds: string[];
}

/** Server-computed draft (API contract row 72); nothing is written. */
export interface AccountCreationPreview {
  paymentPlanVersion: number;
  items: { feeItemId: string; name: string; category: string; amountCents: number; required: boolean }[];
  totalDueCents: number;
  installments: { label: string; sequence: number; dueDate: string; amountCents: number }[];
}

function body(input: AccountCreationInput): string {
  return JSON.stringify({
    student_id: Number(input.studentId),
    school_year_id: Number(input.schoolYearId),
    payment_plan_id: Number(input.paymentPlanId),
    excluded_fee_item_ids: input.excludedFeeItemIds.map(Number),
  });
}

export async function getAccountCreationOptions(): Promise<AccountCreationOptions> {
  return (await request<{ data: AccountCreationOptions }>("/billing-accounts/creation-options")).data;
}

export async function previewBillingAccount(input: AccountCreationInput): Promise<AccountCreationPreview> {
  return (await request<{ data: AccountCreationPreview }>("/billing-accounts/preview", { method: "POST", body: body(input) })).data;
}

/** Returns the new account id (API contract row 71). */
export async function createBillingAccount(input: AccountCreationInput): Promise<string> {
  return (await request<{ data: { id: string } }>("/billing-accounts", { method: "POST", body: body(input) })).data.id;
}
