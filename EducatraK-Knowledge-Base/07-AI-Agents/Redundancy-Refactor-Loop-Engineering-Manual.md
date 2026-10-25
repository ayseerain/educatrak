# EducatraK — Redundancy Refactor Loop-Engineering Operating Manual

> **Purpose:** A resumable, approval-gated execution ledger for an AI coding agent fixing the approved cross-role redundancy/access/data/workflow audit. **Scope:** frontend only; no Laravel/MySQL implementation. **Baseline:** `main` at `ecb2fd093e4bd75bf35070cd71cb030fee5dd889` (2026-10-08); verify current HEAD on every resume.
>
> **Read alongside:** `Frontend-Build-and-Audit-Manual.md`, `../06-Decisions/`, `../00-Project-Core/Project-Specification.md`, `../01-Requirements/`, `../05-Testing/`, `../08-Logs/`, `../10-Quality-Audits/Cross-Role-Redundancy-Audit.md`, and `../10-Quality-Audits/Redundancy-Refactoring-Roadmap.md`. Also obey repository `AGENTS.md`/`CLAUDE.md` if present.

## 0. Rules before any code

1. **Latest code first.** Check current branch, commit, working tree, and recent relevant changes. Recheck each finding against source; do not blindly apply a dated audit.
2. **Authority:** canonical spec > derived requirement views > recorded approved decisions > agent manuals/plans > historical logs/prototypes. The owner has approved the UX direction, not arbitrary edits to canonical product scope. Escalate conflicts; do not silently rewrite requirements.
3. **No invention:** no new roles, payment methods, online portal, external services, business rules, policies or backend behavior. Cash only under the currently approved implementation.
4. **Owner-approved UI:** one Students & Billing area with account information inside each student profile, distinct student/account entities; **same shared payment form stays inline AND at `/payments/new`**.
5. **Six roles:** Super Admin, Administrator, Cashier, Accounting Officer, Auditor, Registrar. Current role simplification supersedes older access snapshots: Super Admin owns governance, protected user lifecycle, security events and read-only audit; Administrator owns day-to-day system/user/backup/security controls; Cashier owns daily student/payment/follow-up/close-out work; Accounting owns finance operations/reports/settings; Auditor has Audit Review only; Registrar has limited clearance identity search and no general student directory/profile. Auditor is read-only; only the authorized Accounting approver decides voids.
6. **No false backend claims:** UI double-click prevention is not atomic multi-cashier safety. Laravel/MySQL transaction locks, idempotency, sequential receipts and durable authorization are backend dependencies.
7. **No destructive cleanup:** preserve supported routes/deep links until an approved migration decision, financial history, audit behavior, void separation, printable documents, and existing accessible workflows.
8. **Tests are evidence, not assumptions:** run actual commands; record exact results. Never mark a phase complete based on intended work.

## 1. Approval-gated loop

**Mandatory state machine:**
`NOT_STARTED → PLAN_READY → WAITING_FOR_APPROVAL → APPROVED → IMPLEMENTING → VALIDATING → WAITING_FOR_ACCEPTANCE → ACCEPTED`.

- Start with **one** phase, not all phases. Read roadmap and scope, produce an exact-file plan and any blocking questions.
- Set `WAITING_FOR_APPROVAL` and **stop**. No implementation before explicit owner approval.
- After approval, implement only that phase in a dedicated branch/commit; update tests and documentation as necessary.
- Run validation; disclose failures and limitations. If failures remain, keep `VALIDATING` and fix within approved scope.
- Summarize diff, before/after, tests, role checks, unresolved issues and next actions. Set `WAITING_FOR_ACCEPTANCE` and **stop**.
- Start next phase **only after explicit acceptance**. Do not interpret silence as approval.
- If context is low, fill Resume Notes and stop at a safe point; never claim a completed phase without evidence.

## 2. Progress ledger

**Checkboxes are initially unchecked intentionally.** Fill a Resume Note only after actual progress; do not fabricate timestamps. When repository instructions require timestamps, read the real clock at writing time.

