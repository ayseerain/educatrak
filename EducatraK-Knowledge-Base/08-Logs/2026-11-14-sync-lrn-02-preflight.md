# SYNC-LRN-02 — Database Format-Hardening Preflight

**Recorded:** Saturday, November 14, 2026 — 00:07:34 +08:00  
**Branch / HEAD:** `feature/backend-foundation` / `124a78637e36ee91fd0b3a126813b5a394305ab6`  
**Owner authorization:** `approve SYNC-LRN-02`

## Approval and blocked state

SYNC-LRN-02 is approved, but implementation is data- and environment-blocked. The current executable schema already stores a unique twelve-character LRN string and request validation already requires exactly twelve digits. A database CHECK is a stricter target-engine concern, not a substitute for data reconciliation.

## Required preflight before implementation

An owner-authorized, read-only, aggregate-only query must report:

1. count of LRNs whose length is not twelve;
2. count of LRNs containing a nondigit; and
3. count of rows matching either condition.

It must not emit any LRN, student identifier, name, or relationship. An exception must remain unchanged until the owner supplies evidence-based matching and reconciliation authorization. No legacy identifier may be transformed into an LRN.

## Target-engine proof

The deployment/database owner must supply the exact MySQL-or-MariaDB family, version, collation, SQL mode, and disposable database boundary. The target must then prove CHECK enforcement, leading-zero acceptance, duplicate rejection, direct invalid-insert rejection, migration upgrade behavior, and recovery through a forward correction. SQLite evidence does not prove these conditions.

## Scope safety

No backend code, migration, data command, database connection, test, frontend source, provider, scheduler/worker, backup/restore, infrastructure, commit, push, or deployment operation ran. Existing student, guardian, academic, financial, receipt, and audit records were not accessed or modified.
