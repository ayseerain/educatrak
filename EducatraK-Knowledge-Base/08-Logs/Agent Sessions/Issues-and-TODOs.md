# EducatraK — Issues and TODOs

> Living engineering tracker for **EducatraK**, the student billing and payment-monitoring system for **Mendez Christian Academy**. This document is based on the inspected EducatraK repository, not on the other group's issue contents. Initial inspection: commit `d08926d5cb8c61bd157b1994137ff0459a66c80b`. Entries are **not** claims that all features are absent; re-check the latest branch before acting.

## How to use this file

- `[FIX]` — confirmed defect or implementation gap supported by code evidence.
- `[VERIFY]` — possible problem requiring reproduction, backend inspection, or a test before it can be called a defect.
- `[AUDIT]` — review/test a workflow or security boundary.
- `[DOC]` — documentation or instructions that need alignment.
- `[DECIDE]` — unanswered product, client, or engineering decision.
- `[LATER]` — valid planned work that is not yet in the current implementation.
- `[NOTE]` — relevant context; no checkbox needed.

Use `- [ ]` for open work and `- [x]` only after verification. Include a specific path, observed behavior, next step, and evidence of completion. Do not duplicate existing entries. Update the summary when status changes. For each **new agent-written entry**, record a real system-clock timestamp per `AGENTS.md`; do not invent timestamps.

## Open work at a glance

Initial tracked items: **FIX 1 · VERIFY 5 · AUDIT 3 · DOC 2 · DECIDE 3 · LATER 2**. These counts describe this tracker, **not** the full defect count of the application.

## Confirmed implementation and documentation gaps

- [ ] **[FIX] Remove or type-check the operational-page TypeScript escape hatch.** `frontend/src/features/operations/OperationalPages.tsx` begins with `// @ts-nocheck` and explicitly describes incomplete static mock server responses. Audit the affected components, introduce suitable types, and remove the bypass incrementally without breaking screens. **Done when:** the affected code is type-checked and the frontend build/tests pass.
- [ ] **[DOC] Update stale agent-instruction setup language.** `AGENTS.md` / `CLAUDE.md` say the repository is at an initial stage and warn not to assume the frontend/backend are scaffolded, although the inspected tree contains React screens and Laravel API routes. Update the wording accurately and identically in both files after checking the current structure.
- [ ] **[DOC] Keep frontend permission documentation aligned with actual role ownership.** `frontend/src/lib/permissions.ts` describes the UI capability matrix and its source; verify it still reflects approved role-specific navigation and the project specification after each RBAC change.

## Verification and testing

- [ ] **[VERIFY] Confirm full persistence and integration of student/billing workflows.** `OperationalPages.tsx` imports `mockStudents` and `mockBilling`; inspect all current routes and adapters to distinguish genuine API-backed operations from demonstrations. Do not describe mock-only data as persisted records.
- [ ] **[VERIFY] Confirm installment and follow-up records are truly synchronized with posted payments.** The frontend imports `getDueInstallments` and mock due records. Trace due amounts, installment status, overdue calculations, and follow-up updates through the real data path. Verify partial payments and oldest-due allocation against approved rules.
- [ ] **[VERIFY] Confirm notification delivery and retry behavior.** The frontend contains static notification rows with Email/SMS, queued/sent/failed statuses. Determine which flows are persisted and actually delivered; verify opt-in SMS requirements, load fees, failures, and retries without using real recipient data.
- [ ] **[VERIFY] Confirm role restrictions are enforced on every backend endpoint.** `frontend/src/lib/permissions.ts` states UI checks are not a security boundary. `backend/routes/api.php` uses capability middleware on protected routes; inspect controller and policy coverage, including response fields, for all five roles.
- [ ] **[VERIFY] Confirm security-event and administrator log data are durable.** `backend/routes/api.php` exposes `/admin/security-events` and password reset endpoints. Verify login failures, actor attribution, permissions, retention policy, and that UI 'Admin Log' entries correspond to persisted records rather than mocks.
- [ ] **[AUDIT] Test payment concurrency and receipt numbering.** Inspect `PaymentController` and underlying transaction logic for atomic payment posting, duplicate-request protection, receipt uniqueness, immutable posted transactions, and correct handling of simultaneous cashiers. Add focused backend tests where coverage is missing.
- [ ] **[AUDIT] Test void separation of duties.** The API exposes payment void-request and approval routes. Verify a Cashier cannot approve a void, Accounting approval is enforced server-side, and the original transaction and audit history remain traceable.
- [ ] **[AUDIT] Test daily close-out and Accounting sign-off.** The API exposes cashier close-out submission and Accounting sign-off routes. Verify reconciliation, role boundaries, repeat submission handling, and whether totals agree with posted transactions.

## Decisions requiring confirmation

- [ ] **[DECIDE] Deployment ownership and support.** Confirm with Mendez Christian Academy whether a school PC or dedicated local server will host the application, who maintains it, and how updates and recovery will work. Do not choose infrastructure by assumption.
- [ ] **[DECIDE] Student master-list import and annual rollover.** Confirm the registrar's file format, who performs imports, duplicate matching, student/year association, and how corrections are handled before implementing automatic changes.
- [ ] **[DECIDE] SMS notification scope and costs.** Recent commit `d08926d` adds optional SMS receipt/reminder UI/backend work. Confirm client approval, delivery dependency, consent, charges, and whether the intranet-only deployment can support it. Preserve the established email workflow where required.

## Deferred work and follow-ups

- [ ] **[LATER] Complete real-data replacement for remaining static operational fixtures.** Inventory mock imports and UI placeholders, prioritize approved cashier and accounting flows, and migrate them only after endpoint contracts and tests are ready.
- [ ] **[LATER] End-to-end regression coverage for all five role journeys.** Exercise Administrator, Cashier, Accounting Officer, Auditor, and Registrar workflows against actual role-restricted endpoints, with synthetic records only.

## Context notes

- **[NOTE]** The inspected `backend/routes/api.php` includes authenticated routes for user administration, security events, payments, void requests, and close-outs. Do **not** claim the backend has only authentication endpoints.
- **[NOTE]** `frontend/src/lib/permissions.ts` currently gives different capability sets to the five roles. Treat these as implementation evidence, not proof that every approved permission is enforced server-side.
- **[NOTE]** A repository commit message is not a substitute for executing tests or verifying behavior. Never mark an item complete based on a commit description alone.

## Entry template

```md
- [ ] **[VERIFY] Short descriptive title** — Added: <real timestamp or 'clock unavailable'>.
  Evidence: `path/to/file` or exact route/test; observed behavior.
  Next action: what to inspect, decide, implement, or test.
  Owner/decision-maker: role or 'unassigned'.
  Resolution: leave blank until verified; then add validation and commit reference.
```

## Resolved items

Move or summarize completed work here with evidence, or maintain a separate archive if this file becomes large. **No items have been marked resolved in this initial tracker.**
