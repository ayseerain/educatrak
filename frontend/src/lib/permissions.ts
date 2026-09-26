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
    "students.view",
    "accounts.view",
    "payments.view",
    "payments.record",
    "followUp.view",
    "clearance.view",
    "reports.view",
    "notifications.view",
    "closeOut.view",
    "import.view",
    "finance.amounts.view",
  ]),
  accounting: new Set<Capability>([
    "dashboard.view",
    "accounts.view",
    "payments.view",
    "followUp.view",
    "clearance.view",
    "reports.view",
    "voidApprovals.view",
    "notifications.view",
    "settings.finance",
    "closeOut.history",
    "auditLog.view",
    "finance.amounts.view",
  ]),
  administrator: new Set<Capability>([
    "dashboard.view",
    "students.view",
    "administration.view",
    "settings.view",
    "reports.view",
    "notifications.view",
    "auditLog.view",
    "backup.view",
    "finance.amounts.view",
  ]),
  auditor: new Set<Capability>([
    "dashboard.view",
    "accounts.view",
    "payments.view",
    "reports.view",
    "auditLog.view",
    "clearance.view",
    "followUp.view",
    "settings.view",
    "finance.amounts.view",
  ]),
  registrar: new Set<Capability>([
    "dashboard.view",
    "students.view",
    "clearance.view",
  ]),
};

export function can(user: AuthenticatedUser, capability: Capability): boolean {
  return CAPABILITY_MATRIX[user.role].has(capability);
}

/** Convenience guard used by dashboard components to hide financial data. */
export function canSeeFinancials(user: AuthenticatedUser): boolean {
  return can(user, "finance.amounts.view");
}
