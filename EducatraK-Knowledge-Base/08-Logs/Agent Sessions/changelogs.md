# EducatraK — AI Agent Changelogs

> **Purpose:** Central, append-only record of **every repository change made by an AI agent**, including code, UI, backend, tests, configuration, documentation, instructions, and file moves. Stored under `EducatraK-Knowledge-Base/08-Logs/Agent Sessions/`.

## Mandatory rules

1. **Every AI-agent change must be recorded here in the same task** as the change. Do not wait for a separate request. This includes minor changes, issue-tracker updates, and changes to this changelog itself. If the agent cannot update this file, it must report the omission clearly rather than claim the change was fully logged.
2. **Append, do not overwrite or silently rewrite history.** Put the newest entry first under `## Entries`. Preserve older entries. Use a real clock timestamp at the time the entry is written, in the format required by `AGENTS.md`.
3. For each entry include: timestamp; agent or tool identity when known; short summary; **actual** files added, changed, moved or removed; reason; validation performed and its actual result (or `not run`); relevant commit/PR if available; outstanding follow-ups.
4. Distinguish changes actually committed from proposed work. Never fabricate test results, timestamps, commits, or authors. If a commit hash is unavailable at entry time, note `pending/not available` and update later when known.
5. Use `Issues-and-TODOs.md` in this directory for **open problems and follow-ups**. Use this file for **what actually changed**. Existing chronological records in `../` remain valid and are not replaced.
6. When modifying `AGENTS.md` or `CLAUDE.md`, keep their contents identical.

## Entry template

```md
### Day, Month DD, YYYY — HH:MM:SS TZ | Short change title
- **Agent:** Agent/tool name (if known)
- **Summary:** What actually changed and why
- **Files:** Added/modified/moved/deleted paths
- **Validation:** Exact checks and results, or "Not run (documentation-only)"
- **Commit/PR:** Link or hash, or "Not available at time of entry"
- **Follow-ups:** None, or specific remaining work
```

## Entries

### Saturday, October 24, 2026 — 14:06:20 Asia/Manila | Centralize agent issue tracking and changelogs
- **Agent:** ChatGPT (GitHub connector)
- **Summary:** Created the `Agent Sessions` documentation directory; moved the existing EducatraK-specific issues tracker from repository root into it; introduced this centralized AI-agent changelog; updated repository agent instructions and their synchronized copy to require logging every AI-made change and to use the new tracker location.
- **Files:** Added `EducatraK-Knowledge-Base/08-Logs/Agent Sessions/Issues-and-TODOs.md` and `EducatraK-Knowledge-Base/08-Logs/Agent Sessions/changelogs.md`; updated `AGENTS.md` and `CLAUDE.md`; removed root `Issues-and-TODOs.md`.
- **Validation:** Repository file presence and instruction-file equality to be checked after writes; no application tests run (documentation-only changes).
- **Commit/PR:** Multiple direct commits on the default branch; individual hashes available in GitHub history.
- **Follow-ups:** Future AI agents must maintain this file for every change and maintain the issues tracker for newly discovered or resolved work.
