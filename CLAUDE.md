# EducatraK — AI Agent Instructions

> **Synchronization requirement:** `AGENTS.md` and `CLAUDE.md` MUST always be edited together and MUST remain word-for-word identical. If you change either file, make the exact same change to the other file in the same task. Never replace either file with a pointer to the other.

## Purpose

This file is the root entry point for any AI coding agent working in the EducatraK monorepo. It defines the minimum workflow, document precedence, repository boundaries, and record-keeping rules that apply to every task.

EducatraK is a web-based student billing and payment-monitoring system for Mendez Christian Academy. The application is intended for the school's local network/intranet. The repository is organized as a monorepo with `frontend/`, `backend/`, and the canonical project knowledge base at `EducatraK-Knowledge-Base/`.

## Repository Boundaries

- `frontend/` — React/TypeScript frontend application. Keep frontend work here unless a root-level change is genuinely required.
- `backend/` — Laravel/PHP backend application. Keep backend work here unless a root-level change is genuinely required.
- `EducatraK-Knowledge-Base/` — canonical documentation and project knowledge. Use the exact folder name and category paths; do not rename or replace it with `docs/`, `wiki/`, or another generic folder.
- Root files — repository-wide instructions, metadata, and configuration only.

Do not invent new product modules, roles, business rules, payment methods, screens, integrations, or automation. If a requirement is missing or genuinely ambiguous, record the unresolved point rather than silently inventing behavior.

## Required Workflow

### Before Starting a Task

1. Read this file completely. Confirm that `CLAUDE.md` is identical before making instruction changes.
2. Read the task request and identify which repository area it affects: root, `frontend/`, `backend/`, knowledge base, or more than one area.
3. Consult the source-of-truth hierarchy below. Read only the knowledge-base categories and implementation files relevant to the task, but do not skip a higher-priority source that governs the requested behavior.
4. Inspect the existing implementation before editing. Reuse established patterns and avoid duplicating functionality that already exists.
5. For frontend tasks, check `EducatraK-Knowledge-Base/07-AI-Agents/Frontend-Build-and-Audit-Manual.md` and any active loop-engineering ledger before building, rebuilding, or auditing screens. Verify existing Build/Audit checkboxes and Resume Notes so already-built work is reused or continued rather than duplicated.
6. Check `EducatraK-Knowledge-Base/06-Decisions/` for relevant decisions and `EducatraK-Knowledge-Base/08-Logs/` for recent context when those folders contain applicable records.
7. Identify unresolved conflicts or missing requirements before coding. Follow the hierarchy below rather than choosing whichever document is most convenient.
8. Keep the task scoped. Do not perform unrelated refactors, dependency upgrades, formatting sweeps, or architecture changes unless the task requires them.

### During the Task

1. Follow existing repository conventions and the applicable specifications in `EducatraK-Knowledge-Base/`.
2. Keep the frontend and backend modular and feature-oriented. Shared infrastructure may be centralized, but domain-specific code should stay with its feature/module.
3. Preserve clear frontend/backend boundaries. The backend is authoritative for security and business-rule enforcement; frontend permission checks are UX controls, not a security boundary.
4. Never use real student, guardian, staff, credential, or financial data in source code, fixtures, tests, screenshots, or documentation. Use obviously fictional data.
5. Never commit secrets. Use environment variables and example configuration files when configuration is eventually introduced.
6. Do not hard-code configurable school policy when the specification treats it as data or settings.
7. Add or update tests appropriate to the behavior being changed once test infrastructure exists.
8. Prefer the smallest change that fully satisfies the task. Do not add external libraries merely to enforce a folder convention that the language/framework can express natively.
9. When an implementation choice is not determined by a higher-priority source and materially affects future work, document the decision in `EducatraK-Knowledge-Base/06-Decisions/` once that decision-log format has been established.
10. Any log entry written by an agent MUST follow the timestamp rule below.

### After Finishing a Task

1. Review the diff for accidental, unrelated, generated, secret, or personal-data changes.
2. Run the narrowest relevant validation first, then the broader applicable test/build/lint commands that exist in the repository. Never claim a command passed unless it was actually run successfully.
3. Confirm the implementation still follows the applicable requirements, permissions, privacy constraints, and architecture decisions.
4. Update affected documentation when behavior, interfaces, architecture, setup steps, or decisions changed.
5. Add/update the appropriate record under `EducatraK-Knowledge-Base/08-Logs/` once the project log format exists. Record what changed, why, validation performed, and any unresolved follow-up.
6. If the task changes these agent instructions, update both `AGENTS.md` and `CLAUDE.md` identically and verify they match byte-for-byte.
7. Report unresolved questions or failed validations explicitly. Never hide them behind a completion claim.

