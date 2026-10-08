# EducatraK — Cross-Role Redundancy and Workflow Audit

> **Status:** Reviewed proposal, not a replacement for approved requirements. **Baseline:** `main` at `ecb2fd093e4bd75bf35070cd71cb030fee5dd889` (2026-10-08). **Method:** Source and documentation inspection; no new runtime test or backend verification. Recheck current HEAD before each phase.
>
> **Owner decisions:** (1) One **Students & Billing** area with billing inside each Student Profile; retain distinct student/account records. (2) Retain the **same shared payment form inline** in Student Profile and at `/payments/new`. (3) Cover Administrator, Cashier, Accounting Officer, Auditor, Registrar. (4) Include duplication, access control, data consistency, and workflow gaps. (5) Small independently testable phases with owner approval gates.

## Authority and scope

Read `00-Project-Core/Project-Specification.md`, `01-Requirements/`, `05-Testing/`, `06-Decisions/`, and current `frontend/src/`. The prior `09-References/Frontend-Prototype/` is historical, not live source. The current `07-AI-Agents/Frontend-Build-and-Audit-Manual.md` is a **separate build/audit loop**; this document covers targeted post-refactor remediation, not a declaration that its formal audit phase is complete. Where the owner-approved navigation decision conflicts with the canonical screen inventory, obtain documented approval and reconcile the canonical specification before treating new routes as requirements.

**Evidence categories:** `Verified source` = identifiable implementation; `Prototype gap` = UI exists but behavior/data are mock or incomplete; `Proposed consolidation` = design choice, not automatically a defect; `Backend dependency` = cannot be established by frontend changes.

## Findings register

| ID | Priority | Category / status | Evidence and current behavior | Required disposition |
|---|---|---|---|---|
| R01 | P0 | Access control / verified source | `StudentProfileTabs` includes Payments for `payment.view || payment.record`, while `StudentPaymentsPanel` always mounts `PaymentWorkflow` in `frontend/src/features/operations/OperationalPages.tsx`. | Show history to `payment.view`, inline form only to `payment.record`; verify all five roles and server-side dependency. |
| R02 | P0 | Sensitive UI / verification required | Role-specific `can()` checks exist, but sensitive child components, print/export and action affordances require full audit; route guards alone do not cover child actions. | Test Registrar amount/contact isolation; Auditor read-only; Accounting-only void approvals; Admin cannot record payments. Do not assert an exploit without test. |
| R03 | P1 | Route integrity / verified source | `StudentProfilePage` falls back to `students[0]` for an unknown ID; `AccountDetailPage` renders a fixed sample regardless of `/accounts/:id`. | Resolve by route ID, render not-found/empty states; never display another student's/account's data. |
| R04 | P1 | Data consistency / verified source | `OperationalPages.tsx` has independently hard-coded billing, installment, report and receipt rows; `frontend/src/api/mockAdapter.ts` independently seeds dashboard payment activity. | Introduce coherent typed mock records/selectors and shared account/student/payment IDs; derive totals and states from those records. |
| R05 | P1 | UI duplication / verified source | `StudentBillingPanel` and `AccountDetailPage` independently show balance and installment tables. | Reuse account summary and installment components, with school-year/account selection. |
| R06 | P1 | Navigation / owner-approved proposal | `Sidebar.tsx` has separate Students and Accounts links; `App.tsx` has separate `/students` and `/accounts` routes. | One Students & Billing entry; billing inside Student Profile; preserve account wizard, detail, cross-year records and authorized deep links until redirect policy approved. |
| R07 | P1 | Role navigation / verification required | Sidebar links are filtered by one capability each, while nested pages can have different read/write access. | Test direct navigation and grouped child tabs for all five roles, including accounting/auditor read-only access. |
| R08 | P2 | Follow-up / proposed consolidation | `StudentFollowupWidget` and `FollowupPage` present individual versus batch reminders using separate UI and sample records. | Share due-record selection and reminder preparation logic, keep single-student and batch contexts. |
| R09 | P2 | Clearance / proposed consolidation | Student overview shows clearance status; `ClearancePage` provides period-specific lookup. | Keep badge as summary and one detailed lookup source; preserve Registrar amount-free reasons and permit eligibility. |
| R10 | P2 | Receipt discovery / proposed consolidation | `ReportsHubPage` links to receipt PDF while `PaymentDetailPage` and receipt print routes already provide payment context. | Place receipt access primarily with payment detail; keep any documented report route/access contract. |
| R11 | P2 | Navigation nesting / verified source | `Sidebar.tsx` determines nested styling from presence of either `/closeout` or `/followup` in the same group. | Model explicit parent-child relationships, filtered per capability. |
| R12 | P2 | Report integrity / prototype gap | `ReportPage` uses static report rows; `/reports/student/:id` renders `StudentStatementTable` without selecting student by ID. | Use actual route student context, shared statement view and coherent mock data. |
| R13 | P2 | Workflow completeness / prototype gap | `AccountWizardPage`, `ImportPage`, `CloseoutPage`, `VoidsPage` include illustrative steps/buttons rather than proven durable operations. | Inventory each control, distinguish real/mock/placeholder; address only within approved frontend scope and typed mock/API contracts. |
| R14 | P2 | Action affordances / prototype gap | Report export and several administrative/action controls lack verified implementations. | Either implement approved mock behavior and tests or explicitly disable/label unsupported actions; do not simulate successful backend operations. |
| R15 | P3 | Settings / proposed consolidation | Six settings routes are handled by one `SettingsPage` with different role editing permissions. | Consider grouped settings navigation; do not merge permission boundaries or remove deep links without approval. |
| R16 | P3 | User administration / proposed consolidation | `/admin/users` and `/admin/roles` are related but separate. | Optional Roles & Permissions tab, read-only matrix; Admin-only access remains. |

