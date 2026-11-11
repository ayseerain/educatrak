# Data Model and Business Rules

> **Approved operational reassignment — November 5, 2026.** Registrar updates change only the current student record and must not recalculate, replace, or overwrite billing accounts, charges, payments, receipts, or audit evidence. No clearance or exam-permit rule is active. Guardian ownership is unchanged and is not implied by Registrar student-record authority.

> Source-derived data and business rules extracted from the canonical Project Specification.

## 24. Data Model

TypeScript, in `src/api/types.ts`. All ids are strings. All money is integer centavos. All timestamps are ISO 8601.

```ts
type Role = 'admin' | 'cashier' | 'accounting' | 'auditor' | 'registrar';

interface User { id: string; username: string; fullName: string; role: Role; active: boolean;
  mustChangePassword: boolean; lastLoginAt?: string; }

interface Guardian { id: string; fullName: string; relationship: string; email?: string;
  emailStatus: 'ok' | 'missing' | 'bounced'; mobile?: string; }

interface Student { id: string; lrn: string; fullName: string; gradeLevel: string; section: string;
  status: 'enrolled' | 'inactive'; guardianIds: string[]; }

interface SchoolYear { id: string; label: string; current: boolean; terms: Term[]; }
interface Term { id: string; name: string; examPeriods: ExamPeriod[]; }
interface ExamPeriod { id: string; name: string; startDate: string; }

interface FeeItem { id: string; name: string; category: 'tuition' | 'miscellaneous' | 'other';
  amount: number; required: boolean; }
interface FeeSchedule { id: string; schoolYearId: string; gradeLevel: string; items: FeeItem[]; }

interface PaymentPlan { id: string; name: string; downPayment: { type: 'amount' | 'percent'; value: number };
  installments: { label: string; dueDate: string; percentOfRemaining: number }[]; }

interface BillingAccount { id: string; studentId: string; schoolYearId: string; feeScheduleId: string;
  planId: string; items: AccountItem[]; adjustments: Adjustment[];
  totalDue: number; totalPaid: number; balance: number;
  status: 'current' | 'due_soon' | 'overdue' | 'paid'; schedule: InstallmentRow[]; }
interface AccountItem { feeItemId: string; name: string; amount: number; }
interface Adjustment { id: string; type: 'discount' | 'scholarship' | 'correction';
  amount: number; reason: string; createdBy: string; createdAt: string; }
interface InstallmentRow { id: string; label: string; dueDate: string; amount: number; paid: number;
  status: 'paid' | 'current' | 'due_soon' | 'overdue'; }

interface Payment { id: string; accountId: string; studentId: string; receiptNo: string;
  amount: number; method: string; reference?: string; paidOn: string; recordedBy: string; recordedAt: string;
  allocation: { installmentId: string; amount: number }[];
  status: 'valid' | 'void_pending' | 'voided'; notes?: string; reprintCount: number; }
interface VoidRequest { id: string; paymentId: string; reason: string; requestedBy: string; requestedAt: string;
  status: 'pending' | 'approved' | 'rejected'; decidedBy?: string; decidedAt?: string; decisionNote?: string; }

interface ClearanceRule { id: string; kind: 'enrollment' | 'exam'; examPeriodId?: string;
  rule: { type: 'min_down_payment' } | { type: 'installments_paid_through_exam_start' } }
interface ClearanceStatus { studentId: string; enrollment: { cleared: boolean; reason?: string };
  exams: { examPeriodId: string; name: string; cleared: boolean; reason?: string }[]; }

interface NotificationLog { id: string; studentId: string; guardianEmail?: string;
  kind: 'payment_confirmation' | 'reminder' | 'statement'; status: 'queued' | 'sent' | 'failed';
  failureReason?: string; attempts: number; createdAt: string; sentAt?: string; paymentId?: string; }

interface CloseOut { id: string; date: string; cashierId: string;
  systemTotals: Record<string, number>; countedCash: number; variance: number; varianceReason?: string;
  submittedAt: string; signedOffBy?: string; signedOffAt?: string; }

interface AuditEntry { id: string; at: string; userId: string; action: string;
  entityType: string; entityId: string; before?: unknown; after?: unknown; }

interface BackupRecord { id: string; at: string; result: 'ok' | 'failed'; sizeBytes?: number; error?: string; }

interface ImportPreview { rows: ImportRow[]; summary: { total: number; ok: number; warnings: number; errors: number }; }
interface ImportRow { rowNo: number; data: Record<string, string>; issues: { level: 'warning' | 'error'; message: string }[]; }
```

Lists of grade levels, sections, payment methods, and receipt title come from settings, not code.

---
---

## 25. Business Rules

The backend is authoritative; the mock adapter (Section 28) implements the same rules so the UI can be built and tested against them.

1. **Balance** = total due (fees minus adjustments) minus valid payments. Voided payments do not count.
2. **Overpayment is blocked.** An amount above the current balance is rejected with a clear message.
3. **Installment allocation:** a payment is applied to the **oldest unpaid installment first**, spilling into the next. Show the allocation on the receipt and payment detail.
4. **Installment status:** `paid` if fully paid; `overdue` if the due date has passed and it is not fully paid; `due_soon` if due within the next 7 days (configurable); else `current`. Account status = the worst of its installments.
5. **Duplicate protection:** (a) the same `reference` for the same method is **hard-blocked**; (b) same student + same amount within 10 minutes shows a **warning** that needs an explicit "Yes, this is a new payment" tick plus reason.
6. **Non-cash payments** require a reference number.
7. **Receipt numbers** are sequential and assigned by the server (format like `OR-2026-000123`). The UI never invents or edits them.
8. **No deletion of payments.** Only void: the cashier requests with a reason, accounting approves. While pending, the payment shows "Void pending." Once approved, it shows struck-through with "VOID," the balance is restored, and an audit entry exists. The receipt print view shows "VOID."
9. **Reprint** is allowed, is logged, increments `reprintCount`, and prints with "REPRINT."
10. **Back-dated payments** need a reason. Future dates are not allowed.
11. **Clearance** is computed by the server from configurable rules and recomputed after every payment, void, or adjustment. The UI shows the result and the plain-language reason; it does not compute policy itself (the mock does, in `lib/clearance.ts`). **The reason shown to `REG` never includes an amount** (Section 6.2, rule 5).
12. **Exam permit** can be printed only for a period where `cleared` is true. Each print is logged.
13. **Email:** a confirmed payment queues an email (amount, balance, receipt number, date). The payment is saved even if email fails. Failures appear in the notification log with a reason. Reminder emails are sent only after a cashier/accounting user confirms the batch.
14. **Close-out:** one per cashier per day; variance = counted cash minus system cash total; a non-zero variance requires a reason; after submit, the day is locked for that cashier; only accounting can sign off.
15. **Lockout:** after repeated failed logins the API returns a lockout response; show the wait time.
16. **Import:** duplicate students (same LRN) are errors; missing guardian email is a warning; the whole file is checked before anything is saved.
17. **No hard deletes of financial or audit records anywhere** — payments, receipts, accounts, adjustments, audit entries, and notification logs are never deleted or edited after saving; corrections use void or a correcting adjustment (Section 6.2, rule 1).
18. **Every data-changing action writes an audit entry** — who, when, what, before/after values (Section 6.2, rule 2).
19. **Separation of duties:** the user who records a payment cannot approve its void (Section 6.2, rule 3).
20. **Fee and plan edits apply to new accounts only;** existing accounts keep the terms they were created under (Section 17, M9.1–M9.2).
21. **Admin safety:** an admin cannot deactivate themselves or the last active admin (Section 9, M1.3).

---
