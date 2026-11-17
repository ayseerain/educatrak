# EducaTrak Diagram Reference Library

**Repository baseline:** `main` at `4640adb` (inspected November 15, 2026). This library is a reproducible reference for Project Plan figures, not a second requirements source. Classifications mean: **Approved Requirement**, **Verified Implementation**, **Documented Design**, **Draft / Proposed**, **Pending Confirmation**, or **Retired / Historical**.

## Diagram inventory

| Figure | Reference | Project Plan placement | Verification / implementation status | Outstanding decision |
|---|---|---|---|---|
| 1 | [External interfaces](01-External-Interface-Diagram.md) | 2.1 | Mixed approved requirements and verified boundaries | Supervising organization; provider configuration |
| 2 | [Internal organization](02-Internal-Organizational-Structure.md) | 2.2 | Approved project-owner context | Product Owner and Scrum Master unassigned |
| 3 | [Agile Scrum framework](03-Agile-Scrum-Framework.md) | 4.1 | Documented methodology | Sprint cadence and appointments |
| 4 | [Use cases](04-Use-Case-Diagram.md) | 5.1 / 5.3 | Verified routes/capabilities plus approved scope | Ledger-import authority |
| 5 | [System architecture](05-System-Architecture-Diagram.md) | 5.3 | Mixed actual/intended | Backup execution and external connectivity |
| 6 | [Physical ERD index](06-Entity-Relationship-Diagram.md) | 5.3 | Verified Laravel migrations | Policy gaps noted in database review |
| 6A | [Student and billing ERD](ERD/01-Student-and-Billing-Domain.md) | 5.3 | Verified schema | Guardian ownership/current-year policy |
| 6B | [Payments and financial ERD](ERD/02-Payment-and-Financial-Domain.md) | 5.3 | Verified schema/actions | Provider operation approval |
| 6C | [Operations and configuration ERD](ERD/03-Operations-and-Configuration-Domain.md) | 5.3 | Verified schema | Backup/retention policy |
| 7 | [System workflows](07-System-Workflow-Diagram.md) | 5.3 | Mixed verified workflows and bounded UI | Ledger import remains unimplemented |
| 8 | [Cashier prototype](08-Frontend-Wireframe-Prototype.md) | 5.3 | Verified live component; mock variant differs | Provider-enabled delivery and live visual capture |
| 9 | [UML class reference](09-UML-Class-Diagram.md) | Supplementary design | Verified selected source classes | Incomplete Eloquent relation declarations |

## Cross-diagram consistency matrix

| Feature / element | Relevant diagrams | Authoritative source | Consistency result | Notes |
|---|---|---|---|---|
| Six operational roles | 1, 4, 5, 7, 8 | `backend/app/Support/CapabilityMap.php` | Consistent | Frontend MockDB guard names differ but map to the same role intent. |
| LRN identity | 4, 6A, 7, 8, 9 | reference/people migration; `Student` request/controller | Consistent with a presentation defect | `students.lrn` is unique `string(12)`; the live payment component still has two visible “number” labels. |
| Cash payments and receipts | 1, 4–7, 9 | payment routes, `RecordPaymentAction`, billing migration | Consistent | Cash is the stored default; receipt is one per payment. |
| Void separation of duties | 4, 6B, 7, 9 | `CapabilityMap`, `RequestVoidAction`, `DecideVoidRequestAction` | Consistent | Recorder cannot decide its own request. |
| Notifications | 1, 4, 5, 6B, 7 | notification migrations and `ReminderDeliveryController` | Consistent | Email provider is unnamed; Twilio is code-backed but delivery is fail-closed until enabled/configured. |
| Student masterlist import | 4, 5, 7, 8 | decision `2026-11-07-student-masterlist-import.md` | Consistent | Registrar-only file-selection UI; no parsing, reconciliation, or apply behavior. |
| Financial ledger import | 4, 5, 7 | requirements and `/import` frontend route | Pending | Route is guarded by an ungranted capability; no backend import endpoint exists. |
| Clearance / exam permits | all active diagrams | decision `2026-11-05-student-record-role-reassignment.md` | Excluded | Tables/models remain **Retired / Historical** only. |
| Deployment | 1, 5 | current task instruction | Consistent | One office computer, locally hosted web app; older documents describe a LAN/offline deployment and are superseded here. |
| Backup | 5, 6C, 7 | requirement; `BackupController`; `routes/console.php` | Gap recorded | History API/table exist; no executable database-backup command or schedule was found. |

## Use and generation order

Generate in this order: 6A–6C physical schema views; 5 architecture; 4 use cases; 7 workflows; 1 interfaces; 2 organization; 3 Scrum; 8 wireframe; 9 class diagram. This keeps every later figure aligned with the physical schema, authorization model, and actual route surface. Use the embedded Mermaid only where its notation accurately represents the source; use a UML/diagramming tool for use-case notation and the A4 wireframe.

## Shared source set and limitations

Primary sources: `00-Project-Core/Project-Specification.md` (only after its November 5 retirement notice), `01-Requirements/`, `02-Architecture/`, approved `06-Decisions/`, `backend/routes/api.php`, `backend/app/`, `backend/database/migrations/`, and `frontend/src/`. Historical quality audits and the older backend API snapshot are context only. No runtime deployment, external-provider delivery, physical printing, migration against MySQL, or browser screenshot was performed for this documentation task.

## Change history

- November 15, 2026 — Created the reconciled library from the checked-out `main` source and current task decisions.
