# Student-record role reassignment and clearance retirement

- **Date:** November 5, 2026
- **Status:** Approved by the current task instruction

## Decision

Retire active Clearance and Exam Permit workflows. The retained clearance tables, models, factories, and historical records are not deleted or migrated.

The Registrar owns basic student-record maintenance: student number, name, grade level, section, and enrollment status. Registrar directory and profile responses include the current school-year balance and guardian-contact data, matching the Cashier student-record context. This does not authorize billing-account, payment, report, or other finance-workspace access. Cashier can view shared student records for billing and payments but cannot create or edit students. Accounting remains read-only for student records and financial oversight.

## Implementation implications

- Remove active clearance/permit routes, navigation, permissions, calculations, settings, seed records, and tests.
- Enforce student-record mutation server-side with `students.manage`, assigned only to Registrar.
- Enforce Registrar's read-only student-profile financial context with `students.financial.view` and guardian context with `guardianContact.view`; do not grant `accounts.view` or payment capabilities.
- Retain existing student, guardian, billing, payment, and clearance data structures. No destructive migration is authorized.

## Open point

Guardian-data ownership and maintenance are not reassigned by this decision.
