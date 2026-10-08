# Redundancy Refactor — Phase 0 Baseline and Traceability

Thursday, October 08, 2026 — 23:09:54 +08:00

## Scope

Completed the approved documentation-only Phase 0 baseline, finding revalidation, cross-role traceability, and decision capture. No application or backend code changed.

## Baseline

- Branch and HEAD: `main` / `16eaf24ce045f34ffae51ac2c9324e6126a98bd9`.
- Working tree: clean before the documentation update.
- Change since the audit code baseline `ecb2fd0`: five documentation-only commits; no frontend implementation changed.
- Backend: no Laravel implementation; only `backend/.gitkeep` exists.
- Existing frontend build ledger: B01–B40 built; its separate formal cross-check/audit remains unstarted.

## Revalidation and role traceability

R01–R14 remain confirmed or partially addressed; R15–R16 remain optional regrouping proposals. The source evidence and current role/route observations were appended to `10-Quality-Audits/Cross-Role-Redundancy-Audit.md`.

Top-level route guards use `can(user, capability)`, but review identified child-action and contextual gaps to address only in their approved phases: the profile Payments tab mounts payment entry for payment-view users; account creation and statement-print actions are not consistently capability-gated; report choices are not filtered to the cashier's documented scope; and route-ID/data consistency remains unresolved.

Registrar student list/profile isolation remains source-supported: financial amounts, billing/accounts, payments, and guardian details are omitted. This is not a substitute for the planned all-five-role route/action test coverage.

## Owner decisions recorded

- Retain `/accounts`, `/accounts/new`, and `/accounts/:id` as supported secondary account-management and bookmark routes.
- Make Student Profile the primary Students & Billing context, with authorized access to current, upcoming, and historical school-year accounts and account-specific adjustments.
- Use the approved Students & Billing breadcrumb model documented in the audit revalidation.
- Reconcile canonical navigation only when Phase 3 implements the approved model.
- Keep Settings and Users/Roles separate because they retain distinct permission boundaries and workflows.

## Validation

- `npm test` — passed: 3 files, 48 tests.
- `npm run build` — passed: TypeScript build and Vite production build.
- `git diff --check` — passed before documentation changes.

## Next permitted action

Phase 0 is `WAITING_FOR_ACCEPTANCE`. Do not begin Phase 1 until the owner explicitly accepts Phase 0.
