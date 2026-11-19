# EducaTrak — Backend Loop-Engineering Operating Manual

> **Project:** EducaTrak, Mendez Christian Academy (MCA) student billing and payment-monitoring system.
>
> **Execution target:** `feature/backend-foundation` **after** the owner merges `main` into it; verify the agent's actual checkout and merge ancestry before work. The previously observed merge commit is `ecfaba034e80895ec008449b77d99bc3e358ae34` (November 11, 2026 UTC). This is a reference point, not a substitute for checking the live checkout.
>
> **Purpose:** A persistent, resumable build-and-audit ledger for finishing the **approved backend work** in the existing Laravel application. It is not a license to rebuild working features, invent school policy, operate on live data, or deploy.
>
> **Scope:** Primarily `backend/` plus directly relevant `EducatraK-Knowledge-Base/` documentation, tests, and this manual. `frontend/` and the central MockDB are **read-only** in this loop unless the owner separately authorizes a named integration workstream. The owner's earlier `jabol` unlock permits requesting backend implementation; it does not waive phase approvals or database safety.
>
> **Relationship to frontend loop:** Companion to `EducatraK-Frontend-Loop-Engineering.md`. For the backend, perform ordinary tests during build, but **do not mark the formal full-system Cross-Check/Audit complete until every approved, unblocked Build workstream has completed and been accepted**. Retain the frontend loop's existing ledger; never rewrite it to manufacture backend progress.

---

## 0. How to use this manual

**Owner-confirmed operating mode:** Backend-first; approved Must work and previously authorized optional work only; approve and accept one major workstream at a time; leave all unresolved policy questions unresolved until the owner answers. Continue on the merged `feature/backend-foundation` checkout. **Do not automatically create a different branch or merge again.**

### Required execution cycle, repeatable across Codex sessions

`NOT_STARTED → EVIDENCE_COLLECTED → PLAN_READY → WAITING_FOR_APPROVAL → APPROVED → IMPLEMENTING → VALIDATING → WAITING_FOR_ACCEPTANCE → ACCEPTED`

- `BLOCKED` may be used at any stage if an owner decision, data safety precondition, database facility, or required evidence is missing. A blocked workstream is **not** accepted or built.
- **Phase 0** is evidence gathering and a proposal. **STOP before implementation.** After explicit approval, process **one** workstream at a time; no implied or blanket approval.
- For a workstream, write its exact scope, file list, API/data contract, risks, tests, and preconditions before requesting approval. An approval authorizes only that workstream.
- Implement with focused tests and ordinary debugging. After passing the required workstream checks, report evidence and **STOP for acceptance**. Acceptance and permission to start the next workstream must be explicit.
- Do not run a formal, cross-module Cross-Check/Audit as completed until the Build Gate is satisfied. Focused checks during build are mandatory and are not counted as the final audit.
- If context is low, update this file's truthful statuses and Resume Notes, append the required logs, and stop at a safe boundary; the next agent must resume from evidence, not infer completion.

### Definitions

- **Existing / verified:** Code was inspected and a named test or manual check was executed in the current session. Finding a route or a checked historical log is *not* sufficient to call a feature complete.
- **Partially implemented:** Some handler/UI contract exists, but requirements, tests, or deployment behavior are missing.
- **Missing:** A specifically approved requirement has no supporting implementation after an evidence-based search.
- **Decision-blocked:** A needed policy, destructive operation, schema target, or external service is not approved.
- **Environment-blocked:** PHP/Composer/MySQL/credentials/test service/tooling are unavailable.
- **Out of scope:** Retired, unapproved, or separate-front-end work; do not treat it as an unfinished backend defect.

## 1. Governing instructions and source-of-truth

Read **complete** instructions before any work:

1. Root `AGENTS.md` and `CLAUDE.md` (if edited, they **must be byte-for-byte identical**); `backend/AGENTS.md` and `backend/CLAUDE.md`; applicable backend `.agents/skills/` and/or `.claude/skills/`. Follow Laravel Boost/search-docs and testing practices when available; do not claim tool availability that was not checked.
2. `EducatraK-Knowledge-Base/README.md`, `00-Project-Core/Project-Specification.md`, all relevant `01-Requirements/` including `Modules-and-Features.md`, `Scope-and-Access-Control.md`, `Data-and-Business-Rules.md`, `Screens-Routes-and-Flows.md`.
3. `02-Architecture/Backend-API-Contract.md`, `02-Architecture/Backend-Database-Design/{Database-Review.md,ERD.md,Data-Dictionary.md,Reference-Schema.sql}`, and relevant frontend architecture/adapter interface descriptions.
4. `04-Development/{Backend-Readiness.md,Implementation-Guide.md}`, `05-Testing/Testing-and-Definition-of-Done.md`, applicable `06-Decisions/` including `Open-Decisions.md`, `Reconciled-Decisions.md`, `07-AI-Agents/Backend-Foundation-Development-Ledger.md`, recent `08-Logs/` and `08-Logs/Agent Sessions/{changelogs.md,Issues-and-TODOs.md}`.
5. `EducatraK-Frontend-Loop-Engineering.md` only for identifying frontend expectations and preserving scope separation; do not execute its instructions to change frontend code in this loop.
6. Actual `backend/routes/api.php`, `routes/console.php`, controllers, actions, requests, models, migrations, factories, seeders, configuration, tests and `frontend/src/api/cashierApi.ts` and `frontend/src/api/mock/` **read-only for client contract context**.

Apply the repository's source-of-truth hierarchy: current explicit instruction; canonical approved requirements and decisions; architecture/contracts; implementation guides; logs/historical evidence. When sources conflict, **show both locations and ask** rather than choose a convenient version. Historical remarks or unapproved drafts do not authorize migrations or features.

### Known source and implementation conflicts to recheck

- **Student identity:** Laravel and the live API use unique 12-digit-string `students.lrn`; `students.id` remains the stable relationship key. **Never convert, invent, or overwrite real LRNs outside an explicitly approved preservation/backfill plan.**
- **Guardian relationship:** MCA confirmed relationship belongs on each **student–guardian link**, while the inspected SQL stores it on `guardians`; changing that persistence model requires specific schema/API approval. Guardian-data ownership and primary-contact policy remain open.
- **Privacy/retention:** Owner left multiple backend retention periods undecided, while user-facing `frontend/src/i18n/en.ts` privacy copy asserts periods. Do not implement a purge or alter public promises until reconciled.
- **Student profile:** Approved MockDB Registrar profile shows academic/personal/guardian context without billing; older requirements sometimes authorize read-only financial context on student pages, and live paths differ. Do not expand Registrar finance access without a clarified contract.
- **Clearance and Exam Permit:** Retired from active product scope by the November 5 decision. Historical tables/models/records must remain preserved; **do not build new clearance/permit endpoints or restore retired workflows**.
- **Session:** Owner approved **30 minutes idle**, activity renews, one-minute warning. The backend branch has a 30-minute setting in `backend/config/session.php`; reverify post-merge plus live/frontend behavior before claiming alignment. Keep current Laravel error shapes `{message}` / `{message,errors}`.
- **Documented Must/Should/Could:** The requirement index retains ledger import M12 (`/import`) distinct from Registrar's student masterlist import (`/students/import`). Do not conflate, silently promote optional work, or implement both merely because a similarly named table exists.

## 2. Post-merge readiness gate (mandatory, first action)

Execute Phase 0 **read-only** on the merged checkout. Record commands and actual results rather than assuming the earlier verified remote snapshot is still the local state.

- [ ] Verify `git branch --show-current` is `feature/backend-foundation` (or **ask** if a different branch); `git status --short`; `git log -5 --oneline --decorate`; verify `main` merge ancestry and note checked commit. Do not pull, reset, stash, merge, cherry-pick, rebase, push, or resolve conflicts automatically.
- [ ] If uncommitted work is present, identify owner and scope; do not overwrite it. Ask before any branch operation.
- [ ] Inspect all instructions/required decisions listed in §1. Diff active requirements/contract/decision files against current implementation; note older contradictory text without silently rewriting it.
- [ ] Inventory **actual** Laravel version (`composer.lock`), PHP/Composer/extensions, configured app environment, test DB driver and target MySQL availability; do not disclose or copy `.env` secrets.
- [ ] Enumerate runtime routes using `php artisan route:list --path=api --except-vendor` if runnable; source-count only if tooling is unavailable. The current file inventory is **51 route declarations**, **12 EducaTrak domain migrations plus three Laravel support migrations**, **29 models**, and **19 API controllers**; prior test totals remain historical unless rerun.
- [ ] Compare route handler + request validation + response + capability + audit + tests with `Backend-API-Contract.md`; log exact gaps. Compare model relations with migrations and database index/constraint rules. Mark the reference SQL descriptive only, **never execute it**.
- [ ] Establish safe test baseline: focused and full `php artisan test --compact`, `vendor/bin/pint --test` or configured formatter, `php artisan route:list`, and suitable static checks where available. Failure of an unavailable tool is not a pass.
- [ ] Confirm no app/test command will touch a shared, staging, or production database. Test through isolated SQLite memory or **owner-approved disposable database**; do not run `migrate:fresh`, `migrate:refresh`, `db:wipe`, `db:seed`, or `composer setup` on an unverified environment.
- [ ] Produce a per-module matrix: Required behavior → source → current files/routes → tests → status (`verified`, `partial`, `missing`, `decision-blocked`, `environment-blocked`, `out of scope`) → recommended first safe workstream.
- [ ] Identify decisions that affect coding, migration, real-data compatibility or deployment, and ask focused owner questions. No workstream approval may be invented.
- [ ] Present Phase 0 readiness report and implementation queue. **STOP for explicit approval before Build Phase.**

**Readiness interpretation:** Initial evidence supports starting Phase 0, **not** automatic release, real-database migration or complete backend implementation. Mark code-ready work separately from schema-ready, integration-ready, environment-ready, and deployment-ready.

**Phase 0 Resume Note:** _Completed read-only on `feature/backend-foundation` at `ecfaba034e80895ec008449b77d99bc3e358ae34`; the merged `main` commit is an ancestor. The only initial worktree item was this owner-supplied untracked manual. `php artisan route:list --path=api --except-vendor` reported 51 routes; isolated SQLite `:memory:` tests passed (146 tests, 1,029 assertions). Pint reported pre-existing formatting drift in 27 files. Composer and MySQL CLIs are unavailable. B00 was approved for documentation-only contract reconciliation; no schema, route, frontend, deployment, or data operation is authorized._

---

# 3. Build Phase — complete all approved backend workstreams first

**Build gate:** Finish or explicitly record an **owner-accepted deferment/blocker** for every approved, applicable item below before starting the formal Cross-Check/Audit Phase. A checked Build box means completed, validated and **accepted**, with a populated Resume Note. Existing code must be revalidated and reused, not rebuilt. One workstream per owner approval. Progress is not measured by number of routes or files.

## B00. Backend architecture, test foundation, and API-contract alignment — M0 / cross-cutting

- [ ] Verify Laravel, Sanctum session auth, middleware, `routes/api.php`, console schedule and existing service/action structure. Reconcile the current backend API contract with actual handlers and frontend needs without changing approved error envelopes.
- [ ] Identify migration/schema gaps, model relationships, foreign keys, unique constraints and index correctness. Validate against approved DB targets **only**; the ERD/dictionary/`Reference-Schema.sql` are unapproved descriptive drafts until owner/schema checks complete.
- [ ] Establish repeatable local test setup, seed/factory isolation, config safety, deterministic dates/timezone and test evidence. No unnecessary dependency upgrades or folder-framework refactors.
- [ ] Preserve `Asia/Manila`, real time in audit records, integer-centavo monetary values, and existing Laravel conventions.

