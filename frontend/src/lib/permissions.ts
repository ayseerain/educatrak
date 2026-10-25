import type { AuthenticatedUser, Capability, Role } from "./types";

export type ReportKind = "daily" | "monthly" | "outstanding" | "statement";

/**
 * Frontend route and action capabilities aligned with the approved
 * capability matrix in Project Specification section 6.4. This map is
 * the source of truth for interface visibility; backend checks remain
 * the security boundary (Project Specification section 23).
 */
const CAPABILITY_MATRIX: Record<Role, ReadonlySet<Capability>> = {
  super_admin: new Set<Capability>([
    "dashboard.view", "user.manage", "security.events.view", "audit.view",
  ]),
  cashier: new Set<Capability>([
    "dashboard.view",
    "student.view", "student.edit", "guardianContact.view",
    "account.view", "account.create",
    "payment.view", "payment.record", "payment.void.request", "receipt.reprint",
    "followup.view", "followup.send",
    "notification.view", "notification.retry",
    "closeout.submit", "closeout.view",
  ]),
  accounting: new Set<Capability>([
    "dashboard.view",
    "student.view", "guardianContact.view",
    "account.view",
    "payment.view",
    "payment.void.view", "payment.void.approve", "receipt.reprint",
    "followup.view", "followup.send",
    "report.view",
    "statement.print",
    "settings.finance.view", "settings.finance.manage",
    "settings.system.view",
    "notification.view",
    "closeout.signoff", "closeout.view",
  ]),
  administrator: new Set<Capability>([
    "dashboard.view",
    "settings.system.view", "settings.system.manage", "user.manage", "security.events.view", "backup.manage",
  ]),
  auditor: new Set<Capability>([
    "dashboard.view",
    "audit.view",
  ]),
  registrar: new Set<Capability>([
    "dashboard.view",
    "clearance.lookup", "clearance.view",
    "permit.print",
  ]),
};

export function can(user: AuthenticatedUser, capability: Capability): boolean {
  return CAPABILITY_MATRIX[user.role].has(capability);
}

/** Report pages are assigned to Accounting; Cashier totals remain in Dashboard and Close-out. */
export function canViewReport(user: AuthenticatedUser, report: ReportKind): boolean {
  return can(user, "report.view") && (report !== "statement" || can(user, "statement.print"));
}