## Source-of-Truth Hierarchy

When two sources disagree, the higher item in this list overrides the lower item. Do not silently merge contradictory requirements.

1. **Explicit current user/task instruction** — the concrete request being implemented, unless it would violate a non-negotiable project/security constraint.
2. **Approved project core and requirements** — applicable material in `EducatraK-Knowledge-Base/00-Project-Core/` and `EducatraK-Knowledge-Base/01-Requirements/`.
3. **Approved architecture and recorded decisions** — `EducatraK-Knowledge-Base/02-Architecture/` and accepted records in `EducatraK-Knowledge-Base/06-Decisions/`.
4. **Approved design specifications** — `EducatraK-Knowledge-Base/03-Design/`.
5. **Development and testing guidance** — `EducatraK-Knowledge-Base/04-Development/` and `EducatraK-Knowledge-Base/05-Testing/`.
6. **Repository-level agent instructions** — this `AGENTS.md` / `CLAUDE.md` pair for workflow and cross-repository conventions.
7. **Existing implementation and tests** — useful evidence of current behavior, but they do not override an explicit higher-priority requirement. A mismatch may mean the implementation is stale or incorrect.
8. **Logs and references** — `EducatraK-Knowledge-Base/08-Logs/` and `EducatraK-Knowledge-Base/09-References/` provide context/evidence but do not create requirements by themselves.
9. **General framework conventions or agent assumptions** — use only when all project-specific sources are silent.

`EducatraK-Knowledge-Base/07-AI-Agents/` may contain task- or tool-specific agent guidance. Such guidance supplements this file but does not override higher-priority project requirements unless it explicitly records an approved project decision at the appropriate hierarchy level.

If two sources at the same priority level conflict and no approved decision resolves them, stop that portion of the implementation, document the conflict, and request clarification rather than guessing.

## Timestamp Rule — Mandatory

Every log entry written by an AI agent must include a **real timestamp obtained from the agent's own system clock at the moment the entry is written**.

Required human-readable form:

`Day, Month DD, YYYY — HH:MM:SS TZ`

Example format only (never copy this value as a real timestamp):

`Monday, January 01, 2030 — 14:05:09 Asia/Manila`

Rules:

- Read the system clock immediately before writing the log entry.
- Include the real day of week, calendar date, local time including seconds, and timezone or UTC offset.
- Never estimate, infer, round, reuse, backfill, or guess a timestamp.
- Never use the task start time as the completion time unless the system clock actually shows that value when the entry is written.
- If the environment cannot provide a trustworthy current clock, state that the timestamp could not be verified and do not fabricate one.
- When multiple entries are written at different times, obtain a fresh timestamp for each entry.

## Knowledge-Base Category Contract

The following immediate category paths are intentionally stable:

- `EducatraK-Knowledge-Base/00-Project-Core/`
- `EducatraK-Knowledge-Base/01-Requirements/`
- `EducatraK-Knowledge-Base/02-Architecture/`
- `EducatraK-Knowledge-Base/03-Design/`
- `EducatraK-Knowledge-Base/04-Development/`
- `EducatraK-Knowledge-Base/05-Testing/`
- `EducatraK-Knowledge-Base/06-Decisions/`
- `EducatraK-Knowledge-Base/07-AI-Agents/`
- `EducatraK-Knowledge-Base/08-Logs/`
- `EducatraK-Knowledge-Base/09-References/`

Do not renumber existing categories simply to insert a new one. Existing paths are treated as durable references. If a future top-level category is genuinely necessary, prefer the next available numeric prefix or an explicitly approved insertion strategy documented in `06-Decisions/`; do not perform a repository-wide renumber casually.

## Current Structural Direction

The repository is intentionally at the initial setup stage. Do not assume that `frontend/` or `backend/` has already been scaffolded merely because the directories exist.

When those applications are scaffolded later:

- Frontend should use a modular, feature-based organization, with shared UI/infrastructure separated from domain-specific feature code.
- Backend should mirror the same domain boundaries as closely as Laravel reasonably allows, using normal PHP namespaces and framework conventions before introducing modularization packages.
- Deep internal structures are intentionally deferred to dedicated architecture tasks.

## Final Principle

Prefer verified project requirements over assumptions, explicit boundaries over accidental coupling, small auditable changes over broad rewrites, and documented uncertainty over invented certainty.
