/**
 * Build-time replacement for development-only billing fixtures.
 * Every read is empty and every write fails so mock-backed behavior cannot
 * silently produce a successful result in a production bundle.
 */
export const billingAccounts: never[] = [];
export const payments: never[] = [];
export const CURRENT_MOCK_SCHOOL_YEAR = "";

export function recordMockBillingPayment(_input: unknown): never {
  throw new Error("Mock billing data is unavailable in production.");
}

export function getStudentById(_id?: string): undefined {
  return undefined;
}

export function getBillingAccount(_id?: string): undefined {
  return undefined;
}

export function getStudentBillingAccounts(_studentId: string): never[] {
  return [];
}

export function getCurrentBillingAccount(_studentId: string): undefined {
  return undefined;
}

export function getPaymentsForStudent(_studentId: string): never[] {
  return [];
}

export function getMockPayment(_id?: string): undefined {
  return undefined;
}

export function getDueInstallments(_studentId: string): never[] {
  return [];
}

export function getNextDueRecord(_studentId: string): undefined {
  return undefined;
}
