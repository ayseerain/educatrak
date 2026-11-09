# Printing and Accessibility

> Source-derived printing and accessibility requirements extracted from the canonical Project Specification.

## 26. Printing Requirements

Receipts, statements, and reports print on the school's ordinary office printers (no thermal printer). Use dedicated print routes/components with `@media print` styles: hide app chrome, black-and-white friendly, page size from a CSS variable (default **Letter, 8.5×11 in**; paper size is a setting because the school may use A4, see M9.5). The receipt is designed as a **half-page block at the top of the sheet** so it can be cut.

Print/export surfaces defined elsewhere in this document:
- Receipt print/reprint, with VOID and REPRINT marks (M4.3).
- Student statement of account print, for guardians without email (M7.4).
- Daily collection, monthly financial, and outstanding-balance reports — print and export to Excel (M7.1–M7.3).
- Overdue follow-up list print (M11.2).
- End-of-day close-out summary print (M13).
- Shareable PDF receipt as a download alternative to printing (M14).

---
---

## 27. Accessibility Requirements

Accessibility is part of the normal design process, not an add-on: readable text, adequate contrast, clear labels, obviously-interactive elements, visible focus/interaction states, meaningful feedback, understandable errors, and never color alone for meaning.

- **WCAG AA contrast** is the target across the app (Section 4).
- **Keyboard-first:** auto-focus the first field, Enter submits, Esc closes dialogs, logical tab order, visible focus ring — especially for cashier screens (Section 4).
- **Status is never communicated by color alone** — always icon + text (Sections 4, 5.5).
- **Session timeout warning** 1 minute before expiry (Section 4).
- Every screen implements loading, empty, error, and permission-denied states (Sections 4, 5.11).
- Confirmation dialogs for irreversible actions, with the destructive option visually distinguished from the safe one and an obvious way to cancel (Section 5.12).

---