### P0 — Baseline and traceability
- [x] Read current HEAD, instructions, canonical spec, role matrix, current source and recent logs.
- [x] Revalidate audit finding IDs R01–R16 and note superseded items.
- [x] Map all six roles × routes × sensitive fields × actions.
- [x] List open decisions, especially account URL/deep-link and historical account display.
- [x] Submit Phase 0 plan and **wait for approval**.
- [x] Complete approved Phase 0 documentation and **wait for acceptance**.
- **State:** ACCEPTED
- **Resume Note:** At `main` / `16eaf24ce045f34ffae51ac2c9324e6126a98bd9`, the working tree was clean and the five commits after the audit code baseline were documentation-only. R01–R14 remain confirmed or partially addressed as recorded in the Phase 0 revalidation; R15–R16 remain optional proposals requiring a later approval. The owner approved the documentation-only phase and decided to retain `/accounts` as a supported secondary account directory/deep link, with Student Profile as the primary Students & Billing context. Profile billing must support current, upcoming, and historical school-year account records; Settings and Users/Roles remain separate. See the audit revalidation and the 2026-10-08 Phase 0 log. No application code changed. Revalidated the current six-role map and permission tests on Sunday, October 25, 2026 — 12:06:10 +08:00: Super Admin has a governance-only path, and the other five roles retain their approved workspace boundaries.
- **Owner approval:** Granted in the current task conversation.
- **Owner acceptance:** ACCEPTED in the current task conversation.

### P1 — Permission and sensitive data
- [x] Plan R01/R02/R07 fixes with specific tests; wait for approval.
- [x] Gate inline `PaymentWorkflow` by `payment.record`, retain read-only history.
- [x] Verify Super Admin, Administrator, Cashier, Accounting Officer, Auditor, and Registrar route and action restrictions.
- [x] Run role-based tests, typecheck and build; record actual output.
- [x] Submit evidence; wait for acceptance.
- **State:** ACCEPTED
- **Resume Note:** With owner approval in the current task conversation, Phase 1 made no capability expansion. Student Profile passes the authenticated user into billing/payment content; the shared payment form now renders only with `payment.record`, while permitted payment history remains visible. Account creation and profile statement printing are capability-gated. `canViewReport` preserves Cashier access only to daily reports and student statements, filters the Reports Hub, and protects direct monthly/outstanding URLs. Sidebar children now identify their explicit parent and are indented only when that visible parent is present. Initial phase coverage included five roles; current six-role coverage adds Super Admin governance grants and explicit denials for operational capabilities. `npx vitest run src/test/operations.test.tsx` passed (20 tests); `npm test` passed (52 tests); `npm run build` passed. See the Phase 1 implementation log. Updated Sunday, October 25, 2026 — 12:06:59 +08:00: Super Admin is included in the primary-capability checks for all six roles; focused operations tests pass (47 tests) and the full frontend suite passes (169 tests across 26 files).
- **Owner approval:** Granted in the current task conversation.
- **Owner acceptance:** ACCEPTED under the user's continuous-execution directive.

### P2 — Route integrity and shared mock data
- [x] Plan R03/R04/R05/R12; execute under the continuous-execution directive.
- [x] Remove unknown-ID fallback and hard-coded account detail identity.
- [x] Establish coherent typed fake account/student/payment fixtures and selectors.
- [x] Share billing/statement data and components without mixing school years.
- [x] Test invalid IDs, amount consistency, role visibility.
- **State:** COMPLETE
- **Resume Note:** Added `mockBilling.ts` with typed accounts, schedules, payments, and selectors; profile, account, payment, follow-up, and student-statement routes now use it. Unknown student/account/statement IDs render Not Found. R04 is resolved: dashboard activity, cashier account summaries, and Accounting totals now project from the canonical synthetic billing records. Account payment amounts and allocations reconcile to account totals. Focused dashboard/billing tests pass (26 tests); full frontend tests pass (150 tests across 25 files); TypeScript production build passes; production asset verification confirms 40 development fixture/contact/credential markers are absent from four JavaScript assets. Browser acceptance remains tracked under U12.
- **Owner approval:** Continuous-execution directive in the current task conversation.
- **Owner acceptance:** Not required for this execution run.

