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

- **Student identity:** MockDB already uses 12-digit `lrn`, but Laravel has used `students.student_no` and `studentNo` in live API; LRN semantics and existing-real-record backfill remain separately gated. **Never convert or invent real LRNs from old Student Numbers.**
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
- [ ] Enumerate runtime routes using `php artisan route:list --path=api --except-vendor` if runnable; source-count only if tooling is unavailable. Prior log reports **51 routes**, **14 migrations**, **29 models**, **19 API controllers**, and **146 backend tests passed** in a prior environment; these are **historical**, not current completion assertions.
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
- [ ] Reconcile live `student_no` and `studentNo` against existing MockDB `lrn`, with exact request/response, search, index, uniqueness and migration/backfill design. LRN is distinct from a legacy Student Number; keep surrogate `students.id` and all linked historical records stable.
- [ ] If authorized, implement an **additive, staged, testable, rollback-planned** LRN transition. Never synthesize real student identifiers; retain unresolved legacy rows safely and do not claim migration complete without verification.
- [ ] Validate grade/section relationships, active/inactive transitions, name, DOB/gender/address scope, and guardian contacts against approved policy. Guardian relationship belongs to each student–guardian link; any pivot migration requires explicit plan and approval. Do not infer the owner of guardian data.
- [ ] Preserve billing/account/payment/receipt/notification relationships on student updates and status changes.

**Acceptance evidence:** Student + guardian data-contract tests, LRN collision/legacy-backfill tests, role-sanitization tests and relationship-integrity checks.

**Resume Note:** _State: WAITING_FOR_ACCEPTANCE. Owner approved per-link relationship storage, Registrar ownership, one primary link per student, and copying existing values to every existing link. Added nullable `guardian_student.relationship` with deterministic backfill; retained the guardian-wide historical field. Student API now reads/writes the pivot value and clears other primary flags before assigning the selected primary link. Focused tests passed (16 tests, 125 assertions); full isolated suite passed (148 tests, 1,037 assertions). Await MySQL migration/concurrency validation before deployment. Logged Thursday, November 12, 2026 — 02:34:37 Asia/Manila._

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

**Resume Note:** _State: ENVIRONMENT-BLOCKED. Focused void/payment tests passed (22 tests, 260 assertions): valid-only requests, Cashier ownership, Accounting-only decision, recorder self-approval denial, no-delete balance/allocation restoration, rejection restoration, and audit actors. Actions use transactions and locks. Target-MySQL concurrent duplicate-request/decision proof remains unavailable. Blocked Thursday, November 12, 2026 — 02:44:13 Asia/Manila._

## B07. Notifications, email/SMS delivery, follow-up — M6, approved M11

- [ ] Verify queued/sent/failed logs and approved guardian contact status; payment transactions commit independently from notification failures.
- [ ] Verify email/signed Twilio callback integration, retries and idempotency, opt-in/authorized reminder batches, per-role access, rate limits where approved, failure reasons without leaking contact PII.
- [ ] Test external providers only with explicit sandbox/test credentials. **Do not send live emails or SMS** or change provider configuration without authorization.
- [ ] Reconcile scheduled reminder ownership and runtime workers; code that defines a schedule is not proof a scheduler is running.

**Acceptance evidence:** Faked provider tests, delivery callback signature tests, queued/failure behavior, no real outgoing messages.

**Resume Note:** _Unstarted._

## B08. Reports, statements, exports and dashboards — M0, M7

- [ ] Verify role-specific dashboards and financial visibility. Follow current requirements, not retired clearance concepts.
- [ ] Verify daily/monthly collection, student statements, outstanding balances, date-range semantics in `Asia/Manila`, counts and monetary totals against underlying valid payments, adjustments and voids.
- [ ] Inventory supported export/print behavior. If Excel/PDF/streaming requires an additional contract, dependency, or frontend work, request approval before introducing it.
- [ ] Verify pagination/filter/sort in the database before pagination, permission-filtered results and empty states; add missing behavior only where approved.

**Acceptance evidence:** Reconciled report totals and role data projections, date-boundary/report and export tests, contract examples.

**Resume Note:** _Unstarted._

## B09. Audit, security events, backups and recovery — M8

- [ ] Verify per-mutation audit coverage, actor identity, meaningful action, before/after minimization, safe ordering with transaction commit, security event search and protected-read capabilities.
- [ ] Verify backup status vs actual backup execution/restore behavior. **Do not claim backup works** because `/api/backups` lists records. Obtain approved backup destination/retention/restore operator and test a restore on isolated environment before readiness.
- [ ] Record retention conflict as BLOCKED; do not add retention purges or a broad deletion mechanism. Preserve staff archive's separately approved 30-day behavior.
- [ ] Review credentials, authenticated route protections, CSRF, cookie security, error responses, webhook signatures, logging redaction, audit tamper resistance and least privilege.

**Acceptance evidence:** Audit coverage matrix, denial tests, backup/restore proof or explicit environment blocker, no sensitive leak.

**Resume Note:** _Unstarted._

## B10. Close-out and cashier/accounting reconciliation — M13 (already implemented portions; optional scope policy)

- [ ] Verify existing Cashier close-out/current business date, one per cashier/day, variance reason, locked day, Accounting sign-off and no duplicate sign-offs.
- [ ] Test date-simulation routes are restricted to nonproduction contexts, proper role/capability, and concurrency under the target DB where possible.
- [ ] Repair verified defects in currently delivered flows with approval; do not enlarge optional features without owner sign-off.

**Acceptance evidence:** Double-closeout and sign-off concurrency tests, role matrix and sum reconciliation.

**Resume Note:** _Unstarted._

## B11. Student masterlist import and separate ledger import — Registrar approved prototype / M12 optional

