# Cashier UI Refactor Changelog

## Audit Summary

| Original page/component | Revised page/component | File paths modified | Reason for change | Functionality preserved | Routes affected | Tests performed |
|---|---|---|---|---|---|---|
| Dashboard, Payments, and Student Profile payment entry surfaces | Shared `PaymentWorkflow` used by `/payments/new` and Student Profile Payments tab; Dashboard action routes to `/payments/new` | `frontend/src/features/dashboard/DashboardPage.tsx`, `frontend/src/features/dashboard/components/RecordPaymentDialog.tsx`, `frontend/src/features/operations/OperationalPages.tsx`, `frontend/src/test/dashboard.test.tsx`, `frontend/src/test/operations.test.tsx` | Remove duplicated payment form logic and keep Cashier payment entry consistent | Student search, preselected student context, balance/next-due summary, cash method, validation, confirmation, receipt preview, Done reset, duplicate-save guard | `/`, `/payments/new`, `/payments/new?student=:id`, `/students/:id` | `npx tsc -b --pretty false`, focused Vitest, full `npm test`, and `npm run build` passed |
| Student Profile action tabs (`Follow-up`, `Record payment`, `Statement of account`) | Student Profile sections: Overview, Billing, Payments, Follow-up | `frontend/src/features/operations/OperationalPages.tsx`, `frontend/src/test/operations.test.tsx` | Organize student data by responsibility instead of action-only tabs | Student overview, guardian context, billing summary, statement access, payment history/action, follow-up context | `/students/:id` | `npx tsc -b --pretty false`, focused Vitest, full `npm test`, and `npm run build` passed |
| Separate statement table in profile and report statement page | Shared `StudentStatementTable` | `frontend/src/features/operations/OperationalPages.tsx` | Avoid duplicated statement presentation rows | Fees, due dates, payments, balance row, print/export actions from report page | `/students/:id`, `/reports/student/:id` | `npx tsc -b --pretty false`, focused Vitest, full `npm test`, and `npm run build` passed |
| Sidebar top-level Follow-up and separate Notification Log destination | Consolidated Reminders & Notifications sidebar/page tabs | `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/features/operations/OperationalPages.tsx`, `frontend/src/i18n/en.ts` | Group related operational activities while preserving distinct workflows | Due follow-up selection/send action, Notification Log statuses Queued/Sent/Failed, failed retry visibility | `/followup`, `/notifications` | `npx tsc -b --pretty false`, focused Vitest, full `npm test`, and `npm run build` passed |
| Close-out and Close-out History as separate visible areas | Daily Close-out with Today's Close-out and History tabs | `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/features/operations/OperationalPages.tsx` | Keep close-out operations and history together without changing authorization | Counted cash, variance reason, review action, history lookup, sign-off visibility | `/closeout`, `/closeout/history` | `npx tsc -b --pretty false`, focused Vitest, full `npm test`, and `npm run build` passed |
| Non-cash payment method text in current working copy | Cash-only payment method restored | `frontend/src/features/operations/OperationalPages.tsx`, `frontend/src/i18n/en.ts` | Approved scope says transactions are recorded as cash only | Cash payment flow and receipt display | `/payments`, `/payments/new`, `/settings/school` | `npx tsc -b --pretty false`, focused Vitest, full `npm test`, and `npm run build` passed |

## Navigation Before vs. After

Before: Dashboard; Students; Accounts; Payments; Follow-up; Clearance; Reports; Void approvals; Close-out; Close-out history; Import; Notifications; role-specific admin/settings entries.

After for Cashier-facing operations: Dashboard; Students; Billing Accounts; Payments; Clearance; Reports; Reminders & Notifications with Due Follow-ups and Notification Log; Daily Close-out with Today's Close-out and History; Ledger Import. Existing route URLs remain available.

## Validation

- Passed: `npx tsc -b --pretty false`
- Passed: `npx vitest run src/test/operations.test.tsx src/test/dashboard.test.tsx`
- Passed: `npm test`
- Passed: `npm run build`

## Remaining Issues

- The frontend remains mock-first; this refactor does not add backend concurrency controls, receipt numbering, or database-level locking.
