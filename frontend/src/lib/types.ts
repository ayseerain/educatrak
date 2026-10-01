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
  | "student.view" | "student.edit"
  | "account.view" | "account.create"
  | "payment.view" | "payment.record" | "payment.void.request" | "payment.void.view" | "payment.void.approve" | "receipt.reprint" | "receipt.pdf"
  | "followup.view" | "followup.send"
  | "clearance.view" | "permit.print"
  | "report.view" | "statement.print"
  | "notification.view" | "notification.retry"
  | "settings.system" | "settings.finance"
  | "user.manage" | "closeout.submit" | "closeout.signoff" | "closeout.view"
  | "import.run" | "audit.view" | "backup.manage"
  | "finance.amounts.view"
  | "guardianContact.view";
