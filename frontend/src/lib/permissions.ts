import type { AuthenticatedUser, Capability, Role } from "./types";

/**
 * Capability matrix, derived from the navigation lists in
 * EducatraK_Frontend_Context_Brief.md section 8. This is the single
 * source of truth for what each role can see in the UI.
 *
 * Frontend checks are UX only — the backend remains the actual
 * security boundary (spec section 23).
 */
const CAPABILITY_MATRIX: Record<Role, ReadonlySet<Capability>> = {
  cashier: new Set<Capability>([
    "dashboard.view",
    "student.view", "student.edit", "guardianContact.view",
    "account.view", "account.create",
    "payment.view", "payment.record", "payment.void.request", "receipt.reprint",
    "followup.view", "followup.send",
    "clearance.view",
    "permit.print", "report.view", "statement.print",
    "notification.view", "notification.retry",
    "closeout.submit", "closeout.view", "import.run",
    "finance.amounts.view",
  ]),
  accounting: new Set<Capability>([
    "dashboard.view",
    "student.view", "guardianContact.view", "account.view", "payment.view", "receipt.reprint",
    "followup.view", "followup.send",
    "clearance.view",
    "report.view", "statement.print", "payment.void.approve",
    "notification.view",
    "settings.finance",
    "settings.system", "closeout.signoff", "closeout.view", "audit.view",
    "finance.amounts.view",
  ]),
  administrator: new Set<Capability>([
    "dashboard.view",
    "student.view", "student.edit", "guardianContact.view", "account.view", "payment.view",
    "clearance.view", "report.view", "notification.view", "notification.retry",
    "settings.system", "settings.finance", "user.manage", "closeout.view", "import.run", "audit.view", "backup.manage",
    "finance.amounts.view",
  ]),
  auditor: new Set<Capability>([
    "dashboard.view",
    "student.view", "guardianContact.view", "account.view", "payment.view",
    "report.view", "audit.view", "clearance.view", "followup.view",
    "notification.view", "settings.system", "settings.finance", "closeout.view",
    "finance.amounts.view",
  ]),
  registrar: new Set<Capability>([
    "dashboard.view",
    "student.view",
    "clearance.view",
    "permit.print",
  ]),
};

export function can(user: AuthenticatedUser, capability: Capability): boolean {
  return CAPABILITY_MATRIX[user.role].has(capability);
}

/** Convenience guard used by dashboard components to hide financial data. */
export function canSeeFinancials(user: AuthenticatedUser): boolean {
  return can(user, "finance.amounts.view");
}
