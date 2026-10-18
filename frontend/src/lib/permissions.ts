import type { AuthenticatedUser, Capability, Role } from "./types";

export type ReportKind = "daily" | "monthly" | "outstanding" | "statement";

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
    "payment.view", "payment.record", "payment.void.request", "receipt.reprint", "receipt.pdf",
    "followup.view", "followup.send",
    "statement.print",
    "closeout.submit",
    "finance.amounts.view",
  ]),
  accounting: new Set<Capability>([
    "dashboard.view",
    "payment.void.view", "payment.void.approve",
    "report.view",
    "settings.finance",
    "closeout.signoff", "closeout.view",
    "finance.amounts.view",
  ]),
  administrator: new Set<Capability>([
    "dashboard.view",
    "settings.system", "user.manage", "audit.view", "backup.manage",
  ]),
  auditor: new Set<Capability>([
    "dashboard.view",
    "audit.view",
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

/** Cashiers are limited to their daily report and student statements. */
export function canViewReport(user: AuthenticatedUser, report: ReportKind): boolean {
  if (!can(user, "report.view")) return false;
  return user.role !== "cashier" || report === "daily" || report === "statement";
}
