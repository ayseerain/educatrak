# Database architecture review and reconciliation

## Audit boundary

This review covers `feature/backend-foundation` at `124a78637e36ee91fd0b3a126813b5a394305ab6`, with a clean working tree at audit start. It inspected migrations, models, actions, API routes/controllers/requests, factories and feature-test inventory, frontend live adapters/forms and MockDB shape, applicable requirements/decisions, `Backend-Loop-Engineering.md`, the backend ledger, and active issue records.

No migration, reference SQL, query, database connection, backup/restore, provider delivery, worker, scheduler, commit, or deployment ran. The documented test results below are only the prior records cited in the engineering ledger; this documentation audit does not re-claim them as fresh execution.

## Executable baseline

| Area | Observed current implementation |
|---|---|
| Migration/schema | 12 EducaTrak migrations create/alter 30 domain tables. Laravel support migrations add user/session/cache/queue tables. `Reference-Schema.sql` is descriptive only. |
| Identity/roles | `users.role` is a string; six roles are enforced by `UserRole` and `CapabilityMap`, not a DB enum/check. Staff archive fields and protected-bootstrap flag are persisted. |
| Student identity | `students.lrn varchar(12)` is unique. `UpsertStudentRequest` requires exactly twelve digits and PATCH only accepts the record's existing LRN. Surrogate `students.id` remains all relationship keys. |
| Guardians | The many-to-many pivot has composite PK, primary flag and nullable link relationship. The guardian-wide relationship column is retained after additive backfill. Student create/update now atomically writes the required legacy compatibility value for a new guardian, writes the pivot value, and records audit; later link updates preserve the legacy value. |
| Academic | School years, terms, exam periods, grades and sections are normalized. Grade/section mismatch is rejected by request/controller validation. |
| Billing | Accounts are one per student/year and retain account-item snapshots. A newly added schedule fee is copied to existing accounts on that schedule with one unpaid installment and centavo total/balance increments; revisions retain prior snapshots. Installments, payments, adjustments, allocations, receipts, void requests, idempotency keys and receipt sequence records are normalized. |
| Money | No floating-money column was found. Charges/payments are unsigned integer centavos; adjustments and variance use signed integer centavos. |
| Audit/history | Financial FKs predominantly restrict delete; audit is relational only to actor and polymorphic for subject. No DB append-only trigger/privilege layer is declared. |
| Notifications/import | Notification delivery metadata exists; generic import batches exist. Neither table proves provider delivery or student-import implementation. |
| Clearance/permit | Tables/models/factories persist historical clearance data, but routes expose no active clearance/permit workflow. |

## Field trace: live frontend to persistence and output

| Flow | Frontend contract | Server path | Database/result |
|---|---|---|---|
| Student create/edit | LRN, full name, grade, section, enrollment status, and one guardian contact form. Current live UI makes LRN read-only on edit. | `POST/PATCH /students` -> `UpsertStudentRequest` -> `StudentController`. | Student row is created/updated; optional guardian action writes one primary pivot association and audit. Output supplies LRN/academic/status, with balance and guardian contacts capability-gated. |
| Student search/list | Name/LRN, grade, section, status, pagination. | `GET /students`. | Reads student/academic data; balance uses current-school-year account sum only for allowed roles. No clearance filter. |
| Account view/adjustment | Search/filter/list/detail and accounting/cashier adjustment UI. | `GET /billing-accounts*`; `POST /billing-accounts/{id}/adjustments`. | Account item/installment/payment/adjustment history is projected. Adjustment updates account totals and audit in transaction. No account-create route exists. |
| Fee item | Name, category, integer centavo amount, required and all-grade option. | Finance settings endpoints. | A new item is versioned and synchronized to every existing account using its schedule: the action writes a fee snapshot, one unpaid installment, and centavo total/balance increments. Revisions retain existing snapshots; an all-grade revision synchronizes only a schedule where the fee was absent. |
| Payment | Account, integer centavos, nonfuture date, required backdate/duplicate reasons when applicable, notes/channels, idempotency header. | `POST /payments` -> request -> controller/action. | Account/installment locks, allocation, balance/status update, receipt sequence/receipt, idempotency response, audit and notification rows/jobs are written transactionally. |
| Void/receipt | Void reason then Accounting decision/note; reprint action. | Void/reprint endpoints and actions. | One request/payment, status correction and allocation/balance restoration; receipt retained. Reprint metadata is retained. |
| Follow-up/notification | Eligible installments, email/SMS channels and retry. | Follow-up/notification/reminder endpoints. | Notification row stores copied recipient address/mobile, status/attempts/key/provider ID; delivery state depends on job/provider callback. |
| Staff/security | User details/role, archive/restore/reset actions. | Admin endpoints and `AuditLogger`. | User lifecycle fields and audit entries. Security/audit serializers permit only allowlisted response fields. |
| Import | Frontend only selects CSV/XLSX in MockDB flow and says live mode is unavailable. | No live import route. | `import_batches` is not written by a current live controller. |