**Acceptance evidence:** Actual route-to-controller/API matrix, config/test baseline, explicit schema limitations, no unexpected diff.

**Resume Note:** _State: ACCEPTED. Owner accepted B00 after confirming the current 12-digit `lrn` contract and immutable ordinary-update rule. Scope reconciled verified API-documentation drift only. Current route inventory and isolated suite evidence are in the Phase 0 note. No code, schema, data, or frontend changes. MySQL validation, guardian persistence reconciliation, current-school-year policy, retention, and deployment remain blocked. Accepted Thursday, November 12, 2026 — 02:18:00 Asia/Manila._

## B01. Authentication, users, sessions, and server authorization — M1

- [ ] Verify login, logout, `/auth/me`, forced password change, recovery/admin reset, five-attempt login throttle and `Retry-After`, 30-minute idle policy, expiry warning interaction contract, CSRF/session cookies, inactive-account rejection.
- [ ] Verify six existing roles (`super_admin`, `admin`, `cashier`, `accounting`, `auditor`, `registrar`) and server-side capability checks. Test allow **and deny** paths. Never promote Super Admin into financial operations or expose a public creation path.
- [ ] Verify protected bootstrap Super Admin, last-active-Administrator protections, archive/restore/anonymization, one-time credentials, audit events; leave recovery, peer promotion and Accounting assignment policy blocked until MCA decides.
- [ ] Check PII/password/token redaction in errors and audit payloads; no secrets in logs or fixtures.

**Acceptance evidence:** Named auth/role tests, misuse/denial tests, session config verification, documented undecided account policies.

**Resume Note:** _State: ACCEPTED. Verified B01 without code changes. `AuthenticationTest.php`, `UserAdministrationTest.php`, and `SuperAdminBootstrapTest.php` passed (27 tests, 180 assertions); full isolated suite passed (146 tests, 1,029 assertions). `session.lifetime` is 30. Routes apply login throttling, Sanctum/active-user middleware, and forced-password-change middleware. The protected Super Admin bootstrap and staff archive protections are covered. `schedule:list` shows archive anonymization scheduled at 00:15 Asia/Manila; runtime scheduler operation remains an environment concern. The existing frontend session warning contract was inspected read-only but not revalidated as part of this backend workstream. Account-recovery, privileged-account assignment, and retention policy remain open. Accepted by standing owner instruction Thursday, November 12, 2026 — 02:23:30 Asia/Manila._

## B02. Student records, LRNs, guardians, school structure — M2

- [ ] Verify Registrar's approved record mutation permissions, Cashier/Accounting read-only boundaries and approved student-profile visibility without leaking financial information.
- [x] Reconcile live LRN contract with MockDB LRN, request/response/search/index and linked-record preservation. The current migration and live API use unique 12-digit-string `students.lrn`; `students.id` and all linked historical relationships remain stable. Target-MySQL migration/concurrency evidence remains an environment gate; do not perform a real-data operation without a separately approved preservation plan.
- [ ] If authorized, implement an **additive, staged, testable, rollback-planned** LRN transition. Never synthesize real student identifiers; retain unresolved legacy rows safely and do not claim migration complete without verification.
- [ ] Validate grade/section relationships, active/inactive transitions, name, DOB/gender/address scope, and guardian contacts against approved policy. Guardian relationship belongs to each student–guardian link; any pivot migration requires explicit plan and approval. Do not infer the owner of guardian data.
- [ ] Preserve billing/account/payment/receipt/notification relationships on student updates and status changes.

**Acceptance evidence:** Student + guardian data-contract tests, LRN collision/legacy-backfill tests, role-sanitization tests and relationship-integrity checks.

**Resume Note:** _State: ACCEPTED. Owner approved per-link relationship storage, Registrar ownership, one primary link per student, and copying existing values to every existing link. Added nullable `guardian_student.relationship` with deterministic backfill; retained the guardian-wide historical field. Student API now reads/writes the pivot value and clears other primary flags before assigning the selected primary link. Focused tests passed (16 tests, 125 assertions); full isolated suite passed (148 tests, 1,037 assertions). Target-MySQL migration/concurrency validation remains unverified before deployment. Accepted Thursday, November 12, 2026 — 23:41:56 +08:00._

**Owner disposition:** _Accepted for this loop with target-MySQL migration/concurrency validation and the separate guardian-lifecycle policy decisions retained as open. Acceptance does not authorize a migration, target/shared/production database access, new guardian workflow, or deployment. Accepted Thursday, November 12, 2026 — 23:41:56 +08:00._

## B03. School year, fees, payment plans, settings — M9

- [ ] Verify configurable school year/terms, grade/sections, fee schedules, fee-item revisions/versioning, plans, down-payment/installment settings, receipt/school/email settings as actually approved.
- [ ] Preserve existing billing-account fee/plan snapshots and fee-assignment synchronization decisions; distinguish new-account policies from explicitly approved existing-account updates.
- [ ] Check one-current-school-year behavior, missing-current-year semantics and required approval; do not silently use today's date to invent a school-year range.
- [ ] Validate boundaries, permissions, concurrency, audit and immutable historical terms.

**Acceptance evidence:** Config and school-year tests, historical-snapshot tests, explicit settings API/response contracts.

**Resume Note:** _State: BLOCKED. Owner approved exactly one current school year and a clear configuration error when none exists. Dashboard school-year requests now return 409 unless exactly one current year exists; focused/full isolated tests pass. Live school-year, term, payment-plan, receipt-setting, and school-setting management routes remain absent and need role/API contracts before full M9 implementation. Updated Thursday, November 12, 2026 — 02:34:37 Asia/Manila._

## B04. Billing accounts, installments and adjustments — M3, M11.1

- [ ] Verify account creation/lookup and one student–school-year account constraint, fee/plan snapshots, grade-aware fees, authorized adjustments and financial summaries.
- [ ] Verify integer-centavo arithmetic: total due, valid paid amounts, balance, installment due dates, overdue/due-soon/paid/current status recalculation and backdated business date handling.
- [ ] Preserve adjustments and financial audit evidence. Approval thresholds/dual approval are undecided; never invent an escalation level.
- [ ] Verify no fee or enrollment change silently rewrites historical account charges or payment allocations.

**Acceptance evidence:** Calculation tests, mutation/authorization tests, integrity and concurrency checks, edge cases for rounding and duplicate operations.

**Resume Note:** _State: BLOCKED. Billing-account reads, adjustment validation/transactions, snapshots, and status recalculation passed focused tests (7 tests, 67 assertions). The route inventory has no `POST /billing-accounts`; current tests construct accounts directly. Approved M3 account creation needs configured school year, fee schedule, payment plan, installment calculation, snapshot, and account-provisioning contract. B03 has no live management APIs for those settings. Blocked Thursday, November 12, 2026 — 02:39:49 Asia/Manila._

## B05. Payment recording, allocations, receipts — M4

- [ ] Verify cash/payment methods against current approved scope; do not add card, GCash or external payment methods based on historical generic requirements.
- [ ] Enforce positive integer-centavo amount, outstanding balance ceiling, duplicate-reference/idempotency behavior, same-student/amount 10-minute warning policy where approved, no future payment dates, required reason for approved backdating.
- [ ] Apply oldest unpaid installment first; produce server-assigned sequential receipt; retain allocation and payment snapshots. Ensure atomic transaction + idempotent retry/concurrency behavior; do not duplicate payments or receipt numbers.
- [ ] Verify receipt print/reprint flags, audit trail, email/SMS notification queuing without treating delivery failure as payment failure.

**Acceptance evidence:** Financial invariants, concurrent/idempotent payment tests on supported database, rejection and receipt audit tests.

**Resume Note:** _State: ENVIRONMENT-BLOCKED. Existing SQLite coverage exercises oldest-first allocation, overpayment rejection, duplicate warning, idempotency replay/conflict, receipt issuance/reprint, and payment/void status synchronization. The code locks accounts, installments, and receipt sequences transactionally. Target-MySQL constraint and concurrent-request behavior cannot be verified without an approved disposable MySQL environment. Blocked Thursday, November 12, 2026 — 02:40:23 Asia/Manila._

## B06. Void requests, decisions and receipt integrity — M5

- [ ] Verify Cashier request/Accounting approval flow, request/decision notes, separation of duties and pending/approved/rejected states.
- [ ] On approved void, adjust balance/allocation through approved compensating logic without deleting payment, receipt or audit evidence; mark voided printouts correctly.
- [ ] Lock relevant financial records for concurrent requests, disallow double void and self-approval, record actor/timestamps and before/after safely.

**Acceptance evidence:** Allow/deny role matrix, self-approval denial, double-request/approval race, no-delete and balance-restoration tests.

**Validation update:** _Focused `CashierOperationsTest.php` passed (19 tests / 240 assertions); full isolated SQLite PHPUnit suite passed (148 tests / 1,041 assertions). Pint completed on dirty PHP files and `git diff --check` passed. Tests used a process-only `APP_KEY` and SQLite `:memory:`; no `.env`, shared database, migration outside the isolated test lifecycle, frontend, external delivery, or deployment operation ran. B06 remains environment-blocked only on owner-approved disposable-MySQL duplicate-request/decision concurrency proof. Updated Thursday, November 12, 2026 — 16:41:43 Asia/Manila._

**Owner disposition:** _Accepted for this loop with the target-MySQL duplicate-request/decision concurrency proof explicitly deferred. The focused B06 and full isolated SQLite evidence remains recorded above; deferred MySQL proof is a non-blocking follow-up, not completed validation. Approved Thursday, November 12, 2026 — 16:49:13 Asia/Manila._

**Current update:** _Owner approved a narrow response-contract completion. Void-history responses now include `decided_by` and `decided_at`; focused regression coverage asserts those fields and the `voided` receipt-status response. Static diff validation passes, but focused/full Laravel tests and Pint could not run because PHP, Composer, and `backend/vendor/autoload.php` are unavailable. Target-MySQL concurrent duplicate-request/decision proof also remains unavailable. Updated Thursday, November 12, 2026 — 15:58:37 Asia/Manila._

**Resume Note:** _State: ENVIRONMENT-BLOCKED. Focused void/payment tests passed (22 tests, 260 assertions): valid-only requests, Cashier ownership, Accounting-only decision, recorder self-approval denial, no-delete balance/allocation restoration, rejection restoration, and audit actors. Actions use transactions and locks. Target-MySQL concurrent duplicate-request/decision proof remains unavailable. Blocked Thursday, November 12, 2026 — 02:44:13 Asia/Manila._

## B07. Notifications, email/SMS delivery, follow-up — M6, approved M11

- [ ] Verify queued/sent/failed logs and approved guardian contact status; payment transactions commit independently from notification failures.
- [ ] Verify email/signed Twilio callback integration, retries and idempotency, opt-in/authorized reminder batches, per-role access, rate limits where approved, failure reasons without leaking contact PII.
- [ ] Test external providers only with explicit sandbox/test credentials. **Do not send live emails or SMS** or change provider configuration without authorization.
- [ ] Reconcile scheduled reminder ownership and runtime workers; code that defines a schedule is not proof a scheduler is running.

