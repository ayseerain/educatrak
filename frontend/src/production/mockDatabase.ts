/** Build-time replacement for the development mock database. */
export const students: never[] = [];
export const billingAccounts: never[] = [];
export const payments: never[] = [];
export const CURRENT_MOCK_SCHOOL_YEAR = "";

export function getMockState() {
  return {
    config: { currentSchoolYearId: "", dueSoonDays: 0 },
    schoolYears: [],
    staffUsers: [],
    notificationAttempts: [],
    closeouts: [],
    backupRuns: [],
    frontendOnly: { devCredentials: [] },
  };
}

export async function mockApiDelay(): Promise<void> {
  throw new Error("Mock data is unavailable in production.");
}

export function getStudentById(): undefined { return undefined; }
export function getBillingAccount(): undefined { return undefined; }
export function getCurrentBillingAccount(): undefined { return undefined; }
export function getDueInstallments(): never[] { return []; }
export function getMockPayment(): undefined { return undefined; }
export function getNextDueRecord(): undefined { return undefined; }
export function getPaymentsForStudent(): never[] { return []; }
export function getStudentBillingAccounts(): never[] { return []; }
export function getMockGuardianContact(): undefined { return undefined; }
export function selectMockNotificationRows(): never[] { return []; }
export function selectMockStaffUsers(): never[] { return []; }
export function createMockStaffUser(): never { throw new Error("Mock data is unavailable in production."); }
export function updateMockStaffUser(): never { throw new Error("Mock data is unavailable in production."); }
export function archiveMockStaffUser(): never { throw new Error("Mock data is unavailable in production."); }
export function restoreMockStaffUser(): never { throw new Error("Mock data is unavailable in production."); }
export function recordMockBillingPayment(): never { throw new Error("Mock data is unavailable in production."); }
