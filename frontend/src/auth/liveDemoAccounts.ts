import type { Role } from "@/lib/types";

/**
 * Local-development credentials created by DemoDataSeeder. This module is
 * imported only from a Vite DEV branch, so production assets cannot include
 * the shared fixture password.
 */
export const LIVE_DEMO_CREDENTIALS: Record<Role, { username: string; password: string }> = {
  super_admin: { username: "sample.superadmin", password: "SamplePass123!" },
  administrator: { username: "sample.admin", password: "SamplePass123!" },
  cashier: { username: "sample.cashier", password: "SamplePass123!" },
  accounting: { username: "sample.accounting", password: "SamplePass123!" },
  auditor: { username: "sample.auditor", password: "SamplePass123!" },
  registrar: { username: "sample.registrar", password: "SamplePass123!" },
};