**Acceptance evidence:** Faked provider tests, delivery callback signature tests, queued/failure behavior, no real outgoing messages.

**Audit update:** _Focused notification/follow-up coverage passed (7 tests / 56 assertions) using faked local mail/HTTP behavior. The audit confirmed that payment confirmations only create `queued` log rows—no job or other delivery path exists—and reminder email/SMS provider calls occur synchronously in the HTTP request despite the queue requirement. Email attempts have no delivery-confirmation callback or state transition to `sent`; sender/daily-limit settings, a queue-worker owner, and deployment scheduler ownership are also unverified. No live mail/SMS, provider configuration, or external delivery test ran. Audited Thursday, November 12, 2026 — 16:57:00 Asia/Manila._

**Remediation update:** _Payment confirmations and reminder attempts now dispatch the one-attempt `DeliverNotification` job after persistence (after commit for payment/retry transactions). The job preserves queued state after provider acceptance, records failures, remains fail-closed for disabled reminders, and sends no direct provider call from an HTTP handler. Cashier may retry a failed payment-confirmation email or failed eligible reminder; the retry row is locked transactionally so a second retry is denied. Focused B07/payment coverage passed (27 tests / 313 assertions); the full isolated SQLite suite passed (149 tests / 1,058 assertions); Pint and `git diff --check` passed. No live mail/SMS, sandbox credential, external provider, shared database, migration, scheduler, queue worker, frontend, or deployment operation ran. Updated Thursday, November 12, 2026 — 17:08:29 Asia/Manila._

**Owner disposition:** _Accepted for this loop with email delivery-confirmation semantics, sender/daily-send-limit policy, queue-worker ownership, and target-provider sandbox proof explicitly deferred. Approval does not represent those deferred items as completed. Accepted Thursday, November 12, 2026 — 17:11:53 Asia/Manila._

**Resume Note:** _State: DECISION/ENVIRONMENT-BLOCKED. Queue-dispatch code and faked-provider coverage are complete. Email delivery-confirmation semantics, sender/daily-limit policy, configured queue-worker ownership, and target-provider sandbox proof remain unverified; automated reminder scheduling remains prohibited._

## B08. Reports, statements, exports and dashboards — M0, M7

- [ ] Verify role-specific dashboards and financial visibility. Follow current requirements, not retired clearance concepts.
- [ ] Verify daily/monthly collection, student statements, outstanding balances, date-range semantics in `Asia/Manila`, counts and monetary totals against underlying valid payments, adjustments and voids.
- [ ] Inventory supported export/print behavior. If Excel/PDF/streaming requires an additional contract, dependency, or frontend work, request approval before introducing it.
- [ ] Verify pagination/filter/sort in the database before pagination, permission-filtered results and empty states; add missing behavior only where approved.

**Acceptance evidence:** Reconciled report totals and role data projections, date-boundary/report and export tests, contract examples.

**Audit update — Thursday, November 12, 2026 — 17:20:42 +08:00:** Daily collections, outstanding balances, current-year student statements, and role-specific dashboards have live, role-limited API paths. Focused report/dashboard coverage passed (11 tests / 95 assertions), including Asia/Manila date filtering and permission denials. The full isolated SQLite backend suite passed (150 tests / 1,062 assertions). A tied outstanding balance lacked a deterministic secondary ordering key; the query now orders by `balance_cents DESC, id ASC` and the new regression test confirms the contract. Monthly reporting remains intentionally unavailable because no approved fee-category allocation or billed-data contract exists. Current exports are client-side Excel-compatible CSV and print; no native XLSX/PDF/streaming contract or dependency was introduced. Browser print-layout evidence remains tracked separately.

**Owner disposition:** _Accepted for this loop with monthly reporting/native export and browser-print evidence explicitly deferred. The accepted scope does not imply an approved monthly data source, export format, or physical-print proof. Accepted Thursday, November 12, 2026 — 17:32:45 +08:00._

**Resume Note:** _State: DECISION-BLOCKED. Daily, outstanding, statement, and dashboard paths are accepted. Do not implement monthly reports or native export without the finance/report contract; retain browser-print verification as a separate open item._

## B09. Audit, security events, backups and recovery — M8

- [ ] Verify per-mutation audit coverage, actor identity, meaningful action, before/after minimization, safe ordering with transaction commit, security event search and protected-read capabilities.
- [ ] Verify backup status vs actual backup execution/restore behavior. **Do not claim backup works** because `/api/backups` lists records. Obtain approved backup destination/retention/restore operator and test a restore on isolated environment before readiness.
- [ ] Record retention conflict as BLOCKED; do not add retention purges or a broad deletion mechanism. Preserve staff archive's separately approved 30-day behavior.
- [ ] Review credentials, authenticated route protections, CSRF, cookie security, error responses, webhook signatures, logging redaction, audit tamper resistance and least privilege.

**Acceptance evidence:** Audit coverage matrix, denial tests, backup/restore proof or explicit environment blocker, no sensitive leak.

**Audit update — Thursday, November 12, 2026 — 17:41:29 +08:00:** Verified authenticated capability boundaries, protected security-event search, audit-log response minimization, and read-only backup history. Archive, restore, and trusted Super Admin bootstrap events were missing from the security-event allowlist; they are now included and regression-tested. Focused B09 coverage passed (30 tests / 198 assertions); prior full isolated SQLite suite passed (150 tests / 1,068 assertions). The audit found two readiness blockers: several mutation endpoints commit their business change before writing the audit entry, and `/api/backups` only lists `backup_records`—there is no backup executor, destination, retention/restore operator, restore-test record, run-backup route, or nightly backup schedule. Existing privacy retention conflict remains unresolved. No backup, restore, credential inspection, external service, or deployment operation ran.

**Owner disposition:** _Accepted for this loop with audit atomicity, backup/recovery readiness, and retention policy explicitly deferred. Acceptance does not claim those controls or evidence are complete. Accepted Thursday, November 12, 2026 — 17:49:29 +08:00._

**Resume Note:** _State: DECISION-ENVIRONMENT-BLOCKED. Security-feed omission is accepted; audit atomicity, backup/restore operation and proof, and retention policy remain open. Do not claim backup or recovery readiness._

## B10. Close-out and cashier/accounting reconciliation — M13 (already implemented portions; optional scope policy)

- [ ] Verify existing Cashier close-out/current business date, one per cashier/day, variance reason, locked day, Accounting sign-off and no duplicate sign-offs.
- [ ] Test date-simulation routes are restricted to nonproduction contexts, proper role/capability, and concurrency under the target DB where possible.
- [ ] Repair verified defects in currently delivered flows with approval; do not enlarge optional features without owner sign-off.

**Acceptance evidence:** Double-closeout and sign-off concurrency tests, role matrix and sum reconciliation.

**Audit update — Thursday, November 12, 2026 — 17:54:23 +08:00:** Focused close-out/capability coverage passed (77 tests / 494 assertions). It verifies Cashier-only submission, one close-out per Cashier/business date, required reason for non-zero variance, locked records, Accounting-only one-time sign-off, history scope, and nonproduction-only session date simulation. The API totals only cash even though M13 calls for current system totals by method. The application has locks and a unique cashier/date constraint, but target-MySQL concurrent double-submit and sign-off behavior remains unproven. B09's open atomic-audit issue also applies to close-out submission. No business date, close-out, or sign-off was created outside isolated tests.

**Owner disposition:** _Accepted for this loop with per-method totals and target-MySQL concurrency proof explicitly deferred. B09's atomic-audit issue remains open and applicable to close-out submission. Accepted Thursday, November 12, 2026 — 17:56:50 +08:00._

**Resume Note:** _State: DECISION-ENVIRONMENT-BLOCKED. Core close-out behavior is accepted in isolated tests. Per-method totals, target-MySQL concurrency proof, and B09 audit atomicity remain open; do not represent the lock behavior as deployment-database proof._

## B11. Student masterlist import and separate ledger import — Registrar approved prototype / M12 optional

- [ ] Distinguish **Registrar Student Masterlist** (`/students/import`, CSV/XLSX, match by LRN, create/update, optional individually selected Active→Inactive missing students) from **Ledger Import** (`/import`, financial transactions). They require separate requirements/contracts and approval gates.
- [ ] Existing approved masterlist decision expressly limits the current task to frontend MockDB. A **live Laravel student import endpoint is not yet automatically authorized** by this backend loop. Propose a separately approved backend API/DB design if needed; do not implement or claim it by default.
- [ ] If owner authorizes student import backend work, verify required guardian fields, row-level rejection/valid-row processing, zero-preselected missing students, status change with outstanding balance allowed, stale preview prevention, atomic application and import audit summary. Never delete students or rewrite financial history.
- [ ] Do not implement M12 ledger import merely to fill a checklist. Ask whether the Should-tier module is approved and obtain its exact financial reconciliation policy, idempotency and historical safeguards.

**Acceptance evidence:** Separate approved contracts and tests per import type, correct LRN semantics, explicit approval references. Otherwise mark DECISION-BLOCKED, not complete.

**Audit update — Thursday, November 12, 2026 — 17:59:35 +08:00:** The Registrar `/students/import` page is correctly limited to the approved MockDB Phase 1 file-selection prototype: it validates only nonempty CSV/XLSX selection, does not parse content or mutate records, and shows unavailable in live mode. The live Laravel backend exposes no student-import endpoint. Ledger import remains a separate, fail-closed `/import` placeholder: all roles are denied `import.run`, and no backend route exists. Focused frontend capability coverage passed (65 tests); it does not exercise the StudentImportPage selection behavior, so that verification gap is recorded. No file was uploaded, parsed, or applied; no backend import or financial record changed.

**Owner disposition:** _Accepted for this loop with live student import, ledger import, and focused prototype coverage explicitly deferred. Acceptance does not authorize parsing, apply behavior, or a backend import endpoint. Accepted Thursday, November 12, 2026 — 18:01:02 +08:00._

**Resume Note:** _State: DECISION-BLOCKED. The approved MockDB-only Phase 1 boundary and ledger-import denial are accepted. Do not add parsing, apply behavior, live student import, or ledger import until separately approved contracts define the required safeguards._

## B12. Other approved optional functionality — M14, enhancements, integrations

- [ ] Review explicit approval for shareable PDF receipt, advanced exports, live table sorting, maintenance functions and other `Should`/`Could` items. **Do not implement merely because mentioned**.
- [ ] For accepted optional work, produce the usual precise plan, contract, tests and approval. For unapproved items mark `OUT_OF_SCOPE` or `DECISION-BLOCKED`; do not fabricate.

**Audit update — Thursday, November 12, 2026 — 18:02:36 +08:00:** Existing client-side Excel-compatible CSV exports and MockDB table sorting are covered by focused tests (23 tests across 6 files). Shareable receipt PDF (M14) is deliberately absent; native XLSX/PDF/streaming exports lack a contract; live-mode server sorting is only partially supported; maintenance/backup actions and external integrations remain governed by their existing B07/B09 and environment decisions. No optional implementation was added. Existing tracker entries remain the authoritative follow-up records.

**Owner disposition:** _Accepted for this loop with optional PDF, native export, live sorting, maintenance, and integration work explicitly deferred. Acceptance does not authorize any of those additions. Accepted Thursday, November 12, 2026 — 18:04:12 +08:00._

