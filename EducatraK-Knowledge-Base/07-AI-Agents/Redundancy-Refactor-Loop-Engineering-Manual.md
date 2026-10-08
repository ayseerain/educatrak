# EducatraK — Redundancy Refactor Loop-Engineering Operating Manual

> **Purpose:** A resumable, approval-gated execution ledger for an AI coding agent fixing the approved cross-role redundancy/access/data/workflow audit. **Scope:** frontend only; no Laravel/MySQL implementation. **Baseline:** `main` at `ecb2fd093e4bd75bf35070cd71cb030fee5dd889` (2026-10-08); verify current HEAD on every resume.
>
> **Read alongside:** `Frontend-Build-and-Audit-Manual.md`, `../06-Decisions/`, `../00-Project-Core/Project-Specification.md`, `../01-Requirements/`, `../05-Testing/`, `../08-Logs/`, `../10-Quality-Audits/Cross-Role-Redundancy-Audit.md`, and `../10-Quality-Audits/Redundancy-Refactoring-Roadmap.md`. Also obey repository `AGENTS.md`/`CLAUDE.md` if present.

## 0. Rules before any code

1. **Latest code first.** Check current branch, commit, working tree, and recent relevant changes. Recheck each finding against source; do not blindly apply a dated audit.
2. **Authority:** canonical spec > derived requirement views > recorded approved decisions > agent manuals/plans > historical logs/prototypes. The owner has approved the UX direction, not arbitrary edits to canonical product scope. Escalate conflicts; do not silently rewrite requirements.
3. **No invention:** no new roles, payment methods, online portal, external services, business rules, policies or backend behavior. Cash only under the currently approved implementation.
4. **Owner-approved UI:** one Students & Billing area with account information inside each student profile, distinct student/account entities; **same shared payment form stays inline AND at `/payments/new`**.
5. **Five roles:** Administrator, Cashier, Accounting Officer, Auditor, Registrar. Auditor read-only; Registrar amount-free clearance and limited student view; Administrator/Accounting cannot record payments; only authorized void approver may approve.
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
- [ ] Read current HEAD, instructions, canonical spec, role matrix, current source and recent logs.
- [ ] Revalidate audit finding IDs R01–R16 and note superseded items.
- [ ] Map all five roles × routes × sensitive fields × actions.
- [ ] List open decisions, especially account URL/deep-link and historical account display.
- [ ] Submit Phase 0 plan and **wait for approval**.
- [ ] Complete approved Phase 0 documentation and **wait for acceptance**.
- **State:** NOT_STARTED
- **Resume Note:** _Not started._
- **Owner approval:** PENDING
- **Owner acceptance:** PENDING

### P1 — Permission and sensitive data
- [ ] Plan R01/R02/R07 fixes with specific tests; wait for approval.
- [ ] Gate inline `PaymentWorkflow` by `payment.record`, retain read-only history.
- [ ] Verify Admin/Accounting/Auditor/Registrar route and action restrictions.
- [ ] Run role-based tests, typecheck and build; record actual output.
- [ ] Submit evidence; wait for acceptance.
- **State:** NOT_STARTED
- **Resume Note:** _Not started._
- **Owner approval:** PENDING
- **Owner acceptance:** PENDING

### P2 — Route integrity and shared mock data
- [ ] Plan R03/R04/R05/R12; wait for approval.
- [ ] Remove unknown-ID fallback and hard-coded account detail identity.
- [ ] Establish coherent typed fake account/student/payment fixtures and selectors.
- [ ] Share billing/statement data and components without mixing school years.
- [ ] Test invalid IDs, amount consistency, role visibility; wait for acceptance.
- **State:** NOT_STARTED
- **Resume Note:** _Not started._
- **Owner approval:** PENDING
- **Owner acceptance:** PENDING

### P3 — Students & Billing consolidation
- [ ] Confirm old `/accounts` route, deep-link and multi-school-year decisions; wait for approval.
- [ ] Present one Students & Billing sidebar entry with student directory.
- [ ] Surface billing and account actions within student profile for permitted roles.
- [ ] Preserve account creation/detail and historical account identity.
- [ ] Run five-role navigation and bookmark regression; wait for acceptance.
- **State:** NOT_STARTED
- **Resume Note:** _Not started._
- **Owner approval:** PENDING
- **Owner acceptance:** PENDING

### P4 — Payment, follow-up and clearance context
- [ ] Plan R08/R09/R13; wait for approval.
- [ ] Keep shared payment form both inline and standalone.
- [ ] Share due-record/reminder logic while preserving batch vs individual actions.
- [ ] Reconcile clearance badge, detailed periods and permitted exam prints.
- [ ] Test role, context and duplicate-click behavior; wait for acceptance.
- **State:** NOT_STARTED
- **Resume Note:** _Not started._
- **Owner approval:** PENDING
- **Owner acceptance:** PENDING

### P5 — Receipts, navigation and secondary cleanup
- [ ] Plan R10/R11/R14–R16; obtain approval for optional regrouping.
- [ ] Place receipt discovery in payment context without losing authorized print/PDF.
- [ ] Use explicit nested nav parent-child relationships and role-filtered tabs.
- [ ] Resolve misleading placeholder actions; group settings/users only if approved.
- [ ] Run route, action and accessibility tests; wait for acceptance.
- **State:** NOT_STARTED
- **Resume Note:** _Not started._
- **Owner approval:** PENDING
- **Owner acceptance:** PENDING

### P6 — Full regression and handoff
- [ ] Plan final validation; wait for approval.
- [ ] Run typecheck, full tests, build, applicable E2E and role-route matrix.
- [ ] Verify 1366×768, keyboard, print, no CDN, fake data, Cash-only, configurable policy.
- [ ] Reconcile canonical docs **only for explicitly approved product changes**; record backend dependencies.
- [ ] Deliver final before/after mapping and validation report; wait for acceptance.
- **State:** NOT_STARTED
- **Resume Note:** _Not started._
- **Owner approval:** PENDING
- **Owner acceptance:** PENDING

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