### P3 — Students & Billing consolidation
- [x] Confirm old `/accounts` route, deep-link and multi-school-year decisions.
- [x] Present one Students & Billing sidebar entry with student directory.
- [x] Surface billing and account actions within student profile for permitted roles.
- [x] Preserve account creation/detail and historical account identity.
- [x] Run role-aware navigation/component regression.
- **State:** COMPLETE
- **Resume Note:** Removed Accounts from the primary sidebar while preserving `/accounts`, `/accounts/new`, and `/accounts/:id` as supported secondary/deep-link routes. Profile Billing now shows current, upcoming, and historical school-year accounts and a Cashier-only Create account action.
- **Owner approval:** Continuous-execution directive in the current task conversation.
- **Owner acceptance:** Not required for this execution run.

### P4 — Payment, follow-up and clearance context
- [x] Plan R08/R09/R13 and execute independent, approved work.
- [x] Keep shared payment form both inline and standalone.
- [x] Share due-record logic for individual profile follow-up.
- [ ] Reconcile clearance badge, detailed periods and permitted exam prints.
- [x] Test payment/context/duplicate-click behavior.
- **State:** PARTIALLY_COMPLETE
- **Resume Note:** Payment form preservation and individual follow-up due-record sharing are complete. Batch follow-up, clearance lookup, permit eligibility, and illustrative workflow actions still use separate static/mock behavior; these remain explicit frontend limitations rather than fabricated durable operations.
- **Owner approval:** Continuous-execution directive in the current task conversation.
- **Owner acceptance:** Not required for this execution run.

### P5 — Receipts, navigation and secondary cleanup
- [x] Plan R10/R11/R14–R16 under the continuous-execution directive.
- [x] Place receipt discovery in payment context without losing authorized print/PDF.
- [x] Use explicit nested nav parent-child relationships and role-filtered tabs.
- [ ] Resolve every illustrative placeholder action.
- [x] Keep Settings and Users/Roles separate per the recorded owner decision.
- **State:** PARTIALLY_COMPLETE
- **Resume Note:** Reports Hub no longer duplicates receipt discovery; payment detail retains it. Explicit sidebar parents replace inferred nesting. Settings and Users/Roles remain separate by decision. Static export/import/settings/administrative mock actions remain R14 limitations and are not represented as backend-complete workflows.
- **Owner approval:** Continuous-execution directive in the current task conversation.
- **Owner acceptance:** Not required for this execution run.

### P6 — Full regression and handoff
- [x] Plan final validation under the continuous-execution directive.
- [x] Run typecheck, full tests, build, and available role/component regression.
- [ ] Verify browser-only viewport, print-preview, and E2E checks (no runnable E2E/browser harness is present).
- [x] Reconcile affected audit/ledger documentation and record backend dependencies.
- [x] Deliver final implementation and validation report.
- **State:** PARTIALLY_COMPLETE
- **Resume Note:** `npm test` passed 55 tests and `npm run build` passed. No E2E command, browser viewport harness, or print-preview automation exists in the repository; those checks are recorded as unavailable. See the Phase 2–6 log for resolved and blocked findings.
- **Owner approval:** Continuous-execution directive in the current task conversation.
- **Owner acceptance:** Not required for this execution run.

## 3. Per-phase resume template

```md
## Resume — Phase [N]
- Actual timestamp (read system clock):
- Branch / HEAD:
- Current state:
- Approved scope and approval reference:
- Completed checkboxes (evidence):
- Files/routes changed:
- Commands/tests actually run and results:
- Role checks completed / pending:
- Open blockers and decisions:
- Owner acceptance: PENDING / ACCEPTED (evidence):
- Next permitted action:
```

## 4. Stop conditions

Stop the affected work and ask the owner when: a canonical requirement conflicts with proposed navigation; a route migration/old link policy is undecided; school-year account display is unclear; role capabilities are disputed; a required backend behavior would be fabricated; or a phase expands beyond approved scope. Safe independent work may continue within the **same approved phase**, but never auto-advance.

## 5. Relationship to the existing frontend loop manual

The existing `Frontend-Build-and-Audit-Manual.md` governs initial screen build and its formal **build-all-before-cross-check** sequence. This manual is a **separate targeted remediation loop** for findings in current implemented code. Do not mark the original manual's Phase 2 formal audit completed merely because this refactor's checks pass. Keep ledgers consistent and report any conflict.

## 6. First action for a coding agent

**Read current HEAD and the companion audit/roadmap. Produce Phase 0 evidence map and an approval request. Do not edit application code or proceed to Phase 1 until the owner explicitly approves the applicable phase.**