**Resume Note:** _State: DECISION-BLOCKED. Existing CSV/print and approved MockDB sorting are accepted. Do not add PDF receipts, native export formats, live sortable table contracts, maintenance actions, or integrations without explicit scoped approval._

## B13. Operational prerequisites and database validation — cross-cutting

- [ ] Confirm deployment PHP/Composer/extensions/locked Laravel compatibility; verify deployment MySQL version, collation, indexes/constraints, isolated environment, network/LAN topology and TLS/proxy/cookie configuration with named owner.
- [ ] Confirm scheduler, mail/SMS workers, backups and restore, secrets management, production-mode controls, migration compatibility/rollback, runbooks and health/observability already approved.
- [ ] Validate approved migrations first against a clean **disposable matching MySQL environment**, not just SQLite. Obtain specific approval before applying them to any shared/prod database.
- [ ] Record missing infrastructure as ENVIRONMENT-BLOCKED; code may be complete while deployment is not. Do not run `Reference-Schema.sql` or broad destructive operations.

**Acceptance evidence:** Environment matrix with actual versions/commands/results, targeted schema tests, isolated restore proof or honest blockers.

**Audit update — Thursday, November 12, 2026 — 18:11:13 +08:00:** Local, read-only evidence confirms PHP 8.4.27, locked Laravel 13.35.0, and the required CLI extensions (`curl`, `fileinfo`, `mbstring`, `openssl`, `pdo_mysql`, `pdo_sqlite`, `sqlite3`, and `zip`) when loaded from the installed PHP extension directory. `backend/composer.json` requires PHP `^8.3`; `composer.lock` and `vendor/autoload.php` are present. This is local compatibility evidence only: Composer itself is not available to Laravel's `about` command, no deployment manifest/provider configuration is in the repository, and no deployment PHP/Composer inventory was supplied. The local process reports production, debug off, Asia/Manila, and URL `localhost`, while no local backend `.env` is present; that is not evidence of a correctly configured target environment.

**Environment blockers — Thursday, November 12, 2026 — 18:11:13 +08:00:** No MySQL client, matching disposable MySQL service, target version/collation/index/constraint inspection, deployment host, LAN/TLS/proxy/cookie configuration, named runtime operator, or shared/prod database approval was available. The test suite remains configured for isolated SQLite `:memory:`; it cannot prove MySQL migration or locking behavior. The repository defines a MySQL connection with `utf8mb4` / `utf8mb4_unicode_ci` and strict mode, but that is configuration intent, not target-server evidence. No migration, `Reference-Schema.sql`, database connection, backup/restore, provider message, scheduler tick, queue worker, or deployment ran.

**Operational evidence — Thursday, November 12, 2026 — 18:11:13 +08:00:** Source declares two Manila scheduled commands (billing-status recalculation at 00:05 and user-archive anonymization at 00:15), both with overlap prevention; it declares no backup schedule. A local `schedule:list` attempt failed before listing because its overlap lock tried the absent local SQLite `cache_locks` database, so it establishes neither runnable local scheduling nor deployed scheduler ownership. The queue defaults to the database driver and the notification job exists, but worker supervision/health is unassigned. The example environment defaults mail to `log` and disables reminder delivery; no provider/sandbox or secrets-management proof exists. `/up` is declared as Laravel's health route, but no probe, alert, log aggregation, runbook, backup executor/destination, restore drill, rollback plan, or observability evidence exists. Session/TLS/proxy/cookie deployment values remain unverified; `SESSION_SECURE_COOKIE` and `SESSION_DOMAIN` are environment-controlled.

**Resume Note:** _State: ENVIRONMENT-BLOCKED. Local prerequisites are compatible, but B13 cannot be accepted as deployment-ready. The MCA deployment/database owner must provide an isolated matching MySQL environment and named runtime ownership, then authorize a non-production migration/schema/concurrency exercise, configure and prove scheduler/worker/mail-or-SMS sandbox/backup-restore/secrets/TLS-cookie-proxy/monitoring controls, and document rollback/runbooks. Obtain separate explicit approval before any shared or production database operation._

**Owner disposition:** _Accepted for this loop with every deployment/MySQL/runtime prerequisite explicitly deferred. This acceptance records the B13 audit and its honest blockers; it is not deployment readiness or approval for migrations, shared/prod databases, provider delivery, scheduled jobs, backups/restores, or deployment. Accepted Thursday, November 12, 2026 — 20:26:01 +08:00._

---

# 4. Formal Cross-Check & Audit Phase (after Build Gate only)

## Audit entry gate

- [ ] Every applicable approved Build workstream B00–B13 has `ACCEPTED` with evidence, or the owner explicitly accepts a named blocker/deferment. No unchecked workstream is silently treated as complete.
- [ ] The owner explicitly authorizes the **formal audit phase**. Tests run during build do not count as completed audit phases.

### A01. Requirements, route and contract traceability

- [ ] Map every current Must requirement/module and authorized optional requirement to route, controller/service, request validation, data model, response shape, role guard, relevant frontend read-only expectation and named test. Report missing contracts, pagination/sort differences, unauthorized routes and stale documentation.
- [ ] Check retired clearance/permit absence from active APIs and preservation of historical data. Check exact student LRN and guardian data contracts.

**Audit update — Thursday, November 12, 2026 — 20:36:35 +08:00:** Laravel reported 51 registered `/api` routes; every authenticated operational route has the expected active-user, password-change, and capability middleware, and no active clearance/permit or import endpoint was found. The 151-test isolated Laravel suite passed (1,071 assertions). Six focused live-API frontend suites exercised adapter contracts: 34 tests passed and one existing Registrar/LRN assertion failed; the run also reported invalid whitespace text-node nesting in the live billing-account table. No backend/frontend application code changed.

**Trace result:** _M0–M1 are server-verified with browser/session acceptance still pending; M2 is partially delivered (current 12-digit LRN and per-link guardian relationship are verified, while multiple-guardian lifecycle/ownership conflicts remain); M3 is partial (no account-creation API); M4–M5 are locally verified but target-MySQL concurrency remains unproven; M6 is partial because delivery policy/runtime proof is deferred; M7 is partial because monthly/native export is uncontracted; M8 is partial because backup execution/recovery is absent; M9 is partial because school-year, plan, receipt, school, and email management APIs are unapproved; retired M10 is absent as required; M11 is partial/runtime-blocked; M12 and M14 are decision-blocked; M13 is partial because per-method system totals are absent. Existing B03–B13 issues remain controlling. The current API contract's stale 120-minute session statement was corrected to reflect the already verified 30-minute configuration._

**Resume Note:** _State: ACCEPTED. A01 recorded the 51-route trace, live-adapter review, requirement matrix, stale documentation correction, existing Registrar test failure, new table-markup defect, uncovered endpoint-contract tests, and guardian-workflow decision gap in `2026-11-12-formal-a01.md` and the issue tracker. Do not treat focused mocks, SQLite tests, or this trace as browser acceptance, MySQL proof, deployment readiness, or authorization to implement discovered fixes._

**Owner disposition:** _Accepted for the formal audit with all A01 findings retained as open follow-ups. Acceptance does not authorize the frontend table/test fixes, guardian API expansion, migration, MySQL/deployment validation, or any requirement change. Accepted Thursday, November 12, 2026 — 20:47:27 +08:00._

### A02. Financial, database and race-condition audit

- [x] Check integer centavos, balance reconciliation, payment allocation, idempotency, receipt uniqueness, void compensation, adjustment snapshots, fee revisions, school-year selection, close-out concurrency and immutable audit/financial history.
- [x] Compare SQLite test outcomes to matching MySQL constraints and concurrency semantics; if MySQL unavailable report NOT VERIFIED, not PASS.

**Resume Note:** _Audited and accepted Thursday, November 12, 2026 — 20:55:37 +08:00. Focused isolated SQLite coverage passed (30 tests / 371 assertions). Integer-centavo storage, payment/void/adjustment transaction paths, oldest-first allocation, idempotency replay, receipt uniqueness/counter, and status reconciliation have code and SQLite evidence. Confirmed defect retained: M9.1 requires fee edits to apply only to new accounts, but FinanceSettingsController invokes ApplyFeeItemToBillingAccountsAction to add new/revised fees, installments, and balance to matching existing accounts; its regression test explicitly asserts that behavior. Existing B09 audit-atomicity and B10 close-out-per-method gaps remain open. Matching-MySQL lock, unique-key, collation, and concurrent-write semantics are NOT VERIFIED because no owner-approved disposable MySQL environment is available. Report: 08-Logs/2026-11-12-formal-a02.md. Acceptance does not authorize a behavior, schema, MySQL, or deployment change._

**Owner disposition:** _Accepted for the formal audit with the fee-snapshot defect and all referenced B06/B09/B10/M9 blockers retained as open follow-ups. Acceptance does not authorize a behavior change, migration, MySQL/deployment validation, or a production-readiness claim. Accepted Thursday, November 12, 2026 — 20:55:37 +08:00._

### A03. Security, authorization and privacy audit

- [x] Test six-role permission matrix across all active endpoints; attempt horizontal IDOR and privilege escalation; inspect CSRF/session expiration, login limiter, webhook signature validation, server error data exposure, audit redaction and imported PII.
- [x] Check critical concerns against Laravel security guidance; do not add production-only headers/CORS/proxy assumptions without network requirements.

**Resume Note:** _Audited and accepted Thursday, November 12, 2026 — 21:02:15 +08:00. No new confirmed authorization bypass was found in the available isolated evidence. Focused feature coverage passed (64 tests / 569 assertions), and route/capability coverage passed (57 tests / 241 assertions): every operational route has Sanctum authentication, active-user, password-change, and capability middleware; the unauthenticated Twilio callback is signature-checked. Verified coverage includes role denials, Cashier own-payment horizontal scope, protected-account restrictions, staff-role assignment controls, audit/security allowlists, failed-login password exclusion, and invalid webhook rejection. Cookie-session/CSRF middleware is configured, but an actual browser Sanctum-cookie request was not exercised. Target TLS, secure-cookie/domain/SameSite, trusted proxy/CORS, production APP_DEBUG/error rendering, deployment rate-limit backing store, and runtime webhook/provider behavior are NOT VERIFIED and remain under B13. Report: 08-Logs/2026-11-12-formal-a03.md. Acceptance does not authorize production configuration, security-header, CORS, proxy, cookie, or application behavior changes._

**Owner disposition:** _Accepted for the formal audit with all referenced browser, endpoint-coverage, B13 environment, provider/runtime, and policy follow-ups retained as open. Acceptance does not authorize production configuration, security-header, CORS, proxy, cookie, application, or deployment changes. Accepted Thursday, November 12, 2026 — 21:02:15 +08:00._

### A04. Regression, integration contract, and performance audit

- [x] Run full backend tests and relevant end-to-end/test-contract scenarios; compare live API expectations to frontend adapters **without editing frontend**. Flag gaps for a later approved frontend workstream.
- [x] Verify filtering, pagination, sorting, indexes, query counts, transaction length, file import limits (if approved), accessible user-facing error shapes, and stable date behavior. Run reproducible performance checks only in isolated environments.

