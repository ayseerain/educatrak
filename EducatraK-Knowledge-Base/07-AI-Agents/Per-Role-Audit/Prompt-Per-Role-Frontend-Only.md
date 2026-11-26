# PROMPT — EducaTrak PER ROLE AUDIT: Frontend-Only Remediation

## Owner clarification baseline (2026-11-25)
Read `Per-Role-Owner-Decisions-2026-11-25.md` before implementing. The owner has already answered D1–D4; do not re-ask them. See that file for narrow unresolved sub-decisions. The original `PER ROLE AUDIT.md` is retained unchanged as the issue inventory.

## Role, authority, and execution gate
You are the **frontend implementation agent**. Reconcile and fix the frontend-scope issues named in the source `PER ROLE AUDIT.md`, guided by the **verified** `EducatraK-Knowledge-Base/10-Quality-Audits/Per-Role-Audit-Report.md`. If the formal report is absent, or source evidence and owner approvals are missing for a risky issue, complete a **read-only reconciliation first**, log the blocker, and continue safe independent UI items only. Do not treat the preliminary triage as final test evidence.

**STRICT FILE BOUNDARY:** application code changes only under `frontend/`. You may update canonical audit report status, required central changelog, issue tracker and task-specific logs per `AGENTS.md`, but **do not modify anything in `backend/`, database schema/migrations, Laravel API, server configuration, role permissions, financial policies, or live data**. Do not generate or rewrite financial totals in the UI to mask backend faults. No new dependencies without justification/approval. No Git pull, checkout, merge, commit, push, stash, reset or rebase without explicit instruction. Verify checkout/working tree and retain user edits.

## Preparation
Read `AGENTS.md`, `CLAUDE.md`, relevant `01-Requirements/`, `03-Design/UX-and-Design-System.md`, accepted `06-Decisions/` (especially `2026-11-22-srs-v3-policy-confirmations.md` and `Open-Decisions.md`), current audit report, relevant `08-Logs/`, current frontend loop and skill metadata under `.agents/skills/`; open only relevant skill instructions (table, pagination, action, modal, date, print, status, sidebar). Inspect both mock and live pathways. `zekuuu/cliniq` may inform visual patterns only and may not supersede EducaTrak.

## Frontend work queue (stable IDs)

### Super Admin and Administrator dashboards
- `SA-01`, `SA-02`, `ADM-01`: In `frontend/src/features/dashboard/` (`SuperAdminDashboard.tsx`, `AdminDashboard.tsx`, `StaffAccountOverview.tsx`, `AuditActivityPreview.tsx`, `DashboardPage.tsx`, hooks, API adapters), trace actual returned fields and repair only frontend mapping, filters, loading/error/empty, count formatting and presentation problems backed by audit evidence. Use synthetic cross-role fixtures; if Laravel response is wrong/missing, mark **BACKEND BLOCKED**, document contract and do not manufacture data.
- `SA-03`, `ADM-09`: `/admin/backup` uses `frontend/src/api/backupApi.ts` and the Backup page in `OperationalPages.tsx`. Provide accurate user-safe 409/503/schema error display, retry and capability-aware states without hiding a backend `SQLSTATE[42S22]`. Do not edit the DB or promise that an error banner fixes it. Super Admin remains read-only; Administrator's Run control appears only when configured and authorized.

