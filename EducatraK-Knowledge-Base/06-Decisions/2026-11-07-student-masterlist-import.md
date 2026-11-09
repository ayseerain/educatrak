# Student masterlist import

- **Date:** November 7, 2026
- **Status:** Approved by the project owner in the current task

## Decision

Implement a Registrar-only student masterlist import in the frontend MockDB. Use `/students/import`, guarded by the existing `student.edit` capability. Do not change backend files. Keep the older `/import` ledger-import placeholder separate.

Accept CSV and XLSX files. The import represents the complete current-enrollment masterlist and matches existing students by LRN. Student Number replacement with LRN is a separate task; parsing and applying imports must wait until that task updates MockDB.

For new students, require LRN, name, grade, section, and guardian name, relationship, email, and mobile. Date of birth, gender, residential address, and enrollment status may be absent. Imported students are Active. If an LRN matches an Inactive student, set that student to Active. For updates, nonblank incoming values replace approved fields; blank values preserve existing data.

Block rows with invalid data and show a warning for each blocked row. Valid rows may continue through review and apply.

Show students absent from the complete masterlist for review. Keep all status-change selections unchecked by default. The Registrar may select a currently Active missing student for Inactive status, even when that student has an outstanding balance. A final confirmation is required; a reason is optional. Unselected students remain unchanged. Never delete students or modify financial records or relationships.

## Phase boundary

Phase 1 implements the interface and file selection only. It does not parse file contents or change MockDB. Each later phase requires separate approval. Student Number-to-LRN replacement remains outside this decision and task.

### 2026-11-09 owner confirmation

Project owner confirmed at Monday, November 09, 2026 — 12:40:29 Asia/Manila that Student Number-to-LRN change is approved for a separately authorized future change. It is not implemented in `feature/backend-foundation` by Part 1b. This does not settle LRN field semantics, uniqueness, legacy backfill, import API contract, or authorize schema/code work. See `2026-11-09-backend-part-1b-owner-decisions.md`.