**Resume Note:** _Audited and accepted Thursday, November 12, 2026 — 21:09:22 +08:00. Full isolated SQLite Laravel PHPUnit passed (151 tests / 1,071 assertions). Focused live-API frontend adapter tests produced 48 passes and one existing failure: `liveStudents.test.tsx:71` still expects the approved Registrar profile to hide LRN; the run also repeats the existing invalid-whitespace table warning in LiveBillingAccounts. No frontend code was edited. Current client request/query and camel/snake pagination mappings align with reviewed backend endpoints for students, billing, payments, users, close-outs, follow-up, notifications, reports, and security events. Server-side pagination, accepted filters, stable ordering, eager loading, and relevant schema indexes were code-reviewed; no reproducible matching-MySQL dataset, query-count trace, EXPLAIN plan, request-duration baseline, or sustained-load test exists. New performance verification gap retained. File import remains decision-blocked and no import limit test ran. Report: 08-Logs/2026-11-12-formal-a04.md. Acceptance does not authorize frontend fixes, performance/index changes, imports, MySQL exercise, or deployment work._

**Owner disposition:** _Accepted for the formal audit with the existing frontend assertion/table-markup defects, performance verification gap, B13 blockers, and import decisions retained as open follow-ups. Acceptance does not authorize frontend fixes, performance/index changes, imports, MySQL exercise, deployment work, or a production-readiness claim. Accepted Thursday, November 12, 2026 — 21:09:22 +08:00._

### A05. Deployment, recovery, and release readiness

- [x] Verify config by environment, PHP extensions, Composer audit when available, locked dependencies, MySQL schema/migration dry run, scheduler jobs, email/SMS sandbox, backup and restore, least-privilege accounts, TLS, secure cookies, secrets and monitoring.
- [x] Define rollback and recovery plan with the owner; separately gate migrations on any shared/prod DB, network configuration, and deployment. A successful SQLite suite is **not** deployment approval.

**Audit update — Thursday, November 12, 2026 — 21:15:41 +08:00:** Local PHP 8.4.27, Laravel 13.35.0, the required PHP extensions, and the locked dependency set were inspected without accessing any target. `composer audit --locked` returned exit code 1 and reported eight advisories across locked `symfony/http-foundation` 8.1.8, `symfony/http-kernel` 8.1.8, `symfony/mime` 8.1.7, `symfony/routing` 8.1.8, and `symfony/yaml` 8.1.8. No dependency change is authorized by this audit. Existing B13 evidence still leaves matching-MySQL migration/schema rehearsal, runtime scheduler/worker proof, provider sandbox, backup/restore drill, least-privilege accounts, target TLS/proxy/cookie/secrets configuration, and monitoring/rollback runbooks unverified.

**Resume Note:** _State: ACCEPTED; RELEASE-BLOCKED. The owner accepted this A05 audit record while retaining every release blocker. The dependency advisories require a separately approved, tested lockfile remediation before release consideration. An MCA deployment/database owner must also supply the target environment matrix, approve a disposable matching-MySQL migration and recovery rehearsal, and establish scheduler/worker/provider/backup/TLS-cookie/secrets/monitoring/rollback evidence. No migrations, database connections, messages, scheduled jobs, backups/restores, secret inspection, or deployments ran. Report: `EducatraK-Knowledge-Base/08-Logs/2026-11-12-formal-a05.md`._

**Owner disposition:** _Accepted for the formal audit with the dependency advisories and all B13 deployment/recovery prerequisites retained as open release blockers. Acceptance does not approve a dependency update, migration, shared/production database operation, provider delivery, scheduler/worker execution, backup/restore, infrastructure configuration, or deployment. Accepted Thursday, November 12, 2026 — 21:20:23 +08:00._

### A06. Final reconciliation and delivery

- [x] Produce requirement/route/test coverage matrix, accepted workstreams, source conflicts, DB/schema change list, security/risk register, deployment blockers, accurate test counts and commands, documentation updates and handoff.
- [x] Audit the final diff for forbidden frontend changes, secrets, production data, unrelated refactors and unapproved services; no commit/push without express authorization.

**Audit update — Thursday, November 12, 2026 — 21:25:41 +08:00:** A06 reconciled the build and formal-audit records into the final handoff at `EducatraK-Knowledge-Base/08-Logs/2026-11-12-formal-a06.md`. A01–A05 are owner-accepted, and A01's stale waiting-for-acceptance state was corrected. B00–B01 are accepted; B06–B13 have accepted scopes with named deferrals; B02 remains waiting for explicit acceptance; B03–B05 remain blocked. Therefore this handoff is not a claim that every required module is complete, nor that release is approved. The final diff contains no frontend path and no dependency-manifest change; `git diff --check` passed. The secret-pattern scan found only a configuration-key reference in the approved reminder-delivery controller, not a value. No source, dependency, schema, configuration, data, or infrastructure change occurred in A06.

**Resume Note:** _State: ACCEPTED; RELEASE-BLOCKED. The owner accepted this final handoff while retaining every unresolved finding. Release remains blocked by the eight Composer advisories, the unresolved module/contract and financial findings, target-MySQL proof, and B13 operational/recovery prerequisites. Acceptance does not accept B02, unblock B03–B05, approve remediation, or authorize migration/deployment._

**Owner disposition:** _Accepted as the final reconciliation and delivery audit with all tracker items and release blockers retained as open. Acceptance does not accept B02, resolve B03–B05, close a tracker item, approve remediation, dependency updates, database activity, provider action, infrastructure configuration, commit/push, or deployment. Accepted Thursday, November 12, 2026 — 21:27:49 +08:00._

### R01. Locked Symfony dependency-security remediation

- [x] Apply the minimal compatible locked-package update for the A05 Composer advisories, without changing `composer.json`, running Composer scripts, migrating, or deploying.
- [x] Validate the lockfile, rerun the locked dependency audit, and run the isolated backend regression suite.

**Remediation update — Thursday, November 12, 2026 — 23:04:27 +08:00:** R01 updated only `backend/composer.lock`: `symfony/http-foundation`, `symfony/http-kernel`, `symfony/routing`, and `symfony/yaml` from 8.1.8 to 8.1.11; and `symfony/mime` from 8.1.7 to 8.1.10. Composer made no installs or removals and ran with `--minimal-changes --with-all-dependencies --no-scripts`. It also refreshed lock metadata and the Composer plugin API marker. `composer validate --no-check-publish` passed, `composer audit --locked` reported no advisories, and the full isolated PHPUnit suite passed (151 tests / 1,071 assertions). No Composer script, migration, database connection outside the test configuration, provider delivery, scheduler/worker, backup/restore, infrastructure operation, or deployment ran.

**Resume Note:** _State: ACCEPTED; RELEASE-BLOCKED. The owner accepted R01 and the verified advisory finding is resolved. R01 does not resolve B02, B03–B05, the confirmed financial/frontend findings, matching-MySQL evidence, or B13 operational/recovery prerequisites; release remains blocked on those items. Report: `EducatraK-Knowledge-Base/08-Logs/2026-11-12-r01-security-dependency-remediation.md`._

**Owner disposition:** _Accepted for the verified dependency-security remediation. Acceptance resolves the Composer-advisory tracker item only; it does not resolve other tracker items, approve database/provider/infrastructure work, or approve release. Accepted Thursday, November 12, 2026 — 23:26:35 +08:00._

### R02. Preserve existing billing-account fee snapshots

- [x] Make fee-item creation and revision affect schedules for new accounts only; preserve all existing billing-account items, installments, total due, and balance snapshots.
- [x] Retain the existing create-response shape, update affected API/database documentation, and prove the corrected behavior with isolated feature tests.

**Remediation update — Thursday, November 12, 2026 — 23:32:53 +08:00:** R02 removed the only action that propagated created/revised fee items into existing billing accounts. Fee-item create and revision now only update the configured schedule/version for future account creation; the existing `updatedAccountCount` response field is retained as `0`. The new feature assertion verifies an existing account retains its original fee-item snapshot, zero added installments, `total_due_cents`, and `balance_cents` after both creation and revision. The API contract and ERD note now state the new-accounts-only rule. Focused finance tests passed (3 tests / 55 assertions); Pint passed; full isolated PHPUnit passed (151 tests / 1,075 assertions). No migration, target-MySQL exercise, shared/production data access, provider action, or deployment ran.

**Resume Note:** _State: ACCEPTED; RELEASE-BLOCKED. The owner accepted R02 and the confirmed M9.1 fee-snapshot defect is resolved in isolated SQLite evidence. Target-MySQL migration/locking behavior and every unrelated A06/B13 finding remain open; this change does not establish release readiness. Report: `EducatraK-Knowledge-Base/08-Logs/2026-11-12-r02-billing-snapshot-preservation.md`._

**Owner disposition:** _Accepted for the verified fee-snapshot correction. Acceptance resolves this M9.1 tracker item only; it does not authorize a target-MySQL exercise, shared/production data operation, provider/infrastructure work, or release. Accepted Thursday, November 12, 2026 — 23:37:37 +08:00._

### R03. Make auditable financial mutations atomic

- [x] Enclose each affected financial mutation and its audit write in one outer transaction without changing financial rules or response contracts.
- [x] Add isolated regression proof that an audit-recording failure rolls back the related adjustment, close-out, void-request, and void-decision mutation.

**Remediation update — Thursday, November 12, 2026 — 23:53:26 +08:00:** R03 adds an outer database transaction to adjustment creation, close-out submission, void-request creation, and void-request decision. Each transaction now includes the business mutation and its required audit entry, so an audit failure rolls back the corresponding financial change. Existing nested action transactions remain intact and are encompassed by the outer boundary. `CashierOperationsTest` now makes the audit logger fail for each of the four paths and proves that no related adjustment, close-out, void request/decision, payment status change, balance change, or audit entry persists. Focused cashier operations passed (24 tests / 278 assertions); Pint completed; full isolated PHPUnit passed (155 tests / 1,100 assertions). No migration, target-MySQL exercise, shared/production data access, provider action, scheduler/worker execution, backup/restore, infrastructure operation, or deployment ran.

**Resume Note:** _State: ACCEPTED; RELEASE-BLOCKED. The owner accepted R03, resolving the confirmed audit-atomicity implementation gap in isolated SQLite evidence. Matching-MySQL concurrency/transaction verification and every unrelated A06/B13 finding remain open. Report: `EducatraK-Knowledge-Base/08-Logs/2026-11-12-r03-audit-atomicity.md`._

**Owner disposition:** _Accepted for the verified financial audit-atomicity remediation. Acceptance resolves this tracker item only; it does not authorize target-MySQL, shared/production database, provider, infrastructure, recovery, or deployment work, nor approve release. Accepted Friday, November 13, 2026 — 00:01:22 +08:00._

### R04. Return close-out system totals by payment method

- [x] Return each signed-in Cashier's valid daily totals by recorded payment method while retaining `system_cash_cents` as the cash-drawer reconciliation value.
- [x] Persist the submitted method breakdown in the close-out snapshot and show it in the live close-out form and locked summary.
- [x] Prove multi-method totals and cash-only variance through isolated backend and frontend regression coverage.