## Reconciled findings

| ID | Classification | Evidence | Consequence / exact next action |
|---|---|---|---|
| DB-01 | Resolved documentation drift | Current migration and validation use unique `students.lrn`, not `student_no`. Surrogate ID and all FK relationships remain. | Corrected ERD, dictionary and reference DDL. Future data operations must preserve IDs and linked records. |
| DB-02 | Resolved implementation/older-document mismatch | `guardian_student.relationship` was added in the latest migration, backfilled without dropping `guardians.relationship`, and the Student model/API use pivot data. | Documented the legacy retained field and link-specific current field. Guardian ownership/lifecycle remains open. |
| DB-03 | Unresolved policy plus schema enforcement gap | `school_years.is_current` is indexed only. Dashboard now rejects any count other than one; account/student queries use an arbitrary first current year or sum every current year in some paths. Live school-year management routes are absent. | Define ownership/transitions and atomic exactly-one enforcement. Approve a data-preserving migration/API plan before implementation. |
| DB-04 | Resolved implementation defect; target-environment verification remains | `ApplyFeeItemToBillingAccountsAction` now locks eligible accounts, writes the new account-item snapshot and one unpaid installment, increments total due and balance, then invokes the existing status recalculation in the outer finance transaction. `FinanceSettingsController` returns the actual `updatedAccountCount`; revisions retain existing snapshots and synchronize only all-grade schedules where the fee was absent. `FinanceSettingsMutationTest` proves that a same-day fee changes a formerly paid account and its new installment to `due_soon` in isolated SQLite. | Validate transaction rollback and concurrent fee/payment behavior in an approved disposable matching-MySQL environment before release. The historical R02 new-account-only record is superseded by the November 5 decision and this implementation. |
| DB-05 | Unresolved policy / verification limit | Financial values are integer cents and receipt/idempotency uniqueness exists. Locking and workflow code are tested only in isolated SQLite evidence recorded in the ledger. | Use an approved disposable matching-MySQL environment for constraint and concurrent-payment/receipt/void proof. |
| DB-06 | Unresolved policy / integrity limit | Restrictive FKs preserve links, but DB DDL has no append-only or no-delete control for audit, payments, receipts, notification rows or account history. | Establish retention, database privileges/controls, correction/purge ownership and backup/restore procedure before release. |
| DB-07 | Approved target difference | Historical clearance tables remain, but active clearance and permit routes are absent and retirement is explicitly approved. | Preserve them; do not re-enable or destructively remove them without separate authorization. |
| DB-08 | Approved target difference | `import_batches` exists, but no import API/parser/apply workflow exists; live frontend is explicitly unavailable. | Keep as unimplemented. Any import work needs approved matching, validation, rollover and retention contract. |
| DB-09 | Implementation coverage limit | Live student form writes at most one primary guardian association and reuses the first guardian; it cannot create/manage multiple associations even though the schema permits them. | Resolve guardian-data owner/lifecycle before authorizing a broader guardian workflow. Not a justification to alter existing links. |
| DB-10 | Documentation/requirements conflict | Older requirements state retired clearance behavior, cash-only-only scope, and new-account-only fee changes while newer approved notices/decisions and current code differ. | Treat current explicit decision records as controlling where applicable; reconcile canonical requirements separately rather than encoding conflicts as schema facts. |

## Integrity assessment

### Evidenced by migrations and current code

