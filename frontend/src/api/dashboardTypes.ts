import type { Centavos } from "@/lib/money";
import type { Role } from "@/lib/types";

export type PaymentStatus = "posted" | "voided" | "pending";
export type PaymentMethod = "cash" | "bank_transfer" | "gcash" | "check";
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
  overallEnrolledStudents: number;
  lastBackupAt: string; // ISO timestamp
  lastBackupSucceeded: boolean;
  activeUserCount: number;
  failedEmailCount: number;
}

export interface AuditorDashboardSummary {
  role: "auditor";
  overallEnrolledStudents: number;
  todayCollectionsTotal: Centavos;
  paymentsTodayCount: number;
  recentActivity: RecentPayment[];
}

export interface RegistrarDashboardSummary {
  role: "registrar";
  // Intentionally contains no financial fields.
}

export type DashboardSummary =
  | CashierDashboardSummary
  | AccountingDashboardSummary
  | AdministratorDashboardSummary
  | AuditorDashboardSummary
  | RegistrarDashboardSummary;

export function summaryForRole(role: Role): DashboardSummary["role"] {
  return role;
}