**Remediation update — Friday, November 13, 2026 — 00:19:30 +08:00:** R04 adds a shared close-out total calculation that groups valid daily payments by their stored method. `GET /api/close-outs/today` and close-out records now expose `system_totals` as the method-to-centavos map while retaining `system_cash_cents` for the required cash-only variance calculation. Submissions snapshot both `cash_cents` and the by-method map, including non-cash payment totals, so later history cannot recalculate the day. The live Cashier close-out surface renders the API-provided breakdown before submission and after lock; it does not hard-code payment methods or change the count/variance workflow. Focused cashier PHPUnit passed (25 tests / 290 assertions); focused live close-out Vitest passed (3 tests); Pint completed; full isolated PHPUnit passed (156 tests / 1,112 assertions); frontend production build passed. The full frontend suite retains one pre-existing unrelated Registrar/LRN assertion failure and the existing LiveBillingAccounts table-whitespace warning. No migration, target-MySQL exercise, shared/production data access, provider action, scheduler/worker execution, backup/restore, infrastructure operation, or deployment ran.

**Resume Note:** _State: ACCEPTED; RELEASE-BLOCKED. The owner accepted R04, resolving the M13 per-method close-out totals implementation gap in isolated SQLite/frontend evidence. Matching-MySQL transaction/concurrency verification and every unrelated A06/B13 finding remain open. Report: `EducatraK-Knowledge-Base/08-Logs/2026-11-13-r04-closeout-method-totals.md`._

**Owner disposition:** _Accepted for the verified M13 close-out total remediation. Acceptance resolves this tracker item only; it does not authorize target-MySQL, shared/production database, provider, infrastructure, recovery, or deployment work, nor approve release. Accepted Friday, November 13, 2026 — 10:45:06 +08:00._

### R05. Remove invalid billing-table whitespace

- [x] Remove the literal whitespace text node between adjacent billing-account table cells without changing table content, behavior, or styling.
- [x] Add focused render coverage that fails if the live billing-account row emits React's `validateDOMNesting` warning.

**Remediation update — Friday, November 13, 2026 — 10:55:15 +08:00:** R05 removes the sole literal text node between adjacent `<td>` elements in the live billing-account row and adds a focused render regression assertion for the absence of `validateDOMNesting`. Focused live-billing-account Vitest passed (5 tests). The frontend production build passed. Full frontend Vitest has 249 passes and one pre-existing unrelated Registrar/LRN assertion failure at `liveStudents.test.tsx:71`; the prior billing-table nesting warning was not emitted. No API, data, styling, migration, database, provider, infrastructure, or deployment behavior changed.

**Resume Note:** _State: ACCEPTED; RELEASE-BLOCKED. The owner accepted R05, resolving the invalid billing-table whitespace defect in focused frontend evidence. The unrelated Registrar/LRN assertion failure and all remaining A06/B13 and matching-MySQL blockers remain open. Report: `EducatraK-Knowledge-Base/08-Logs/2026-11-13-r05-billing-table-whitespace.md`._

**Owner disposition:** _Accepted for the verified billing-table markup remediation. Acceptance resolves this tracker item only; it does not resolve the unrelated Registrar/LRN assertion or authorize database, provider, infrastructure, recovery, or deployment work, nor approve release. Accepted Friday, November 13, 2026 — 13:09:23 +08:00._

### R06. Reconcile the Registrar profile baseline test

- [x] Align the stale MockDB Registrar-profile assertions with the approved academic, personal, and guardian-content contract.
- [x] Confirm that the approved Registrar profile excludes billing content and restore the full frontend test baseline.

**Remediation update — Friday, November 13, 2026 — 13:14:25 +08:00:** R06 changes only `liveStudents.test.tsx`. The stale test now verifies the approved MockDB Registrar profile: LRN, grade level, section, enrollment status, personal information, and guardian details are present, while account-balance and billing-status content are absent. This matches the approved November 7 MockDB decision and existing operational profile coverage. Focused live-student Vitest passed (11 tests); the complete frontend suite passed (36 files / 250 tests). No UI, API, data, permission, database, provider, infrastructure, or deployment behavior changed.

**Resume Note:** _State: ACCEPTED; RELEASE-BLOCKED. The owner accepted R06, resolving the stale Registrar-profile test assertion in frontend evidence. All unrelated A06/B13 and matching-MySQL blockers remain open. Report: `EducatraK-Knowledge-Base/08-Logs/2026-11-13-r06-registrar-profile-test.md`._

**Owner disposition:** _Accepted for the verified Registrar-profile test-contract correction. Acceptance resolves this tracker item only; it does not authorize database, provider, infrastructure, recovery, or deployment work, nor approve release. Accepted Friday, November 13, 2026 — 13:16:57 +08:00._

### R07. Add direct regression coverage for documented API contracts

- [x] Add isolated synthetic-data coverage for student-record options, current-year student statements, fee deactivation, billing adjustments, Administrator user filtering and update, and security-event pagination.
- [x] Update the API-contract evidence ledger to identify the resulting direct tests without changing endpoint behavior.

**Remediation update — Friday, November 13, 2026 — 13:31:24 +08:00:** R07 adds seven direct endpoint-contract tests across the existing Laravel feature suites. They cover active student-record options; current-account statements and their 404 case; fee deactivation and repeated-deactivation conflict; billing-adjustment response, balance, and audit; Administrator list filters; ordinary user update and audit; and security-event pagination. Focused coverage passed (62 tests / 617 assertions); Pint completed on the five touched test files; the full isolated Laravel suite passed (163 tests / 1,160 assertions). No application endpoint, migration, database, provider, infrastructure, or deployment behavior changed.

**Resume Note:** _State: ACCEPTED; RELEASE-BLOCKED. The owner accepted R07, resolving the documented direct API-contract coverage gap in isolated SQLite evidence. Matching-MySQL behavior and all unrelated A06/B13 blockers remain open. Report: `EducatraK-Knowledge-Base/08-Logs/2026-11-13-r07-api-contract-regression-coverage.md`._

**Owner disposition:** _Accepted for the verified direct API-contract regression coverage. Acceptance resolves this tracker item only; it does not authorize target-MySQL, shared/production database, provider, infrastructure, recovery, or deployment work, nor approve release. Accepted Friday, November 13, 2026 — 13:33:42 +08:00._

### R08. Cover the bounded StudentImportPage prototype

- [x] Add focused UI coverage for accepted CSV/XLSX selection, unsupported/empty-file rejection, removal, and the disabled apply boundary.
- [x] Verify the explicit live-mode unavailable state without adding parsing, import/apply, API, or persistence behavior.

**Remediation update — Friday, November 13, 2026 — 13:41:49 +08:00:** R08 adds focused `StudentImportPage` coverage for the existing Phase 1 selection-only prototype. The tests assert valid CSV selection and removal, unsupported and empty-file rejection, disabled confirmation, and the MockDB-only unavailable notice in live mode. Focused Vitest passed (3 tests); the full frontend suite passed (37 files / 253 tests). No screen behavior changed and no parsing, import/apply, API, data, database, provider, infrastructure, or deployment operation was added.

**Resume Note:** _State: ACCEPTED; RELEASE-BLOCKED. The owner accepted R08, resolving the bounded StudentImportPage coverage gap in frontend evidence. Import parsing/apply behavior remains separately unapproved, and all unrelated A06/B13 and matching-MySQL blockers remain open. Report: `EducatraK-Knowledge-Base/08-Logs/2026-11-13-r08-student-import-prototype-coverage.md`._

**Owner disposition:** _Accepted for the verified selection-only prototype regression coverage. Acceptance resolves this tracker item only; it does not authorize file parsing, column matching, roster comparison, import/apply behavior, an API, persistence, database access, provider activity, infrastructure work, deployment, or release. Accepted Friday, November 13, 2026 — 13:47:15 +08:00._

---

# 5. Explicit stop conditions and non-negotiable safety

Stop the *affected workstream*, record an issue, and ask when any of these apply:

1. A database change would rename/drop/overwrite columns or alter linked real student/guardian/billing/payment/receipt/audit data without approved migration/backfill/rollback details.
2. The proposed change would use fabricated student LRNs or touch real student/guardian/staff/financial records in fixtures or source.
3. A new permission, role, guardian-data owner, Super Admin recovery path, fee-approval threshold, retention or delete policy is not approved.
4. A function might alter outstanding balances, receipt sequences, existing fee snapshots, account ownership or historical audit evidence without tested invariants.
5. An external operation would send a real SMS/email, execute a backup/restore on an important environment, run a scheduled job, modify infrastructure, or deploy.
6. Current branch is wrong, merge is incomplete, working tree contains unexpected changes, or code/docs differ from recorded assumptions.
7. A Must requirement conflicts with a newer approved decision, or an active backend feature would re-enable retired clearance/permit logic.
8. Unavailable MySQL, Composer, PHP extensions or environment prevents honest verification of a required acceptance criterion.
9. A proposed task requires touching `frontend/`, MockDB or a new API integration not separately authorized.
10. The user asks to continue but an earlier acceptance or policy gate remains unsatisfied. **Never treat silence as acceptance.**

Permitted safe work while a separate workstream is blocked: read-only investigation, drafting questions, documenting actual evidence, and implementation within **already approved independent** scope. Do not work around the missing decision by selecting a default.

## Dangerous commands and data operations

Do not run `migrate:fresh`, `migrate:reset`, `migrate:refresh`, `db:wipe`, `db:seed`, `composer setup` (contains `migrate --force`), schema drops, backup restore, production migrations or destructive SQL until the exact environment, effects and authorization have been verified. A test's in-memory database may be created/destroyed automatically **only** when its connection is proven isolated. Never upload `.env`, private keys, secrets or real school data.

No commits/pushes/PR merges without owner approval. Do not manipulate existing branch history. `git diff --check` and an explicit `git diff -- frontend/` are required after each backend workstream; preserve any pre-existing frontend differences and confirm no **new unauthorized** frontend diff.

---

# 6. Tracking and real timestamp discipline

**Every code/documentation change**, including changes to this manual, must append a meaningful entry to:

- `EducatraK-Knowledge-Base/08-Logs/Agent Sessions/changelogs.md` (append-only).
- Relevant `EducatraK-Knowledge-Base/08-Logs/` session log.
- `EducatraK-Knowledge-Base/08-Logs/Agent Sessions/Issues-and-TODOs.md` when a confirmed gap, blocker or resolved tracked issue changes.

A log entry must have a **fresh actual local clock reading** in the exact format specified by root `AGENTS.md`/`CLAUDE.md`. Never reuse the historical merge time, invent timestamps, infer acceptance, or mark unrun tests as passed. When updating an existing issue, preserve its history and reconcile with actual code.

### Per-workstream ledger (copy once for each approved B-item)

```markdown
### Resume — B[NN]: [workstream name]
- State: NOT_STARTED | EVIDENCE_COLLECTED | PLAN_READY | WAITING_FOR_APPROVAL | APPROVED | IMPLEMENTING | VALIDATING | WAITING_FOR_ACCEPTANCE | ACCEPTED | BLOCKED
- Branch / verified HEAD / working tree:
- Source requirements and owner approval (exact reference):
- Existing code and already-verified behavior:
- Exact accepted scope / files expected:
- Data/API/role invariants:
- Commands and tests actually run (outcome, counts):
- Migrations/data operations: none | proposed only | approved safe disposable test (details):
- Diff inspection; unauthorized frontend changes: none | explained:
- Open decisions/risks and issue references:
- Resume Note (actual work, evidence and immediate next action):
- Owner acceptance and authorization for next workstream: pending | explicit reference:
- Logged at: [read agent's actual clock; Asia/Manila format per root instructions]
```

