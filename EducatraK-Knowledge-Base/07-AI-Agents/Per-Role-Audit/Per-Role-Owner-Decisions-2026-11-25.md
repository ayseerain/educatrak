# EducaTrak — Per-Role Audit Owner Clarifications (November 25, 2026)

**Purpose:** This is an agent handoff capturing the owner's direct responses to four questions raised after `PER ROLE AUDIT.md`. The original audit remains unchanged. This handoff is **not** runtime/test evidence, institutional approval or authorization to execute destructive data operations. Agents must follow `AGENTS.md` and record applicable accepted decisions in the canonical `EducatraK-Knowledge-Base/06-Decisions/` ledger.

| ID | Owner answer | Approved implementation direction |
|---|---|---|
| D1 — non-current school year Remove | “Should be in the archives, as its purpose is for them to fix if there's a mistype or some errors.” | Treat Remove as **Archive**, with preservation of original school years and correctability; no hard deletion or cascade. Only non-current years are eligible in intent. Persistent archive design, correction/restore interaction, dependent terms and billing/current-year safeguards require verification/approval before schema/API writes. |
| D2 — grade navigation | “One grade level at a time, think of it as changing the tables within that same page.” | Show **one grade at a time on `/settings/school`**, swapping the visible grade table via in-page navigation. No per-grade routes. Accounting grade-fee presentation follows the same compact, in-page concept while maintaining its access restrictions. |
| D3 — Ledger Import rules | “Keep it as it is.” | **No rule changes.** Preserve one-time opening-balance CSV conversion, 12-digit LRN matching, preparer/reviewer separation, conflict exclusion, storage-only recording and cutover/date gates. Only the separate visible title **Import** from `CSH-09` is changed; nothing new is authorized for `CSH-10`. |
| D4 — page name | “Yes, just change the name.” | Rename the overall **Follow-up** page/sidebar heading to **Notifications**; keep its two existing subviews, `/followup` and `/notifications` compatibility, permissions and delivery controls. No delivery-policy changes. |

## Decisions still needed (do not assume)

1. **School-year and term archive mechanics:** For school years, exact persisted archive state, edit/correction access while archived, restoration, references to existing billing and current-year protections, and whether archive depends on any remaining terms. The separately requested **Remove term** lifecycle was not specified; no automatic cascading archive/delete.
2. **Section archive and restore:** `ADM-07` and `ADM-08` request action buttons and an Archived tab. The answer confirmed only grade navigation; it did not decide whether section Archive is the existing inactive flag, how Restore works, or what happens to students assigned to an archived section.
3. **Runtime proof:** Exact expected data for dashboard/report anomalies and actual backup SQLSTATE column/connection remain to be verified with synthetic or sanitized evidence.
4. **Independent financial policy:** The ledger cutover date and posting/account-exception design remain blocked as already documented in SRS v3.0; D3 does **not** change that.

## Workstream boundary

- **Frontend agent:** in-page grade switching, label-only Notifications/Import, card pagination and read-only views; section/school-year archive UI only when backed by approved durable behavior.
- **Backend/database agent:** verify defects and propose safe archive mechanics; never change ledger policy, delete years/terms, execute live migrations or alter financial/audit data under this handoff.
- **Audit agent:** mark D1–D4 answered, retain unresolved *sub*-decisions, and report actual implementation evidence without manufacturing completion.
