# EducatraK — Approval-Gated Redundancy Refactoring Roadmap

> **Baseline:** `ecb2fd093e4bd75bf35070cd71cb030fee5dd889`, 2026-10-08. Revalidate HEAD before implementation. **Status:** Proposed execution plan, not permission to implement every phase. Owner approves **each phase** before changes and **accepts** it before proceeding.

## Nonnegotiable owner decisions

- One **Students & Billing** area, billing inside Student Profile; retain separate student and account domain entities and account history.
- Keep **the same reusable payment form** inline in Student Profile and on dedicated `/payments/new` page.
- Test Super Admin, Administrator, Cashier, Accounting Officer, Auditor, and Registrar.
- Include redundancy, access control, data consistency, and workflow completeness.
- Small independent phases, evidence-based tests, owner checkpoints. No guesswork on routes, permissions or client policy.

## Per-phase execution contract

1. Pull/read latest HEAD, repository instructions, canonical spec, audit, this roadmap, and agent manual. Compare findings with current code; mark stale items superseded.
2. Before changing code, produce a concise **phase plan** with exact files, expected behavior, unresolved questions and tests. **WAIT for owner approval.**
3. Implement **only approved phase** on a branch. Do not modify backend or silently change product requirements.
4. Run applicable typecheck, unit/component tests, build, role-route tests and manual UI/print checks when available; report skipped/unavailable checks truthfully.
5. Produce diff summary, evidence, regression results, limitations and **phase resume note**; **WAIT for owner acceptance** before starting the next phase.
6. On conflict, stop only the affected task, log question, continue safe independent work if possible.

## Phases

### Phase 0 — Baseline, traceability and decisions (P0; documentation-only)
**Goal:** Ensure current source, requirements, existing loop manual and prior cashier refactor agree. Confirm open route/navigation choices before Phase 3.
**Files:** `App.tsx`, `Sidebar.tsx`, `permissions.ts`, `OperationalPages.tsx`, tests, `00-Project-Core/`, `01-Requirements/`, `06-Decisions/`, `07-AI-Agents/`.
**Deliverables:** before/after route-role matrix, current vs intended sidebar, finding status register, confirmed open decisions and validation baseline.
**Acceptance:** no code changed; owner signs off on scope and unresolved decisions or defers affected items.

### Phase 1 — Access-control and data-leakage guards (P0)
**Findings:** R01, R02, R07. **Goal:** Stop read-only roles seeing/using payment entry and inappropriate financial/contact actions.
**Files:** `OperationalPages.tsx`, `App.tsx`, `permissions.ts`, role-specific dashboard/components, tests.
**Checks:** inline payment form only for `payment.record`; `payment.view` still sees history; Admin/Accounting/Auditor cannot record; Auditor read-only; Registrar sees no amounts, guardians or payment history; route guards and actions match.
**Acceptance:** tests for all six roles and denied deep links pass. No capability expansion.

### Phase 2 — Route-ID integrity and coherent mock records (P1)
**Findings:** R03, R04, R05, R12. **Goal:** Stop wrong-record fallback and inconsistent data across surfaces.
**Files:** `OperationalPages.tsx`, `students/mockStudents.ts`, `api/mockAdapter.ts`, typed models/selectors, tests.
**Checks:** unknown student/account/report IDs render not-found; account detail is ID-specific; school-year account relationships work; shared billing schedule/statement reflects same mock records and integer centavos; dashboard aggregates reconcile where intended.
**Acceptance:** deterministic fake fixtures, consistent values and route tests. No claim of persistence.

### Phase 3 — One Students & Billing navigation area (P1)
**Findings:** R06, R07. **Goal:** One top-level entry; account actions within student context without losing account capabilities.
**Files:** `Sidebar.tsx`, `App.tsx`, `OperationalPages.tsx`, labels, tests and approved canonical requirements update.
**Checks:** Student Profile Billing tab includes authorized account selection, creation/navigation, schedules and historical accounts; Registrar remains limited; old URLs handled per **approved** redirect/deep-link policy.
**Gate:** obtain decisions on old `/accounts` routes and multi-school-year UI **before** implementing affected changes.
**Acceptance:** all six role navigation paths and bookmarked URLs tested; no lost account wizard or detail functionality.

### Phase 4 — Shared follow-up, payment and clearance context (P2)
**Findings:** R08, R09, R13. **Goal:** Reuse logic without merging different business workflows.
**Files:** `OperationalPages.tsx`, shared typed hooks/components, tests.
**Checks:** same payment form works inline and standalone, preserves student context and duplicate-click protection; individual/batch reminder selections use same due-record logic; clearance badge and detailed lookup agree, Registrar reason amount-free; permit restricted to eligible periods.
**Acceptance:** no invented email delivery, clearance rule, or backend transaction guarantee.

### Phase 5 — Receipts, grouping and action completeness (P2/P3)
**Findings:** R10, R11, R14–R16. **Goal:** Remove misleading links and group secondary navigation without changing access.
**Files:** `Sidebar.tsx`, `OperationalPages.tsx`, `App.tsx`, i18n, tests.
**Checks:** receipt actions discoverable from payment detail; PDF/print capabilities honored; nested navigation has explicit parents; report export/admin controls either perform approved mock actions or clearly indicate unimplemented status; settings/user grouping only if approved.
**Acceptance:** no fake success states or permission leaks; existing routes still work.

### Phase 6 — Cross-role regression, documentation and handoff (P1 release gate)
**Findings:** All. **Goal:** Verify accepted work as a whole.
**Checks:** typecheck, full test suite, build, applicable E2E, role-by-route permission matrix, keyboard, 1366×768, print, no network/CDN, no real student data, no hard-coded school policy, Cash only.
**Deliverables:** before/after mapping, changed paths, test evidence, unresolved backend dependencies, reconciled docs and agent progress ledger.
**Acceptance:** owner confirms final signoff; failures and unavailable tests disclosed.

## Phase dependencies

`0 → 1 → 2 → 3 → 4 → 5 → 6`. A phase can be split into smaller approved tasks, but never skip role regression or implement a later phase without acceptance of earlier phase. A critical fix may be separately approved out of order only if the owner explicitly authorizes it.

## Owner checkpoint questions

- Before Phase 3: old `/accounts` behavior, school-year selection and deep-link strategy.
- Before Phase 5: optional settings and Users/Roles regrouping.
- Whenever canonical specification and owner navigation direction disagree: update canonical source **only with approval**, then reconcile derived views.

## Required phase handoff format

```md
# Phase N — [name]
- Current HEAD / working branch:
- Approval reference / scope:
- Finding IDs:
- Changed files and routes:
- Behavior before / after:
- Six-role checks:
- Tests run (commands + actual results):
- Tests not run / reason:
- Open decisions and backend dependencies:
- Resume Note (actual progress, not aspirational):
- Owner acceptance: PENDING
- Next phase: BLOCKED until accepted
```

**Companion documents:** `Cross-Role-Redundancy-Audit.md` and `../07-AI-Agents/Redundancy-Refactor-Loop-Engineering-Manual.md`. The existing Frontend Build-and-Audit Manual remains separate and authoritative for its own build/audit sequencing.
