export type Role =
  | "cashier"
  | "accounting"
  | "administrator"
  | "auditor"
  | "registrar";

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: Role;
}

/**
 * Capabilities are the atomic, named permissions the UI checks against.
 * Add new capabilities here rather than branching on `role` inline.
 */
export type Capability =
  | "dashboard.view"
  | "students.view"
  | "accounts.view"
  | "payments.view"
  | "payments.record"
  | "followUp.view"
  | "clearance.view"
  | "reports.view"
  | "notifications.view"
  | "settings.view"
  | "settings.finance"
  | "administration.view"
  | "closeOut.view"
  | "closeOut.history"
  | "import.view"
  | "voidApprovals.view"
  | "auditLog.view"
  | "backup.view"
  | "finance.amounts.view"
  | "guardianContact.view";
