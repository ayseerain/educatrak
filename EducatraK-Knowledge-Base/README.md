# EducatraK Knowledge Base

This directory is the canonical project knowledge base for EducatraK. File and folder names are purpose-based EducatraK names; uploaded reference filenames and wrapper names are not used as the knowledge-base taxonomy.

## Source hierarchy inside this knowledge base

1. `00-Project-Core/Project-Specification.md` — complete canonical unified specification.
2. `01-Requirements/` through `05-Testing/` — focused, source-derived views extracted from the canonical specification for navigation and implementation.
3. `06-Decisions/` — reconciled and unresolved decisions from the canonical specification.
4. `07-AI-Agents/` — execution manuals for coding agents.
5. `08-Logs/` — work logs created during development.
6. `09-References/` — implementation/reference evidence. Reference material does not override the canonical specification.

## Duplication rule

Focused documents intentionally reproduce relevant sections of the canonical specification for easier navigation. They are derived views, not independent sources of truth. When requirements change, update the canonical specification first and regenerate/reconcile affected focused views.

## Reference-code rule

`09-References/Frontend-Prototype/` preserves the earlier authored frontend prototype as implementation evidence. Its code, README, and decisions must not be treated as current requirements when they differ from the canonical specification.
