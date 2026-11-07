# MockDB Registrar student profile content

- **Date:** November 7, 2026
- **Status:** Approved by the project owner in the current task

## Decision

In the frontend MockDB workflow, `/students/:id` shows the Registrar's academic information, personal information, and existing guardian section. It does not show account balances, billing status, billing accounts, payment history, or financial actions. Missing personal values use a clear empty state.

Date of Birth, calculated Age, Gender, and Residential Address are visible only to the Registrar. Cashier and Accounting keep their existing financial profile behavior and do not see the personal fields. The Students list receives no new columns.

## Scope

This decision applies to the MockDB frontend only. It does not change the live student profile, APIs, backend permissions, or financial workflows.