## Already addressed in current code — preserve

- Shared `PaymentWorkflow` is used inline and by `/payments/new`; do **not** replace inline with a button-only redirect.
- Student Profile tabs: Overview, Billing, Payments, Follow-up.
- Shared `StudentStatementTable` between profile and report; verify correct student data before claiming end-to-end consistency.
- Reminders & Notifications and Daily Close-out have tab-based grouping; do not recreate old separate workflows.
- Frontend saving state prevents repeat clicks **within an active form**; it is not backend idempotency.

See `08-Logs/2026-10-08-cashier-ui-refactor.md` for prior validation claims; rerun tests on every new change.

## Role invariants

| Role | Required constraints |
|---|---|
| Cashier | Can manage permitted students/accounts, record cash payments, request void, follow up, close out, import; cannot approve own void. |
| Accounting Officer | Financial oversight, configured finance settings, void approval and close-out signoff; no payment recording. |
| Administrator | User/system administration, permitted records and settings; no payment recording. |
| Auditor | Read-only; no submit, send, retry, create, approve, modify, or record actions. |
| Registrar | Limited student/clearance lookup and permitted exam print; no financial amounts, payment history, guardian contacts, billing accounts. |

Frontend checks are **not** backend authorization. The backend directory has no implemented Laravel app at this baseline. Concurrency, atomic receipt numbers, idempotency, and durable writes remain backend dependencies.

## Preserve distinct business responsibilities

Students are identity/guardian records; billing accounts are per-student/per-school-year obligations. Transaction history is not a daily collection report. Reminder preparation is not notification delivery history. Receipt printing is not void approval. Clearance/permit decisions are not the same as a balance badge. Ledger import is not manual account creation. Never remove no-hard-delete/audit and separation-of-duties constraints.

## Open decisions — stop the affected work, do not guess

1. Whether `/accounts` remains a filtered account index, redirects to Students & Billing, or becomes an internal view.
2. How multiple school-year accounts and account-level adjustments are surfaced within a Student Profile.
3. Exact deep-link and breadcrumb behavior for old account URLs.
4. Whether settings and Users/Roles regrouping is desired after high-priority fixes.
5. Any discrepancy between this approved UI consolidation and canonical screen/route requirements.
6. Existing product decisions in `06-Decisions/Open-Decisions.md`; do not silently settle them.

## Verification and audit limits