- [ ] Distinguish **Registrar Student Masterlist** (`/students/import`, CSV/XLSX, match by LRN, create/update, optional individually selected Active→Inactive missing students) from **Ledger Import** (`/import`, financial transactions). They require separate requirements/contracts and approval gates.
- [ ] Existing approved masterlist decision expressly limits the current task to frontend MockDB. A **live Laravel student import endpoint is not yet automatically authorized** by this backend loop. Propose a separately approved backend API/DB design if needed; do not implement or claim it by default.
- [ ] If owner authorizes student import backend work, verify required guardian fields, row-level rejection/valid-row processing, zero-preselected missing students, status change with outstanding balance allowed, stale preview prevention, atomic application and import audit summary. Never delete students or rewrite financial history.
- [ ] Do not implement M12 ledger import merely to fill a checklist. Ask whether the Should-tier module is approved and obtain its exact financial reconciliation policy, idempotency and historical safeguards.

**Acceptance evidence:** Separate approved contracts and tests per import type, correct LRN semantics, explicit approval references. Otherwise mark DECISION-BLOCKED, not complete.

**Resume Note:** _Unstarted._

## B12. Other approved optional functionality — M14, enhancements, integrations

- [ ] Review explicit approval for shareable PDF receipt, advanced exports, live table sorting, maintenance functions and other `Should`/`Could` items. **Do not implement merely because mentioned**.
- [ ] For accepted optional work, produce the usual precise plan, contract, tests and approval. For unapproved items mark `OUT_OF_SCOPE` or `DECISION-BLOCKED`; do not fabricate.

**Resume Note:** _Unstarted._

## B13. Operational prerequisites and database validation — cross-cutting

- [ ] Confirm deployment PHP/Composer/extensions/locked Laravel compatibility; verify deployment MySQL version, collation, indexes/constraints, isolated environment, network/LAN topology and TLS/proxy/cookie configuration with named owner.
- [ ] Confirm scheduler, mail/SMS workers, backups and restore, secrets management, production-mode controls, migration compatibility/rollback, runbooks and health/observability already approved.
- [ ] Validate approved migrations first against a clean **disposable matching MySQL environment**, not just SQLite. Obtain specific approval before applying them to any shared/prod database.
- [ ] Record missing infrastructure as ENVIRONMENT-BLOCKED; code may be complete while deployment is not. Do not run `Reference-Schema.sql` or broad destructive operations.

**Acceptance evidence:** Environment matrix with actual versions/commands/results, targeted schema tests, isolated restore proof or honest blockers.

**Resume Note:** _Unstarted._

---

# 4. Formal Cross-Check & Audit Phase (after Build Gate only)

## Audit entry gate

- [ ] Every applicable approved Build workstream B00–B13 has `ACCEPTED` with evidence, or the owner explicitly accepts a named blocker/deferment. No unchecked workstream is silently treated as complete.
- [ ] The owner explicitly authorizes the **formal audit phase**. Tests run during build do not count as completed audit phases.

### A01. Requirements, route and contract traceability

- [ ] Map every current Must requirement/module and authorized optional requirement to route, controller/service, request validation, data model, response shape, role guard, relevant frontend read-only expectation and named test. Report missing contracts, pagination/sort differences, unauthorized routes and stale documentation.
- [ ] Check retired clearance/permit absence from active APIs and preservation of historical data. Check exact student LRN and guardian data contracts.

**Resume Note:** _Unstarted._

### A02. Financial, database and race-condition audit

- [ ] Check integer centavos, balance reconciliation, payment allocation, idempotency, receipt uniqueness, void compensation, adjustment snapshots, fee revisions, school-year selection, close-out concurrency and immutable audit/financial history.
- [ ] Compare SQLite test outcomes to matching MySQL constraints and concurrency semantics; if MySQL unavailable report NOT VERIFIED, not PASS.

**Resume Note:** _Unstarted._

### A03. Security, authorization and privacy audit

- [ ] Test six-role permission matrix across all active endpoints; attempt horizontal IDOR and privilege escalation; inspect CSRF/session expiration, login limiter, webhook signature validation, server error data exposure, audit redaction and imported PII.
- [ ] Check critical concerns against Laravel security guidance; do not add production-only headers/CORS/proxy assumptions without network requirements.

**Resume Note:** _Unstarted._

### A04. Regression, integration contract, and performance audit

- [ ] Run full backend tests and relevant end-to-end/test-contract scenarios; compare live API expectations to frontend adapters **without editing frontend**. Flag gaps for a later approved frontend workstream.
- [ ] Verify filtering, pagination, sorting, indexes, query counts, transaction length, file import limits (if approved), accessible user-facing error shapes, and stable date behavior. Run reproducible performance checks only in isolated environments.

**Resume Note:** _Unstarted._

### A05. Deployment, recovery, and release readiness

- [ ] Verify config by environment, PHP extensions, Composer audit when available, locked dependencies, MySQL schema/migration dry run, scheduler jobs, email/SMS sandbox, backup and restore, least-privilege accounts, TLS, secure cookies, secrets and monitoring.
- [ ] Define rollback and recovery plan with the owner; separately gate migrations on any shared/prod DB, network configuration, and deployment. A successful SQLite suite is **not** deployment approval.

**Resume Note:** _Unstarted._

### A06. Final reconciliation and delivery

- [ ] Produce requirement/route/test coverage matrix, accepted workstreams, source conflicts, DB/schema change list, security/risk register, deployment blockers, accurate test counts and commands, documentation updates and handoff.
- [ ] Audit the final diff for forbidden frontend changes, secrets, production data, unrelated refactors and unapproved services; no commit/push without express authorization.

**Resume Note:** _Unstarted._

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
