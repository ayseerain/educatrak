/** @deprecated Development fixture compatibility export. Use a feature API for new screens. */
export {
  billingAccounts,
  CURRENT_MOCK_SCHOOL_YEAR,
  getBillingAccount,
  getCurrentBillingAccount,
  getDueInstallments,
  getMockPayment,
  getNextDueRecord,
  getPaymentsForStudent,
  getStudentBillingAccounts,
  getStudentById,
  payments,
  recordMockBillingPayment,
} from "@/api/mock";
export type { MockBillingAccount, MockInstallment, MockPayment } from "@/api/mock";
