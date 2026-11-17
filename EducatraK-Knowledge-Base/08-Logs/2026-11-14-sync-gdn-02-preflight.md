# SYNC-GDN-02 — Guardian Legacy-Column Retirement Preflight

**Recorded:** Saturday, November 14, 2026 — 00:04:22 +08:00  
**Branch / HEAD:** `feature/backend-foundation` / `124a78637e36ee91fd0b3a126813b5a394305ab6`  
**Owner authorization:** `approve SYNC-GDN-02 first`

## Approval and blocked state

The owner approved SYNC-GDN-02 as the first next workstream. Execution is blocked pending the data and target-environment gates required by the approved synchronization plan.

Static inspection confirmed:

- the existing additive migration made `guardian_student.relationship` nullable and copied each legacy guardian-wide relationship into the associated links;
- `guardians.relationship` is still required by the original migration;
- SYNC-GDN-01 writes a new guardian's validated link relationship to both fields, then preserves the legacy value on later link updates; and
- neither a project database configuration nor an approved matching-MySQL disposable instance is available for the required preflight.

## Required preflight before implementation

An owner-authorized, read-only, aggregate-only query must count:

1. links where `guardian_student.relationship` is null;
2. links where both relationship values are non-null and different; and
3. links where both values are null.

The result must be reviewed by the data-policy owner. No identifier, contact, LRN, or relationship value may be emitted in logs. A null legacy-plus-pivot pair is ambiguous and must not be backfilled. No guardian identity may be merged, no primary contact selected, and no historical value deleted.

## Scope safety

No backend code, migration, backfill command, database connection, test, frontend source, provider, scheduler/worker, backup/restore, infrastructure, commit, push, or deployment operation ran. Existing student, guardian, academic, financial, receipt, and audit records were not accessed or modified.

## Next gate

The deployment/database owner must provide an approved isolated read-only preflight environment plus the matching-MySQL matrix. The data-policy owner must review the aggregate result. Only then may the owner separately authorize the forward-only nullable legacy-column migration and any bounded, deterministic backfill.