Review was static, with no browser walkthrough, test execution or backend test. `R01` and `R03` are supported by code structure; role exposure should still be verified by tests. Other recommendations must be revalidated against fresh HEAD and actual usage. No code or permission changes are authorized by this document alone.

**Execution guide:** `../07-AI-Agents/Redundancy-Refactor-Loop-Engineering-Manual.md`. **Phases:** `Redundancy-Refactoring-Roadmap.md`.

## Phase 0 revalidation — `16eaf24` (2026-10-08)

The current branch was rechecked at `main` / `16eaf24ce045f34ffae51ac2c9324e6126a98bd9`. The five commits after the original code baseline (`ecb2fd0`) only added or indexed the redundancy-refactor documentation; no frontend implementation files changed. The working tree was clean. `npm test` passed all 48 tests and `npm run build` passed.

| Finding status | IDs | Current-source conclusion |
|---|---|---|
| Confirmed | R01, R03, R04, R06, R07, R11, R12, R13, R14 | The inline profile payment form remains ungated; unknown student IDs fall back to the first record; account detail is fixed rather than ID-specific; mock financial rows and several action controls remain independent/static; Students and Accounts remain separate primary links; nested navigation is inferred; and report route context is not used. |
| Partially addressed | R05, R08, R09, R10 | The shared statement table and the profile payment workflow are retained, but account summaries, follow-up data, clearance data, and receipt discovery are not yet consistently shared or contextual. |
| Requires later approval | R15, R16 | Settings grouping and a Users/Roles regrouping remain optional proposals; neither is a defect that authorizes a navigation change. |

No finding was superseded. Source review also confirmed an R02 child-action gap: `AccountsPage` always shows Create account to account viewers, `StudentStatementWidget` always exposes Print, and the Reports Hub is not role-filtered. Registrar profile/list financial and guardian isolation is source-supported, and all application routes retain top-level capability guards; the role-by-route/action regression suite is still required before access claims are treated as complete.

### Approved Phase 0 decisions

1. **`/accounts` strategy:** Keep `/accounts`, `/accounts/new`, and `/accounts/:id` as supported secondary account-management routes and bookmark targets. Remove neither route nor capability. In the eventual Students & Billing navigation, Student Profile is the primary context; the account directory remains an available secondary view rather than a competing top-level sidebar destination.
2. **Account history and future records:** Student Profile billing will present the current account first and allow authorized users to read historical and upcoming school-year account records. Account adjustments remain attached to their specific account and retain their audit context. Cashier account creation will remain available in the student context for the appropriate school year.
3. **Breadcrumbs:** Use `Students & Billing > [Student] > Billing` for profile context and `Students & Billing > Accounts > [account or action]` for retained account URLs. A retained account deep link must resolve its actual account identity; it must never substitute a different student's record.
4. **Canonical reconciliation:** The owner authorized reconciling the canonical route/navigation inventory when Phase 3 implements the approved Students & Billing model. Until then, the existing canonical routes remain supported.
5. **Settings and Users/Roles:** Keep them separate. Their current screens serve distinct permission boundaries and workflows; no redundancy reduction presently justifies regrouping.

## Phase 1 implementation — `16eaf24` worktree (2026-10-08)

Phase 1 implemented the approved R01/R02/R07 scope without adding roles, capabilities, routes, payment methods, or backend behavior.

- **R01 — resolved in the frontend:** `StudentPaymentsPanel` now receives the authenticated user and mounts the shared `PaymentWorkflow` only for `payment.record`. Users with `payment.view` retain the payment-history table.
- **R02 — partially addressed:** Account creation and profile statement printing are hidden unless the respective existing capability permits them. Cashier report discovery and direct monthly/outstanding navigation now respect the canonical limited-report scope. Broader sensitive-child/action auditing remains necessary in later phases.
- **R07 — partially addressed:** Report route policy is applied in addition to the existing route capability guard, and sidebar nesting now uses explicit parent metadata after role filtering. Full cross-role regression remains a Phase 6 release gate.

Validation: `npx vitest run src/test/operations.test.tsx` passed (20 tests); `npm test` passed (52 tests); `npm run build` passed.
