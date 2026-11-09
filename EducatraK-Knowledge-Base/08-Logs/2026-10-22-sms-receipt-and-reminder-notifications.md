# SMS Receipt and Reminder Notifications

**Timestamp:** Thursday, October 22, 2026 — 20:39:00 +08:00

- Added optional SMS alongside email for receipt notifications and overdue-reminder batches. Both confirmation flows disclose the selected channels before sending.
- Added SMS delivery and load-fee context to the notification log and notification settings view.
- Added backend notification-channel validation and storage for recipient mobile number, channel, and optional SMS load fee. The server reads `SMS_LOAD_FEE_CENTS`; when it is configured, the fee is recorded with the SMS notification and never added to a student's billing balance.
- Recorded the unapproved SMS carrier, consent, fee, and fee-payer questions in `06-Decisions/Open-Decisions.md` rather than inventing a price or charging policy.

## Validation

- Passed: focused frontend operations suite (41 tests).
- Passed: frontend production build.
- Passed: PHP syntax checks for changed backend files.
- Passed: `git diff --check`.
- Blocked: backend PHPUnit and Pint require the unavailable PHP `mbstring` extension. A subsequent full frontend-suite attempt also encountered a local Node memory failure; the focused suite and build above completed successfully.