### Phase 0 report template

```markdown
# EducaTrak Backend Phase 0 — Readiness and Workstream Queue
- Verified branch / HEAD / clean or existing changes:
- Source list and conflicts:
- Runtime/tooling/test results (actual):
- Existing route/API/model/migration inventories:
- Must-module coverage matrix with file and test citations:
- Approved optional work and out-of-scope items:
- High-risk data/security/financial problems:
- Unresolved owner decisions, with recommended options and consequences:
- Safe next workstream, exact files, precise test plan and rollback/data impact:
- Readiness: CODE / SCHEMA / INTEGRATION / ENVIRONMENT / DEPLOYMENT (verified, blocked, or not assessed):
- Approval request: [one workstream only]
- Explicit STOP: No code modified in Phase 0 unless owner separately authorized documentation updates.
```

## 7. Deliverable and completion definition

At the end of **each** approved build workstream, provide: changed files; what was already working vs new; diff summary; requirement/role/API mappings; focused and full tests actually run; database impacts; privacy/security checks; remaining blockers; truthful ledger updates; and a **request for acceptance**, then stop.

The backend loop is **complete** only when approved builds and the formal audit are accepted, all Must requirements have evidence (or owner-accepted explicit exceptions), deployment dependencies are verified or clearly declared blocked, and documentation matches behavior. **Never claim production-ready simply because all local tests pass.**

## 8. First instruction to Codex

**Read this manual and applicable repository instructions, verify the post-merge `feature/backend-foundation` checkout and current files, execute Phase 0 read-only, produce the module-by-module readiness/gap report and the first proposed workstream. Ask the owner for approval and STOP. Do not immediately implement all backend modules.**

## 9. Database architecture audit reconciliation

**Recorded Friday, November 13, 2026 — 14:27:55 +08:00.** A documentation-only audit at `124a78637e36ee91fd0b3a126813b5a394305ab6` reconciled `ERD.md`, `Data-Dictionary.md`, `Database-Review.md`, and `Reference-Schema.sql` with the current migrations, API contracts and read-only frontend adapters. The executable student identifier is unique twelve-digit-string `students.lrn`; `students.id` remains the stable foreign-key identity. `guardian_student.relationship` is now the additive, link-specific field; legacy `guardians.relationship` is retained.

The audit found a material approved-source conflict: the November 5 fee-assignment decision calls for a newly added fee to affect existing accounts on its schedule, while R02/current `FinanceSettingsController` behavior preserves existing account snapshots and reports zero updated accounts. Do not start fee/account remediation until the MCA finance owner resolves additions versus revisions and approves data preservation, rollback and matching-MySQL evidence. School-year management, guardian lifecycle, retention, import application, target-MySQL validation and backup/recovery remain separate open gates. No code, migration, database action, frontend change, provider operation, scheduler/worker run, or deployment was performed by this audit.

## 10. Approved fee-assignment synchronization implementation

**Recorded Friday, November 13, 2026 — 20:42:01 +08:00.** The owner explicitly authorized the previously proposed DB-04 workstream. `ApplyFeeItemToBillingAccountsAction` restores the November 5 approved behavior inside the existing finance transaction: for each existing account using an affected fee schedule, it creates the new account-item snapshot and one unpaid installment, then increments integer-centavo total due and balance. Existing account-item snapshots are not rewritten when a fee is revised. An all-grade revision synchronizes only a schedule where the prior fee was absent; schedules that already carry it keep the normal versioned-revision path.

Focused isolated SQLite coverage in `FinanceSettingsMutationTest` passed 5 tests / 79 assertions, including selected-grade addition, all-grade addition, duplicate rejection, revision snapshot preservation, and all-grade missing-fee synchronization. Pint and PHP syntax checks passed. No migration, development/shared/production database access, reference SQL execution, frontend change, provider action, scheduler/worker execution, backup/restore, infrastructure change, commit, push, or deployment ran. Matching-MySQL transaction/lock/rollback evidence, school-year management, guardian lifecycle, retention, import application, and operational recovery remain open gates.

## 11. Backend synchronization impact analysis

**Recorded Friday, November 13, 2026 — 20:55:42 +08:00.** Documentation-only impact analysis re-checked the current migrations, models, controllers, requests, routes, tests, live frontend adapter contracts, approved decisions, and prior validation records. The complete approval matrix is `EducatraK-Knowledge-Base/02-Architecture/Backend-Database-Design/Backend-Synchronization-Plan.md`.

It identifies two independent P0 corrections: SYNC-GDN-01 makes valid new guardian payloads persist despite the legacy non-null guardian relationship column, and SYNC-FIN-01 recalculates account/installment status when fee synchronization adds a same-day charge. SYNC-LRN-01 is an independent test-data and boundary-coverage correction; production schema/API already uses `lrn`, and no backend legacy identifier reference was found. LRN database CHECK hardening, optional guardian-legacy retirement, current-school-year enforcement, imports, retention, and matching-MySQL execution remain explicitly gated by data/policy/environment approval. No application code, migration, database operation, frontend change, provider action, scheduler/worker run, backup/restore, infrastructure action, commit, push, or deployment occurred in this analysis.

## 12. SYNC-GDN-01 controlled implementation

**Recorded Friday, November 13, 2026 — 21:40:11 +08:00.** The owner approved **SYNC-GDN-01 only**. `StudentController` now executes each student create/update, optional guardian/link mutation, and audit record in one transaction. When the flow creates a guardian, it writes the already validated link relationship to the existing required `guardians.relationship` field as a compatibility mirror, then writes the authoritative `guardian_student.relationship` value. Existing guardian-wide legacy values are not overwritten when a later student-link relationship changes.

`StudentAccessTest` passed 13 tests / 84 assertions, including valid guardian persistence, rollback after an injected audit failure, and existing-legacy preservation during a link update. PHP syntax checks and Pint passed. The complete isolated Laravel PHPUnit suite passed 167 tests / 1,192 assertions. No migration was created, changed, or run; no reference SQL, development/shared/production database, frontend source, provider, scheduler/worker, backup/restore, infrastructure, commit, push, or deployment operation ran.

**Resume Note:** _State: ACCEPTED. The owner accepted the verified guardian writer correction. It preserves request/response names, surrogate student IDs, linked history, and existing guardian-wide values. Guardian ownership, primary-contact and multi-link lifecycle policy, legacy-column retirement, matching-MySQL proof, SYNC-FIN-01, SYNC-LRN-01, school-year, import, retention, recovery, and deployment remain outside this accepted scope._

**Owner disposition:** _Accepted for SYNC-GDN-01 only at Friday, November 13, 2026 — 21:59:04 +08:00. This acceptance does not accept SYNC-FIN-01, authorize a migration, database operation, lifecycle policy, matching-MySQL operation, deployment, or any next workstream._

- Logged at: Friday, November 13, 2026 — 21:40:11 +08:00

## 13. SYNC-FIN-01 controlled implementation

**Recorded Friday, November 13, 2026 — 21:53:08 +08:00.** The owner approved **SYNC-FIN-01 only**. ApplyFeeItemToBillingAccountsAction now invokes the existing RecalculateBillingStatusAction after it creates an account-item snapshot and same-day installment, and increments integer-centavo total due/balance. The action is called inside FinanceSettingsController's pre-existing outer transaction, so the snapshot, amount, status, and audit result roll back together on failure. It does not revise previously recorded fee snapshots, payments, allocations, receipts, routes, or response fields.

FinanceSettingsMutationTest passed 6 tests / 84 assertions, including a frozen-Manila-time paid-account transition to a same-day due_soon installment/account. BillingStatusSynchronizationTest passed 3 tests / 24 assertions for the existing configured/default-window status rules. PHP syntax checks and Pint passed. The complete isolated Laravel PHPUnit suite passed 168 tests / 1,197 assertions. No migration was created, changed, or run; no reference SQL, development/shared/production database, frontend source, provider, scheduler/worker, backup/restore, infrastructure, commit, push, or deployment operation ran.

**Resume Note:** _State: ACCEPTED. The owner accepted the verified fee-status correction. It retains all existing financial snapshots, payment/receipt/allocation history, authorization, routes, request/response fields, and integer-centavo storage. Matching-MySQL locks/transactions, SYNC-LRN-01, school-year, guardian lifecycle, import, retention, recovery, and deployment remain outside this accepted scope._

**Owner disposition:** _Accepted for SYNC-FIN-01 only at Friday, November 13, 2026 — 22:38:29 +08:00. This acceptance does not authorize a migration, database operation, matching-MySQL operation, deployment, or any next workstream._

- Logged at: Friday, November 13, 2026 — 21:53:08 +08:00

## 14. SYNC-LRN-01 controlled implementation

**Recorded Friday, November 13, 2026 — 22:54:48 +08:00.** The owner approved **SYNC-LRN-01 only**. The executable LRN contract was already correct: `students.lrn` is a unique twelve-character string, `UpsertStudentRequest` requires exactly twelve digits, and ordinary PATCH requests must retain the stored value. This work changes only synthetic test data and request-boundary coverage. Nine affected feature suites now use fictional twelve-digit LRN values in records, searches, and expected serialized output; receipt labels and other non-LRN test identifiers were not changed.

`StudentAccessTest` passed 15 tests / 99 assertions, including 422 responses for nonnumeric, short, and long LRNs and successful preservation of a leading-zero twelve-digit LRN. The nine affected feature suites passed 67 tests / 628 assertions. Pint passed. The complete isolated Laravel PHPUnit suite passed 170 tests / 1,212 assertions. Static scans found no backend `student_no`/`studentNo` use and no invalid literal LRN test fixture. No migration was created, changed, or run; no reference SQL, development/shared/production database, frontend source, provider, scheduler/worker, backup/restore, infrastructure, commit, push, or deployment operation ran.

**Resume Note:** _State: ACCEPTED. The owner accepted the verified LRN test-data and request-boundary correction. It preserves the LRN API field, numerical surrogate student IDs, all relationships, financial history, and existing installed records. Database-level LRN hardening, any installed-record reconciliation, matching-MySQL proof, school-year, guardian lifecycle, import, retention, recovery, and deployment remain outside this scope._

**Owner disposition:** _Accepted for SYNC-LRN-01 only at Friday, November 13, 2026 — 23:05:18 +08:00. This acceptance does not authorize a migration, database operation, installed-record reconciliation, matching-MySQL operation, deployment, or any next workstream._

- Logged at: Friday, November 13, 2026 — 22:54:48 +08:00

## 15. SYNC-DOC-01 controlled implementation

**Recorded Friday, November 13, 2026 — 23:21:49 +08:00.** The owner approved **SYNC-DOC-01 only**. Active canonical references in the master Project Specification and its source-derived Scope and Access Control view now use the approved twelve-digit text LRN and `lrn` contract name. A dated reconciliation note distinguishes this terminology correction from any schema migration, installed-record conversion, or numerical student-ID change. Historical decision records remain unchanged.

Documentation review confirmed the master and derived view are consistent, active student search/add/import/interface references use LRN/`lrn`, and the historical decision records retain their original Student Number wording. No backend/frontend application source, migration, reference SQL, database, provider, scheduler/worker, backup/restore, infrastructure, commit, push, or deployment operation ran.

**Resume Note:** _State: ACCEPTED. The owner accepted the verified canonical terminology correction. It does not represent or authorize a schema conversion, record backfill, API rename, installed-record reconciliation, target-MySQL operation, policy change, or any further workstream._