### Administrator user and school settings
- `ADM-02`: `/admin/users` Archived view: fix expanded `TableActionButton`/`TableActionGroup` column width and overflow at 1440/1366/768/390, focus and touch. Preserve user archive/restore safeguards. Use existing scroll/pagination patterns, not arbitrary clipping.
- `ADM-03`: `/settings/school`: reproduce date picker selection not applying. Test controlled inputs, date format `YYYY-MM-DD`, `DropdownSelect`/native picker differences, React state, submitted body and API response/error; do not shift calendar dates due to timezone. Report backend faults separately.
- `ADM-04`: accessible pagination for school-year cards and compact contextual hover/focus actions. Keep school-year and term editing safeguards and current-year indicators; keep filter/page state stable.
- `ADM-05`: **ARCHIVE INTENT APPROVED (NO DELETE)**. The owner specifies non-current school years go to an **Archived school years** view so mistaken labels/entries can be identified and corrected. Do not delete rows. Design the archive/current view and non-current-only affordance using existing School Settings visual patterns; enable the archive write only after the authoritative backend contract, dependency safeguards and correct restore/correction semantics exist and are approved. Do not simulate persistence with component-only state. **Term removal/archive is still undecided**: preserve current term behavior and block that sub-action until independently defined. Current school year is never archive-eligible; linked billing, dates and history must remain safe.
- `ADM-06`: **CONFIRMED: one grade at a time on the SAME `/settings/school` page**. Change the visible grade-specific table through an accessible in-page pager/selector (no new URLs and no 13 simultaneously expanded grade tables). Preserve exact Kinder–Grade 12 order, section lists, grade indication, no-sections state and current selection across successful edits/refetches when possible.
- `ADM-07`, `ADM-08`: conditionally provide per-section Actions column (Edit and Archive) and a distinct Archived view analogous to current/archived Users. **Do not implement fake archive or restore**; confirm whether it means `active=false` and API supports it. Preserve IDs, student references and per-role actions; if backend operation is absent, block only the action and make state clear rather than silently simulating persistence.

### Cashier
- `CSH-01`: `/students` convert plain enrollment status text to the existing `StatusBadge`, with correct canonical status mapping.
- `CSH-02`: show the 12-digit LRN directly below student name in `/students`, consistent with `/accounts` student cell; preserve accessible copy/search and avoid a redundant visible LRN column **only if** regression review approves it.
- `CSH-03`: `/accounts` use canonical `StatusBadge` for financial account status, not a text-only CSS workaround.
- `CSH-04`: `/accounts/:id` Payments and Adjustments widgets: validate adapters, React Query cache/invalidation and render mapping against API and receipt/payment/allocation/adjustment detail; repair only client-side defects, not amounts or records. If API wrong, emit exact BE contract ticket.
- `CSH-05`: `/payments/:id` audit trail event labels in sentence/title case for display only; keep audit event keys and stored evidence unchanged.
- `CSH-06`: add/replace a summary metric **Receipt Notification** horizontally with Student, Amount, Method, Status (five aligned metrics). Remove the redundant KPI near audit trail, rebalance desktop/mobile layout. Derive notification state only from existing API and distinguish queued/sent/failed/not sent/multiple channels; do not invent delivery confirmation.
- `CSH-07`: retain safe policy/config-blocked reminder behavior; show truthful explanation and approved statuses, never bypass `VITE_REMINDER_DELIVERY_ENABLED` or backend gates.
- `CSH-08`: **CONFIRMED NAME-ONLY CHANGE**. Rename the top-level Follow-up page/sidebar heading to **Notifications**. Keep `/followup`, `/notifications` redirect, deep links and both existing **Follow-up** and **Notification log** subviews, their actions, permissions and delivery gates. Do not rename API routes or change reminder behavior. Do not retitle internal subviews unless required for a correct top-level name display.
- `CSH-09`: rename visible "Opening-balance import" to **Import** on the Cashier financial import entry (`/import`), keeping supporting description "opening-balance conversion" to distinguish it from Registrar `/students/import` and avoid suggesting historical-payment import.
- `CSH-10`: **CONFIRMED — NO LEDGER RULE REVISIONS**. Preserve currently approved opening-balance CSV conversion, cutover-pending notices, per-row states, preparer/reviewer separation, storage-only recording, conflict handling and existing controls exactly as authorized. No functional frontend remediation under `CSH-10`; only review for accidental changes and retain explanatory context after the `CSH-09` top-level title rename.

