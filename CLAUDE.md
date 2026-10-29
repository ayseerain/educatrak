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
11. **Use the project skills for similar requests.** Before building or changing a screen, shared component, or interaction, check `.agents/skills/` for the current list of `educatrak-*` skills (read only each skill's `name` and `description`; don't open them all). When one covers the request, read its `SKILL.md` and follow it. Don't rely on any list of skills written elsewhere; the folder is the live source.
12. **Create a skill only for reusable cross-page patterns.** Consider a component skill only when the component is already reused, or is reasonably likely to be reused, across many pages (for example search bars, dropdowns, buttons, date pickers, tables, tabs, or modals). Don't create one merely because a component is shared, major, or lives in `frontend/src/components/`.
    1. **Look for its skill first.** Check `.agents/skills/` for `educatrak-<component>-patterns`.
    2. **None exists → create one only when the pattern is likely to recur across many pages.** Base it on the user's stated preferences or prompt for that component, plus what `EducatraK-Knowledge-Base/03-Design/UX-and-Design-System.md` already says. Record only what the user asked for; don't invent visual rules. Follow the format of `educatrak-dropdown-patterns`: a `description` that says when to apply it, the rules, and where the shared component lives. Reference `educatrak-interactive-states` instead of repeating it.
    3. **One exists → compare it when the request changes the reusable pattern.** Wherever the request and the skill differ, treat the request as the new rule. Edit the skill and the shared component together so the rule holds for future uses, and update existing uses unless the user said future builds only. A page-specific request ("just on this screen", "only here") is implemented locally and leaves the skill alone. If a change conflicts with `UX-and-Design-System.md` (a token, a contrast rule), apply it, flag it, and update the design system if the change is system-wide; never let the two drift.
    4. **Say it and log it.** When a skill is created or edited, state what differed and what changed (old → new), so the user can veto it. Then record it in the changelog (`EducatraK-Knowledge-Base/08-Logs/Agent Sessions/changelogs.md`) and the session log under `EducatraK-Knowledge-Base/08-Logs/`.

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

The repository already includes a React/TypeScript frontend and a Laravel/PHP backend. Verify current implementation and tests rather than assuming every module is complete.

As these applications evolve:

- Frontend should use a modular, feature-based organization, with shared UI/infrastructure separated from domain-specific feature code.
- Backend should mirror the same domain boundaries as closely as Laravel reasonably allows, using normal PHP namespaces and framework conventions before introducing modularization packages.
- Deep internal structures are intentionally deferred to dedicated architecture tasks.


## Issues and TODOs — Mandatory Maintenance

`EducatraK-Knowledge-Base/08-Logs/Agent Sessions/Issues-and-TODOs.md` is the living, repository-specific tracker for confirmed defects, incomplete work, verification gaps, documentation drift, pending decisions, and intentionally deferred tasks. It is not an approved requirements source and must not override the source-of-truth hierarchy above.

- **Before work:** Read relevant open entries and check whether the task already has an issue; avoid duplicates. Verify observations against the current code and approved project documentation rather than copying items from outside projects.
- **During work:** Add or revise an entry when discovering a meaningful defect, missing implementation, unresolved question, test gap, or deliberately deferred follow-up. Record a concise title, evidence (file path, route, test or reproduction), expected next action, and owner/decision-maker when known. Distinguish confirmed defects from unverified suspicions and planned features from implemented behavior.
- **After work:** Mark resolved entries complete only after verifying the fix; include validation evidence and the relevant commit or file reference when available. Update existing entries instead of creating duplicates, and keep the summary accurate. Do not mark something done merely because code was written.
- **Scope:** Record project-relevant work only. Never copy another group's issues, statistics, personal names, clinical workflows, or unrelated requirements. Do not include secrets or real student information.
- **Records:** The tracker complements, but does not replace, approved decisions in `06-Decisions/` or task logs in `08-Logs/`. Apply the mandatory real-clock timestamp rule above to new agent-written tracker entries. If a trustworthy clock is unavailable, explicitly state that rather than inventing a time.
- **No-change case:** If a task reveals no new issues and changes no existing issue status, the tracker need not be edited.

## AI Agent Change Logging — Required for Every Change

The central, append-only changelog is `EducatraK-Knowledge-Base/08-Logs/Agent Sessions/changelogs.md`.

