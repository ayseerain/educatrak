import type { AuthenticatedUser, Role } from "@/lib/types";

/** Development-only identities. This module is dynamically loaded only in dev. */
export const MOCK_USERS: Record<string, { password: string; user: AuthenticatedUser }> = {
  "sample.superadmin": {
    password: "SamplePass123!",
    user: { id: "user-superadmin", name: "Morgan Super Admin (sample)", role: "super_admin" },
  },
  "sample.cashier": {
    password: "SamplePass123!",
    user: { id: "user-cashier", name: "Casey Cashier (sample)", role: "cashier" },
  },
  "sample.accounting": {
    password: "SamplePass123!",
    user: { id: "user-accounting", name: "Avery Accounting (sample)", role: "accounting" },
  },
  "sample.admin": {
    password: "SamplePass123!",
    user: { id: "user-admin", name: "Alex Administrator (sample)", role: "administrator" },
  },
  "sample.auditor": {
    password: "SamplePass123!",
    user: { id: "user-auditor", name: "Arden Auditor (sample)", role: "auditor" },
  },
  "sample.registrar": {
    password: "SamplePass123!",
    user: { id: "user-registrar", name: "Riley Registrar (sample)", role: "registrar" },
  },
};

export const MOCK_USERS_BY_ROLE: Record<Role, AuthenticatedUser> = Object.values(MOCK_USERS).reduce(
  (usersByRole, { user }) => ({ ...usersByRole, [user.role]: user }),
  {} as Record<Role, AuthenticatedUser>,
);
