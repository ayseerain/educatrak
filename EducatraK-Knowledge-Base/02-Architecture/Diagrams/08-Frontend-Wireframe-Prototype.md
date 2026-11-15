# Figure 8 — Frontend Wireframe / Prototype: Cashier Payment Recording

## 1. Purpose and Project Plan Placement

Place in **5.3 System Overview**. This is a construction specification for the implemented Cashier payment-entry screen, not a screenshot or evidence that its external integrations have delivered a message.

## 2. Scope and Verified Sources

**Route:** `/payments/new` (optionally `?student=:id`). **Primary role:** Cashier (`payment.record`). Sources: `frontend/src/App.tsx`, `frontend/src/features/operations/OperationalPages.tsx` (switches data mode), `frontend/src/features/operations/LivePaymentEntryPage.tsx`, `frontend/src/api/cashierApi.ts`, `backend/app/Http/Requests/StorePaymentRequest.php`, and `backend/app/Actions/RecordPaymentAction.php`.

## 3. Screen Specification

| Region | Content / behavior | Classification |
|---|---|---|
| Application shell | Role-filtered sidebar, header, page area | Verified frontend structure |
| Page header | “Record payment” and helper text | Verified live component |
| Student selection | Search current student register; choose matching student; linked `student` query can preload context | Verified live component; source has stale user-facing “number” wording—final figure must say **LRN** |
| Account context | Read-only name, LRN, grade/section where returned, balance, next installment | Verified live API path |
| Payment form | Amount, paid-on date, backdate reason when earlier date, duplicate override reason, notes, email/SMS channel selection | Verified live component/request validation |
| Review confirmation | Shows student, amount, current balance, amount after payment, confirmation/cancel | Verified component behavior |
| Success | Issued receipt number, queued/not-queued email statement, Print Receipt, “Done — record another payment” | Verified component; printing/provider outcome separate |
| Access restriction | Other roles receive guard/denial; server requires `payments.record` | Verified frontend/backend evidence |

## 4. State and Validation Matrix

| State | Required rendering / source evidence |
|---|---|
| Initial | Student search prompt; no account/payment context. |
| Loading | Search or account context loading component. |
| Empty | “No matching students were found.” |
| Error | Query failure retry; form error preserves draft. |
| Invalid | No selected account, invalid/nonpositive amount, excess balance, future date, short backdate reason, missing channels. |
| Review | Confirmation before mutation; idempotency key held for retry. |
| Success | Receipt issued; `emailQueued` wording; print action available. |
| Permission denied | Route guard and backend capability middleware. |

## 5. Wireframe Construction Instructions

Use A4 portrait or 1366×768 desktop frame. Draw the shell only as a slim left rail; prioritize the central white card. In order: header → search/selected-student panel → account balance and next installment → payment fields → review/submit. Mark read-only account information with a muted surface and mark required inputs with labels, not placeholders. Show a confirmation dialog overlay only as a second state. Use **LRN**, never “Student Number,” in all generated labels.

```text
┌ Sidebar ┐  ┌──────────────────────────────────────────────────────┐
│ Payments│  │ Record payment                                        │
│ ...     │  │ Search the live register and confirm a cash payment.  │
└─────────┘  │ [ Search by student name or LRN                     ] │
             │ ┌ Selected student ────────────────────────────────┐ │
             │ │ Name · LRN · grade/section      Change student   │ │
             │ └─────────────────────────────────────────────────┘ │
             │ Balance (read-only)   Next installment (read-only)   │
             │ Amount received*   [             ]                   │
             │ Payment date*      [ YYYY-MM-DD  ]                   │
             │ Notification channels [email] [SMS]                  │
             │ Notes (optional)   [             ]                   │
             │                           [Review payment]           │
             └──────────────────────────────────────────────────────┘
```

## 6. Business Rules and Constraints

Cashier chooses an existing student/account; this screen is not a student-creation path. The backend validates authorization, centavo amount, date, and account state. The current component’s live search/API transport uses a legacy property name `number` whose value is `lrn`; its two visible labels say “number.” This is a documented frontend terminology drift—do not reproduce it in the Project Plan figure.

## 7. Verification and Accuracy Checklist

- [x] Route/guard/component and server request inspected.
- [x] Required empty/loading/error/success/review states specified.
- [x] LRN terminology corrected in diagram instructions.
- [x] Does not present PDF, email delivery, or physical printing as complete.

## 8. Outstanding Decisions and Limitations

No current task capture supplies a trustworthy screenshot. The mock-mode variant in `OperationalPages.tsx` has a different fixture-driven UI; label any mock-derived visual as prototype-only. Browser visual verification, provider enablement, and shareable PDF receipt implementation remain unverified.

## 9. Change History

- November 15, 2026 — Created from current source rather than historical screenshots.
