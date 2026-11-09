import type { Centavos } from "@/lib/money";
import type { Role } from "@/lib/types";

export type PaymentStatus = "posted" | "void_pending" | "voided";
export type PaymentMethod = "cash";
export type DashboardRange = "today" | "last_7_days" | "last_30_days" | "school_year";

export interface DashboardRangeOption {
  value: DashboardRange;
  label: string;
  days: number | null;
}

export interface RecentPayment {
  id: string;
  time: string; // ISO timestamp
  studentName: string;
  receiptNo: string;
  amount: Centavos;
  method: PaymentMethod;
  status: PaymentStatus;
}

export interface RecordPaymentInput {
  studentName: string;
  amount: Centavos;
  method: PaymentMethod;
  reference?: string;
  paymentDate: string; // YYYY-MM-DD from the payment form
  backdateReason?: string;
}

export interface CashierAccountStatusOverview {
  cleared: number;
  current: number;
  dueSoon: number;
  overdue: number;
}

export interface CashierAttentionAccount {
  id: string;
  studentName: string;
  amountDue: Centavos;
  severity: "warning" | "error";
}

export interface CashierDashboardSummary {
  role: "cashier";
  overallEnrolledStudents: number;
  todayCollectionsTotal: Centavos;
  paymentsTodayCount: number;
  rangeCollectionsTotal: Centavos;
  paymentsInRangeCount: number;
  failedEmailCount: number;
  closeoutDone: boolean;
  accountStatusOverview: CashierAccountStatusOverview;
  accountsNeedingAttention: CashierAttentionAccount[];
  recentActivity: RecentPayment[];
}

export interface CollectionTrendPoint {
  date: string; // ISO date
  totalCollected: Centavos;
}

export interface AccountingDashboardSummary {
  role: "accounting";
  overallEnrolledStudents: number;
  pendingVoidApprovals: number;
  overdueTotal: Centavos;
  unsignedCloseouts: number;
  collectionTrend: CollectionTrendPoint[];
  recentActivity: RecentPayment[];
}

export interface AdministratorDashboardSummary {
  role: "administrator";
  lastBackupAt: string | null; // ISO timestamp when available
  lastBackupSucceeded: boolean | null;
  activeUserCount: number;
  staffAccounts?: DashboardStaffAccountSummary;
  configuration?: DashboardConfigurationSummary;
  recentAdministrativeActivity?: DashboardActivity[];
  securityEvents?: DashboardActivity[];
}

export interface SuperAdministratorDashboardSummary extends Omit<AdministratorDashboardSummary, "role"> {
  role: "super_admin";
}

export interface AuditorDashboardSummary {
  role: "auditor";
  overallEnrolledStudents: number;
  todayCollectionsTotal: Centavos;
  paymentsTodayCount: number;
  rangeCollectionsTotal: Centavos;
  paymentsInRangeCount: number;
  recentAuditActivity?: DashboardActivity[];
}

export interface DashboardStaffAccountSummary {
  active: number;
  inactive: number;
  privileged: number;
  byRole: Array<{ role: Role; count: number }>;
}

export interface DashboardConfigurationSummary {
  schoolYear: string | null;
  gradeLevelCount: number;
  paymentMethodCount: number;
}

export interface DashboardActivity {
  id: string;
  label: string;
  actor: string | null;
  occurredAt: string;
}

export interface RegistrarDashboardSummary {
  role: "registrar";
  // Intentionally contains no financial fields.
}

export type DashboardSummary =
  | CashierDashboardSummary
  | AccountingDashboardSummary
  | AdministratorDashboardSummary
  | SuperAdministratorDashboardSummary
  | AuditorDashboardSummary
  | RegistrarDashboardSummary;

export function summaryForRole(role: Role): DashboardSummary["role"] {
  return role;
}