### Accounting
- `ACC-01`: verify Accounting `CollectionTrend.tsx` and dashboard adapters for date range, empty states, cents-to-currency conversion, role scope and plotted days; fix FE only, hand off backend aggregation issues.
- `ACC-02`: `LivePaymentsPage.tsx` heading **Payments** instead of **Payment review**. Keep `/payments` route, existing filters and privileges; audit breadcrumbs/sidebar and translation usage.
- `ACC-03`: show **one grade-fee group at a time within `/settings/fees`**, adopting the same in-place grade-switching pattern confirmed for Administrator School Settings; no per-grade routes. Preserve fee-item pagination inside selected grade, school-year context, existing fee data, permissions and payment-plan versioning. Do not delete meaningful actions or break multi-school-year selection.
- `ACC-04`: display grade-fee status badge adjacent to the grade name (not beside Add fee item), maintain all status/availability semantics.
- `ACC-05`: red/destructive `TableActionButton` for fee-item Deactivate, preserving disabled states and existing confirmation safeguards.
- `ACC-06`: `LiveVoidsPage.tsx` inline decision note becomes accessible confirmation **modal/dialog**, with current validation, role checks, separation of duties and error handling preserved; no direct API changes.
- `ACC-07`: use existing `ViewTabs` for **Pending requests** and **Void history** (approved + rejected), with counts, pagination, status badges and existing API data. No deletion or mutating history.
- `ACC-08`: Accounting `/settings/school` uses the **same** Administrator presentation in read-only mode; no Add/Edit/Archive/Remove controls or capability changes.
- `ACC-09`: audit `/reports`, `/reports/daily`, `/reports/monthly` summary widgets and `reportApi.ts` adapters. Reconcile numbers with backend-authoritative values; show error/empty states, not invented KPIs.
- `ACC-10`: `frontend/src/features/reports/LiveOutstandingReport.tsx` **already has** a print pathway. Reproduce print/preview deficiency; repair document layout, complete data retrieval, filter summary, column wrapping, footer, pages and printable totals using existing `PrintSurface`/document primitives. Do not build a parallel export/print framework or fabricate missing backend totals.

### Auditor
- `AUD-01`: auditor recent activity. Inspect `AuditorDashboard.tsx`, `AuditActivityPreview.tsx`, dashboard hook/API and role-filtered data; fix client mapping and layout only. No access to restricted staff/security/financial fields beyond current capability contract.

## Shared-source boundaries
`frontend/src/features/operations/OperationalPages.tsx` contains mock implementations for many routes; preserve mock mode and distinguish it from live API mode. Reuse `StatusBadge`, `TableActionButton`, `ViewTabs`, `PaginationControls`, `DropdownSelect`, accessible Radix dialogs and existing print utilities. All actions must be real, keyboard-accessible, and respect reduced motion. Prefer source fixes once for shared components rather than applying role-specific duplication.

## Execution order and policy checkpoints
1. Reopen the verified audit report; align each target to current lines and current known tests. Build a dependency-ordered file plan. Report owner decisions needed, but continue with independent low-risk FE work.
2. UI-only correctness: badges, labels, LRN presentation, payment heading, danger button, detail KPI composition, date form state, hover-overflow, modal, void tabs, and print regression.
3. Navigation/data-adapter refinements: per-grade views, school years pagination, role-safe read-only view, dashboard/KPI mappings. Record backend blockers with exact expected/actual JSON fields and cases.
4. Decision-dependent work: school-year archive **intent is confirmed, but persistent archive/restore contracts and dependent term handling still need approval**; section archive/restore remains unresolved; follow-up delivery gates remain. **Ledger import rule changes are explicitly NOT requested**. Continue safe UI changes without fake backend persistence.
5. Run focused Vitest/TypeScript/build and Playwright/browser checks of all affected screens with synthetic data and role logins, including 1440/1366/768/390 and print preview. Include mock/live, keyboard, disabled, loading/error/empty, timezone and print multi-page tests. Do not claim a pass not executed.
6. Update each ID and FE child-item in the canonical audit report and required changelog/issue tracker. Do not mark BE dependencies complete.

## Final handback
A table of issue ID → file(s) → action → test evidence → status (`DONE/FAILED/BLOCKED/NOT VERIFIED`), a contract handoff list for backend, and explicit zero-change confirmation for `backend/`. Never commit or push without approval. If a new policy decision is required, ask **one focused question with recommended option and consequences** rather than guessing. Stop only the blocked task; continue safe independent tasks.
