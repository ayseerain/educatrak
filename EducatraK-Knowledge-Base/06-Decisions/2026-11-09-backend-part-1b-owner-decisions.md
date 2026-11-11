# 2026-11-09-backend-part-1b-owner-decisions

Recorded Monday, November 09, 2026 — 12:40:29 Asia/Manila.
**Owner attribution:** Project owner. **Source:** direct confirmations in this Part 1b session. These decisions describe documentation/current policy; they authorize no code, schema, migration, or deployment work.

## Confirmed for this phase

| Topic | Owner answer | Effect |
|---|---|---|
| Branch | `feature/backend-foundation`; refresh to current `main` and audit the result. | Current Part 1b baseline is `b4ee0e3f535e07810d87a3106268e3965029f7a4`. The Part 1 record at `ae6fcee9d9edc6f592ce4e18611f995c0f00e458` remains historical. |
| Session | 30 minutes idle; activity renews; warn at 1 minute. | Owner policy. Backend config currently defaults to 120 minutes; implementation alignment is separate work. |
| API errors | Keep current Laravel `{message}` and validation `{message,errors}`. | Any envelope change requires separate approval. |
| Audit and retention | Keep required evidence and minimize sensitive snapshots; retention remains undecided. | No retention duration or purge semantics approved. Staff archive's separate 30-day lifecycle is not generalized. |
| Deployment | PHP/Composer/MySQL versions, DB topology, TLS and scheduler owner remain unverified. | Record as deployment follow-up; no infrastructure action authorized. |
| Student Number to LRN | Approved for a separately authorized future change. | Not implemented on this branch and not authorized by Part 1b. Import contract, LRN semantics, uniqueness and migration/backfill remain separate design work. |

These answers confirm the owner's fresh choices at the timestamp above; they do not backdate earlier chat responses. The recommendation to retain the existing API error shape supersedes any optional-envelope proposal only for the present contract. Session policy records an intended policy, not verified deployed behavior.

## Recommendations, not decisions

The owner explicitly left these five MCA policy matters open. The following are proposals only:

1. Guardian-data ownership and maintenance lifecycle: keep unresolved; do not expand access or infer an owner. “Ownership” means which school role is accountable for creating, correcting, linking, and retiring guardian contact records.
2. Adjustment approval threshold: current route behavior requires a reason and audit evidence; threshold/second approval remains open.
3. Super Admin lifecycle: retain the current protected bootstrap behavior as implementation evidence; recovery, multiple accounts, peer promotion, and Accounting assignment remain open.
4. Dashboard without current school year: proposal is show no configured year and avoid silently substituting today's date; policy remains open.
5. Global no-hard-delete client sign-off: preserve financial/audit history as an active constraint; broad client sign-off and other record lifecycle remain open.

No database design approval was given. B7 is not approved. B4 is blocked because only `Database-Review.md` exists; `ERD.md`, `Data-Dictionary.md`, `Reference-Schema.sql`, diagrams and checks are absent. No compatible scratch-database gate was run.

## Checklist

| Decision area | Status | Evidence |
|---|---|---|
| Branch and baseline | Confirmed | Git state and Part 1b run |
| Session policy | Confirmed; code alignment not done | `Backend-Readiness.md`, `backend/config/session.php` |
| Error envelope | Confirmed current shape | `Backend-API-Contract.md` |
| Audit snapshot minimization | Confirmed as policy; field allowlist not supplied | `AuditLogger.php`, `Database-Review.md` |
| Audit/security/backup/notification/financial retention | Open | `Open-Decisions.md` and this record |
| Deployment facts | Unverified | `Backend-Readiness.md` |
| Student Number to LRN future change | Approved for separate future scope only | `2026-11-07-student-masterlist-import.md` dated note required |
| Guardian data, adjustment threshold, Super Admin lifecycle, no-current-year behavior, global delete sign-off | Open; proposals only | `Open-Decisions.md` |
| Database design / B7 | Not approved; gates not met | Missing artifacts and no scratch DB evidence |

## Retention-source conflict

The owner confirmed backend audit/security/backup/notification/financial retention remains undecided. Existing Privacy Policy copy in `frontend/src/i18n/en.ts:87` states ten years for audit logs and five years for other personal information, including student, guardian, staff-account, billing, payment, notification, import, and backup-related records. Part 1b did not edit that frontend promise or canonical requirements. Treat the difference as an open policy/source-reconciliation item; do not implement retention or purge based only on this backend note.
## Follow-up status

### Part 2 implementation status

On Tuesday, November 10, 2026 — 18:03:12 Asia/Manila, the approved 30-minute
idle session setting was aligned in Laravel's default and local/example/test
configuration. Activity renewal and cookie/remember-me behavior remain as
implemented. This records implementation status, not a new session policy.

On Tuesday, November 10, 2026 — 14:50:29 Asia/Manila, the Project owner
confirmed that guardian relationship describes each student–guardian link.
This settles semantic scope only. Current SQL stores `relationship` on
`guardians`; schema/API reconciliation needs separate authorization.
Guardian-data ownership, maintenance lifecycle, and primary-contact rules
remain open.

The owner directed completion of Part 1b prerequisites. Descriptive migration-based drafts now exist at `02-Architecture/Backend-Database-Design/ERD.md`, `Data-Dictionary.md`, and `Reference-Schema.sql`. This direction does not alter the five previously open MCA policy decisions, approve future schema design, satisfy MySQL validation gates, or authorize Part 2 code changes. B7 remains skipped.