**Owner disposition:** _Accepted for SYNC-DOC-01 only at Friday, November 13, 2026 — 23:32:10 +08:00. This acceptance does not authorize a schema conversion, migration, database operation, installed-record reconciliation, matching-MySQL operation, deployment, or any next workstream._

- Logged at: Friday, November 13, 2026 — 23:21:49 +08:00

## 16. SYNC-MYSQL-01 controlled target-environment preflight

**Recorded Friday, November 13, 2026 — 23:44:55 +08:00.** The owner approved **SYNC-MYSQL-01 only**. The required preflight verified branch `feature/backend-foundation` at `124a78637e36ee91fd0b3a126813b5a394305ab6`, the current 14-migration inventory, Laravel's strict MySQL defaults, and the isolated SQLite PHPUnit configuration. The repository has no backend `.env`, container/Compose definition, target MySQL version/collation record, MySQL client/server command, or owner-identified disposable database. PHP 8.4.27 can load PDO MySQL; that is a local driver capability, not target-server evidence.

`Target-MySQL-Validation-Runbook.md` now provides the required fail-closed environment matrix, target identity checks, migration/schema comparison, synthetic upgrade/constraint/concurrency/failure tests, migration-lock check, and disposable backup/restore rehearsal. It explicitly prohibits selecting a substitute MySQL version/collation, connecting to a default database, or running migrations before the deployment/database owner supplies and authorizes the matrix and disposable boundary.

**Resume Note:** _State: BLOCKED — ENVIRONMENT. No application code or migration changed; no database connection, migration, reference SQL execution, backup/restore, frontend change, provider action, scheduler/worker run, infrastructure change, commit, push, or deployment occurred. Supply the owner-approved target engine/version/collation/configuration matrix and a clean disposable instance before the documented validation can start._

**Owner disposition:** _The owner accepted the completed SYNC-MYSQL-01 environment preflight at Friday, November 13, 2026 — 23:49:04 +08:00. This accepts the documented blocked disposition only; the target-MySQL migration, constraint, concurrency, lock, and backup/restore validation remains incomplete pending the supplied disposable target evidence. It does not authorize any next workstream, production deployment, or policy-gated schema change._

- Logged at: Friday, November 13, 2026 — 23:44:55 +08:00

## 17. SYNC-GDN-02 approved guardian-legacy retirement gate

**Recorded Saturday, November 14, 2026 — 00:04:22 +08:00.** The owner approved **SYNC-GDN-02 first**. Static inspection confirms the existing migration added nullable `guardian_student.relationship` and copied the then-current `guardians.relationship` value into every link, while the current writer keeps the legacy field required as a compatibility mirror for a new guardian. The migration must not be rewritten.

**Resume Note:** _State: BLOCKED — DATA AND ENVIRONMENT. The approved target requires a read-only installed-data preflight that reports only aggregate counts of null pivot values and conflicting legacy/pivot values, followed by owner review. No configured database exists in this workspace, and matching-MySQL validation remains unavailable. Therefore no nullable-column migration, backfill command, model/controller/API change, or test fixture change was made. Never derive a relationship, merge guardians, choose a primary guardian, or remove legacy values._

**Owner disposition:** _Approval records SYNC-GDN-02 as the first next workstream only. It does not authorize database access, a migration, backfill, target-MySQL operation, guardian-lifecycle policy decision, frontend change, or any other workstream until the stated data and environment gates are satisfied._

- Logged at: Saturday, November 14, 2026 — 00:04:22 +08:00

## 18. SYNC-LRN-02 approved database-format hardening gate

**Recorded Saturday, November 14, 2026 — 00:07:34 +08:00.** The owner approved **SYNC-LRN-02**. The current executable contract already has unique `students.lrn VARCHAR(12)` storage and request validation requiring exactly twelve digits. The requested database CHECK remains target-engine dependent and cannot be inferred from SQLite.

**Resume Note:** _State: BLOCKED — DATA AND ENVIRONMENT. Before any migration, an owner-authorized read-only preflight must report aggregate counts of existing LRNs that are not exactly twelve characters or contain nondigits, without emitting their values. Any invalid record needs owner-supplied evidence-based reconciliation; no LRN may be generated, converted, or guessed. The exact MySQL/MariaDB version, collation, and CHECK behavior must then be proven in a matching disposable environment._

**Owner disposition:** _Approval records SYNC-LRN-02 only. It does not authorize database access, a migration, installed-record change, target-MySQL operation, frontend change, or any other workstream until the stated data and environment gates are satisfied._

- Logged at: Saturday, November 14, 2026 — 00:07:34 +08:00

## 19. W1a school year, terms, exam periods, grade levels and sections

### Resume — W1a: School structure settings (M9.4)
- State: VALIDATING; committed locally under the owner's 2026-11-19 gated approval for W1a–W3.
- Branch / verified HEAD / working tree: `feature/backend-completion` created from `main` at `0b600db`; clean before work.
- Source requirements and owner approval (exact reference): `Modules-and-Features.md` M9.4; owner decisions 1, 2 and 4 approved 2026-11-19. Administrator manages school structure (`settings.system.manage`); Accounting reads it (`settings.system.view`). School years are never deleted. Label corrections are audited. School-year and term dates lock once any billing account exists for the year. The current year may change mid-year with a 10–1000 character reason. Exactly one year is current.
- Existing code and already-verified behavior: tables `school_years`, `terms`, `exam_periods`, `grade_levels` and `sections` already existed. The dashboard 409 when not exactly one current year is unchanged. No management routes existed.
- Exact accepted scope / files: new `backend/app/Http/Controllers/Api/SchoolStructureSettingsController.php` and `backend/tests/Feature/SchoolStructureSettingsTest.php`. Edited `backend/routes/api.php` (13 routes) and added boolean casts and relations on `SchoolYear`, `Term`, `ExamPeriod`, `GradeLevel` and `Section`. Date columns are intentionally not cast, so stored values stay `Y-m-d`.
- Data/API/role invariants:
  - Reads: GET `/api/settings/school-years` and `/api/settings/grade-levels` (`settings.system.view`).
  - Writes (`settings.system.manage`): POST/PATCH school years, POST make-current, and POST/PATCH terms, exam periods, grade levels and sections. No delete routes.
  - The first year ever created becomes current; later years start non-current. make-current locks all year rows and switches in one transaction. Every mutation and its audit entry share one transaction.
  - Term and exam dates are not forced inside the school-year range; no source specifies this. Adding a dated term to a locked year is rejected.
- Commands and tests actually run:
  - `php artisan test --compact tests/Feature/SchoolStructureSettingsTest.php`: 9 tests / 121 assertions passed.
  - Full `php artisan test --compact`: 179 tests / 1,385 assertions passed.
  - `vendor/bin/pint --dirty --format agent` and `vendor/bin/pint --test --dirty` passed. `git diff --check` was clean; `git diff -- frontend/` was empty.
  - Tests ran on isolated SQLite `:memory:` with a throwaway `APP_KEY` set only for the process, because this checkout has no `.env`.
- Migrations/data operations: none.
- Diff inspection; unauthorized frontend changes: none.
- Open decisions/risks: repository-wide `pint --test` still reports pre-existing drift in 15 untouched files. Term/exam containment inside the school year is unspecified. Matching-MySQL lock behavior is unverified.
- Resume Note: W1a routes, validation, lock rules and audits are implemented and validated. Next: W1b payment-plan versioning.
- Owner acceptance and authorization for next workstream: the owner's 2026-11-19 instruction authorizes W1b once this gate passes.
- Logged at: Friday, November 20, 2026 — 00:53:27 +08:00

## 20. W1b payment-plan versioning

### Resume — W1b: Payment plans (M9.2)
- State: VALIDATING; committed locally under the 2026-11-19 gated owner approval.
- Branch / verified HEAD / working tree: `feature/backend-completion` after W1a commit `de5d424`.
- Source requirements and owner approval (exact reference): `Modules-and-Features.md` M9.2 (edit applies to new accounts only; preview from a sample total; no delete once used). Owner decision 3 (2026-11-19): new-accounts-only with versioning, no delete once used. Approved additive migration: add `version` and `previous_version_id`, relax `unique(name)` to `unique(name, version)`, change `billing_accounts.payment_plan_id` to RESTRICT. Owner answers recorded in this session:
  - due dates count from the account creation business date (Asia/Manila);
  - a percent down payment is in basis points, rounded down;
  - installments take floor(remaining × bp / 10000), with the remainder on the last.
- Existing code and already-verified behavior: `GET /api/settings/finance/plans` existed (read-only). `payment_plan_installments` already stored `due_day_offset` and `percent_of_remaining_basis_points`.
- Exact accepted scope / files:
  - New: `backend/database/migrations/2026_11_20_010000_add_versioning_to_payment_plans.php`, `backend/app/Actions/ComputeInstallmentScheduleAction.php`, `backend/tests/Feature/PaymentPlanSettingsTest.php`.
  - Edited: `FinanceSettingsController.php` (create, revise, deactivate, preview; GET adds `version` and `previousVersionId`), `PaymentPlan.php` (active cast, `previousVersion`), `routes/api.php` (4 routes).
- Data/API/role invariants:
  - POST `/api/settings/finance/plans`, PATCH `/api/settings/finance/plans/{paymentPlan}` (revise to N+1), and POST `.../deactivate` need `settings.finance.manage`. POST `.../preview` needs `settings.finance.view`.
  - Revision creates a new row, deactivates the old row, and keeps the old row and its installments for existing accounts. Revising an inactive or superseded version returns 409.
  - There is no delete route. Database RESTRICT blocks deleting a plan that is used by an account or that a newer version references.
  - Basis points must sum to 10000. Zero-amount schedule rows are omitted.
- Commands and tests actually run:
  - Focused `PaymentPlanSettingsTest`: 7 tests / 97 assertions passed. Full suite: 186 tests / 1,498 assertions passed.
  - Pint passed on changed files (it auto-fixed only route argument spacing). `git diff --check` was clean. `frontend/` diff was empty.
- Migrations/data operations:
  - One approved additive migration, exercised only on isolated SQLite `:memory:`. The upgrade test runs `down()`, inserts fictional plans, an account and installments, then runs `up()`, `down()`, `up()`. It asserts version 1, unchanged values including `updated_at`, preserved account plan links, an empty `PRAGMA foreign_key_check`, and a restricted delete.
  - `down()` refuses while any `version > 1` row exists.
  - SQLite finding fixed before commit: rebuilding `payment_plans` fired the old ON DELETE SET NULL and erased `billing_accounts.payment_plan_id`. The migration now adds the plan columns natively on SQLite and defers FK checks. MySQL behavior is unverified (environment-blocked).
- Diff inspection; unauthorized frontend changes: none.
- Open decisions/risks:
  - Matching-MySQL execution, including the `billing_accounts_payment_plan_id_foreign` key name, is unverified.
  - The historical fee-item migration used the same SQLite rebuild pattern. This is recorded as an issue, not changed.
  - Omitting zero-amount rows awaits owner veto.
- Resume Note: W1b is complete and validated. Next: W1c system settings.
- Owner acceptance and authorization for next workstream: the 2026-11-19 owner instruction authorizes W1c once this gate passes.
- Logged at: Friday, November 20, 2026 — 00:59:12 +08:00
