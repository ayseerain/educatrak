# Exclusive Role UML RBAC Audit

**Reviewed:** Sunday, October 18, 2026 — 15:17:28 +08:00

## Evidence reviewed

- `EducatraK_Exclusive_Role_UML_Diagrams.pdf`, all 13 pages, including five role diagrams and six activity flows.
- Root and backend agent instructions, current `main` history through `3f6db20`, current source, role capability maps, routes, dashboard components, operational pages, Laravel middleware, controllers, models, migrations, and tests.
- Applicable project requirements, architecture, decisions, build manual, redundancy-refactor ledger, and recent logs.

## Current-state audit

| Role | Existing effective frontend access before this change | Classification | Required result |
|---|---|---|---|
| Administrator | User, backup, system and finance settings, students, payments, reports, notifications, close-out history, audit | Redundant and misplaced | Limit primary UI and direct route capabilities to user/access administration, technical configuration, backups, and security events. |
| Cashier | Billing/payments/follow-up/close-out plus reports, permits, clearance, notifications, imports | Mostly correctly assigned, with redundant access | Retain daily billing ownership; preserve clearance status in student/payment context only; remove report, permit, import, and standalone notification access. |
| Accounting Officer | Financial settings, voids, reports, close-out plus student/payment, follow-up, clearance, technical settings, audit | Correct financial controls plus redundant access | Retain policies, void approval, close-out review, and reports; retain only decision-specific transaction information inside those workflows. |
| Auditor | Audit plus student/account/payment/report/clearance/follow-up/notifications/settings/close-out routes | Redundant | Consolidate to one read-only Audit Review route and dashboard action. |
| Registrar | Clearance/permits plus student browsing | Supporting access broader than needed | Limit to clearance verification and permit printing. The result contains no financial amount, balance, payment, or guardian-contact data. |

## Target role-access matrix

| Primary owner | Primary modules | Narrow supporting access |
|---|---|---|
| Administrator | User & Access Management; System Configuration; Backup & Recovery; Security Events | None to finance operations. |
| Cashier | Students & Billing; Cash Payments & Receipts; Installments & Follow-ups; Daily Close-out | Student-profile clearance status only. Void initiation remains in payment detail; it is not a separate approval module. |
| Accounting Officer | Financial Policies; Void Approval; Close-out Review; Financial Reports | Transaction context required to make void and close-out decisions, within those modules. |
| Auditor | Independent Audit Review | Authorized transaction, void, close-out, and audit evidence only inside the read-only review experience. |
| Registrar | Clearance Verification; Exam Permit Generation | Search by permitted student identity fields and amount-free clearance reasons only. |

## Implemented refactor

- Replaced generic capability-filtered sidebar groups with focused role-specific navigation.
- Updated frontend direct-route capability checks so removed roles cannot restore access by entering a route manually.
- Consolidated Auditor content into a single Audit Review screen and separated Administrator security events from financial auditing.
- Made Clearance Verification amount-free and exposed exam-permit printing only for the Registrar role.
- Refocused Administrator dashboard cards/actions on active accounts, backups, failed logins, and security events.
- Updated Laravel's independent capability map to the same ownership model.
- Added protected Administrator API endpoints for staff listing, creation, update/activation, server-generated temporary-password resets, and security-event review.
- Added failed-login auditing that records the submitted account identifier and outcome only; passwords, tokens, and session secrets are never stored in the event details.

## Missing and incomplete inventory

| Item | Classification | Current disposition |
|---|---|---|
| Backend payment, billing-account, void-approval, close-out, financial-policy, clearance, permit, reporting, and audit-review API endpoints | Missing backend integration | Not fabricated. Existing frontend operational screens remain typed mock workflows, and the Laravel routes expose only authentication and new administration/security endpoints. |
| Durable backup execution/recovery | Incomplete | The current backend has a backup-record model but no approved backup command/service. The interface remains a status/instruction surface; an executable backup workflow needs an approved operational design. |
| Frontend connection to the new staff/security API | Incomplete | The frontend continues to use its documented mock adapter. Its static administrative pages are not evidence that the Laravel endpoints have been integrated end-to-end. |
| Full operational role authorization tests | Incomplete | The implemented Laravel test coverage protects staff/security endpoints. Domain-operation authorization cannot be tested until the corresponding API routes/controllers exist. |

## Security and dependency concerns

- Payment immutability, receipt sequencing, allocation concurrency, controlled void decisions, and clearance recalculation must remain server-enforced when their domain routes are implemented.
- The Cashier must never receive void approval; the Auditor must remain read-only; the Registrar must not receive financial fields in API responses.
- The pre-existing frontend forgot-password help changes were not modified by this refactor.
- PHP feature tests cannot run in this execution environment because its PHP installation lacks the required `mbstring` extension. Syntax checks, route discovery, formatting, and frontend validation were completed.