- LRN is a string, unique in DDL, and API-validated as exactly twelve digits.
- Existing student primary keys are independent of LRN; billing/payment/receipt/notification history points to stable numeric student IDs.
- The student-guardian relation carries `relationship` and `is_primary` at the association level. Controller behavior clears other primary flags before selecting one primary link.
- Academic hierarchy has declared grade/section and school-year/term/exam FKs.
- Account items snapshot name/category/amount. Fees have active/version/previous-version fields; payments retain account/student/amount/balance-after/actor/time state.
- Payment action locks account/installments and singleton receipt sequence, allocates oldest due installment first, stores an idempotency response, then creates a receipt. Void path restores allocations/balance without deleting payment or receipt.
- Notifications persist delivery context separately from payment success. Close-out stores calculated system totals as JSON.
- Audit events retain actor/IP/agent/time and safe serializers filter response fields. Staff archive is a separate 30-day lifecycle, not a general retention rule.

### Not evidenced or not enforced at the database layer

- A unique/current school-year constraint or a safe transition mechanism.
- One-primary-guardian invariant, guardian ownership and contact lifecycle.
- Append-only/no-delete enforcement or settled retention/disposal for audit, financial, notification, security, import and backup records.
- Target-MySQL behavior for nullable unique clearance rows, transactions/locks, idempotency collisions, receipt numbering, and void/close-out races.
- Working backups/restores, scheduler/queue worker operation, provider delivery confirmation, or provider retention.
- Live account provisioning, full school-year/term/payment-plan/receipt/system-setting management, or live import application.

## Required correction proposals (not authorized)

1. **Fee synchronization verification gate.** Validate the approved implementation's transaction rollback and concurrent fee/payment behavior in a disposable matching-MySQL environment. Do not exercise a shared or production database.
2. **Current-school-year contract.** Define the management owner/routes, the zero/multiple-current response for every consumer, and a data-preserving exactly-one enforcement strategy. This cannot be solved safely by adding a blind unique index to existing data.
3. **Guardian lifecycle contract.** Define role ownership for creating/correcting/linking/retiring contacts, primary-contact rule, and legacy `guardians.relationship` treatment. Do not expand the current one-link form until this is approved.
4. **Operational integrity gate.** Before deployment, validate migrations/reference constraints and payment/receipt/void contention in a disposable target-compatible MySQL database; separately prove backup/restore and worker/scheduler/provider operations.

## Synchronization impact analysis

`Backend-Synchronization-Plan.md` is the current approval queue and dependency matrix. SYNC-GDN-01 corrected the new-guardian writer: the controller now stores the validated relationship in the required legacy column only when it creates a guardian, writes the link-specific pivot value, and wraps create/update, optional guardian/link mutation, and audit logging in one transaction. SYNC-FIN-01 now invokes the existing recalculation action after it adds the fee snapshot/installment and integer-centavo amounts, so same-day installments and affected accounts are immediately `due_soon` rather than stale. SYNC-LRN-01 now normalizes only fictional backend fixtures to twelve-digit strings and adds request-boundary coverage for nonnumeric, short, long, and leading-zero LRNs; it does not alter executable schema or installed records. SYNC-DOC-01 reconciles active canonical terminology to LRN/`lrn` while preserving dated decision wording as historical context. Isolated SQLite tests prove guardian persistence/rollback, the finance paid-account transition, and the LRN boundary. School-year, import, retention, and legacy-guardian work remain separate policy-gated items.

## Approval gate

**SYNC-GDN-01, SYNC-FIN-01, SYNC-LRN-01, and SYNC-DOC-01 are accepted; database documentation and the approved corrections are reconciled. The SYNC-MYSQL-01 preflight is accepted, but target validation remains environment-blocked. SYNC-GDN-02 and SYNC-LRN-02 are approved but data- and environment-blocked.** GDN-02 needs a read-only installed-data count of null/conflicting guardian-link relationship values before a nullable-legacy-column migration can be considered. LRN-02 needs aggregate non-twelve-character/non-digit counts and exact target-engine CHECK behavior before any LRN constraint can be considered. The November 13 preflight found no deployment/database-owner target matrix or owner-identified disposable MySQL instance; its required fail-closed procedure is in `Target-MySQL-Validation-Runbook.md`. The preflight acceptance does not establish MySQL schema, lock, concurrency, or backup/restore evidence. School-year management remains policy-blocked. No change should start from this document alone.
