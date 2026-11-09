# Student Academic Selectors

**Timestamp:** Thursday, October 22, 2026 — 18:41:21 +08:00

## Changed

- Replaced the student form's limited grade selector with Kinder through Grade 12 for both Add Student and Edit Student.
- Replaced the free-text section field with a grade-dependent dropdown. The prototype retains its existing sample section names and uses provisional sample values where the configured school sections are not yet available from the API.
- Added a Grade 11/12-only strand dropdown limited to STEM, ABM, HUMSS, and TVL, with a placement preview such as `Grade 12 - STEM Exodus`.
- Reset the section and strand selection whenever the grade changes so the form cannot retain an incompatible academic placement.
- Added a regression test for the complete grade list, dependent section choices, Senior High strand limits, and leaving Senior High.

## Validation

- `frontend: npm test -- --run` passed: 74 tests.
- `frontend: npm run build` passed.

## Follow-up

- The production API must remain the source of truth for grade levels and sections; replace the form's provisional mock section data when the academic-list endpoint is connected.