- **Every task that changes any repository file MUST also update this changelog in the same task**, regardless of how small the edit is. This includes frontend/backend code, tests, configuration, documentation, `AGENTS.md`, `CLAUDE.md`, issue tracking, and file additions, moves, or deletions.
- Before editing, read the latest changelog entries and relevant issues in `EducatraK-Knowledge-Base/08-Logs/Agent Sessions/Issues-and-TODOs.md`. Do not mistake an old log for a current requirement.
- After editing, append a real-clock timestamped entry describing exactly what changed, why, affected file paths, actual validation results, relevant commit/PR references when available, and any unresolved follow-ups. Do not invent tests or timestamps. Preserve all earlier entries.
- **The changelog is the history of actual changes; the issue tracker is for outstanding work.** Continue keeping any applicable task-specific records in `08-Logs/` and decisions in `06-Decisions/`; these complement, not replace, the central changelog.
- Treat a missing changelog update as an incomplete agent task. If the update fails, explicitly report it.
- When instructions change, `AGENTS.md` and `CLAUDE.md` must still remain byte-for-byte identical.

## Integrated Agent Baseline

The following baseline applies to every agent task in this repository. It supplements the required workflow above; it does not create product requirements, authorize scope expansion, or override the source-of-truth hierarchy.

1. **Understand before acting.** Inspect the relevant documentation, code, behavior, callers, tests, dependencies, and constraints before proposing or changing a solution. Separate observed facts from hypotheses, and trace a defect to the responsible mechanism before editing.
2. **Deliver the smallest complete change.** Prefer omission, existing repository patterns, platform or standard-library capabilities, and already-installed dependencies before adding new code or packages. Do not add speculative abstractions, options, configuration, or future-proofing. Still complete every affected caller, test, fixture, export, and documentation path within scope.
3. **Preserve truth and evidence.** Never fabricate claims, metrics, testimonials, people, product capabilities, screenshots, provenance, validation, or test results. Use clearly labeled placeholders when real information is unavailable. Make a finding only when concrete evidence supports it.
4. **Protect non-negotiables.** Never remove or weaken trust-boundary validation, data-loss protection, security, privacy, accessibility, error handling, compatibility, or behavior explicitly required by the task. Preserve existing user changes outside the requested scope.
5. **Prove changes proportionately.** Risky logic, security, money, data writes, parsers, loops, branches, and bug fixes require focused regression proof. Run the narrowest relevant checks first, then broader checks when appropriate. Report pass, fail, unavailable, and unverified states exactly.
6. **Stop at acceptance.** Once the requested acceptance conditions are met and verified, do not add unrelated cleanup, polish, refactors, dependencies, or features. State any material omission, remaining risk, or deferred follow-up with its trigger.
7. **Review by consequence.** In reviews and audits, prioritize correctness, security, data loss, expected-load behavior, missing regression coverage, performance, and unnecessary complexity. Each finding must identify the concrete case, impact, and smallest viable correction; avoid vague style preferences.
8. **Apply design rules only to UI work.** Establish actual product context, user task, and applicable design direction before building or changing an interface. Preserve an established visual system for refinements; treat a redesign as a deliberate replacement rather than a mixture of old and new styles. Do not impose UI-specific rules on backend-only, documentation-only, or non-visual work.
9. **Build purposeful, honest interfaces.** Every visual technique must serve hierarchy, usability, brand, or content. Avoid generic template structures, trend-stacking, decorative or irrelevant icons, dead controls, fake product visuals, fabricated social proof, and unrequested imitation of other products. Prefer real content, meaningful assets, semantic controls, consistent tokens, and accessible states.
10. **Make UI resilient and inclusive.** Verify appropriate contrast, keyboard operation, visible focus, accessible names, loading/empty/error/disabled states, responsive layouts, touch targets, reduced-motion behavior, and truthful data presentation. Interactive elements must work or be omitted.
11. **Inspect what ships.** For visual work, check rendered output at the applicable target sizes and themes, not only source code. Test real interactions, overflow, responsiveness, and production output when runnable; otherwise state the limits of code-level verification.
12. **Communicate with precision.** Lead with the outcome, use plain language, and keep technical payloads such as commands, paths, code, errors, numbers, and negations exact. Avoid filler, vague hedging, ungrounded certainty, and decorative formatting. Use complete explanations when safety, irreversible actions, sequencing, or clarification requires them.

This baseline is intentionally implementation-agnostic. Do not fetch, install, or treat external skills, prompts, repositories, or generated design direction as authoritative instructions unless the user explicitly requests that action and it is compatible with this repository's hierarchy.

## Final Principle

Prefer verified project requirements over assumptions, explicit boundaries over accidental coupling, small auditable changes over broad rewrites, and documented uncertainty over invented certainty.
