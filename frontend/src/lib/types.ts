export type Role =
  | "super_admin"
  | "cashier"
  | "accounting"
  | "administrator"
  | "auditor"
  | "registrar";

export type StudentGender = "Male" | "Female";

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: Role;
  mustChangePassword?: boolean;
  lastLoginAt?: string | null;
}

/**
 * Capabilities are the atomic, named permissions the UI checks against.
 * Add new capabilities here rather than branching on `role` inline.
 */
export type Capability =
  | "dashboard.view"
  | "student.view" | "student.edit" | "student.financial.view"
  | "account.view" | "account.create" | "account.adjust"
  | "payment.view" | "payment.record" | "payment.void.request" | "payment.void.view" | "payment.void.approve" | "receipt.reprint"
  | "followup.view" | "followup.send"
  | "report.view" | "statement.print"
  | "notification.view" | "notification.retry"
  | "settings.finance.view" | "settings.finance.manage"
  | "settings.system.view" | "settings.system.manage"
  | "user.manage" | "closeout.submit" | "closeout.signoff" | "closeout.view"
  | "import.run" | "audit.view" | "security.events.view" | "backup.manage" | "backup.view"
  | "ledger.import.view" | "ledger.import.prepare" | "ledger.import.review"
  | "guardianContact.view";
