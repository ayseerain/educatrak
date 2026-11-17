# EducatraK — Unified System & Frontend Specification

> **Approved operational reassignment — November 5, 2026.** This notice supersedes every conflicting active provision in this historical consolidated specification. Mendez Christian Academy does not use financial-clearance or examination-permit procedures. Clearance and permit routes, permissions, calculations, printing, thresholds, settings, dashboard widgets, and active terminology are retired. Retained database structures are historical records only and must not be destructively migrated without separate approval. Registrar owns basic student records in the shared Students module (list, search, filter, view, create, edit, grade, section, and existing enrollment status) without financial, guardian-contact, or reporting access. Cashier retains the shared Students module for approved billing and payment work but cannot create or edit student records. Accounting retains its existing financial oversight without student-record editing.

> **Registrar student-context update — November 5, 2026.** On the shared Students list and profile only, Registrar receives the same read-only current-balance and guardian-contact context as Cashier. Registrar retains its existing student-management buttons; this narrowly scoped visibility does not grant billing-account, payment, report, or other finance-workspace access.

> **Student identifier reconciliation — November 13, 2026.** Every active operational reference to “student number” means the approved twelve-digit text LRN, represented as `lrn`. This is terminology reconciliation only: it does not represent a schema migration, installed-record conversion, or change to numerical student IDs and their relationships. Dated decision records retain their original wording as historical context.

> **How this document was built.** This is a merge of two prior specifications — the *Frontend Agent Handoff* and the *Modules, Submodules, Operations, and Access Control* breakdown — plus a new Color Branding and Typography system. Where the two source documents overlapped, they were reconciled rather than concatenated, using this precedence order: (1) an explicit business/security/privacy rule, (2) an explicit technical constraint, (3) a detailed operation-level requirement, (4) a detailed access-control rule, (5) a specific screen/route behavior, (6) a general UX guideline, (7) a general visual guideline. Genuine contradictions that could not be safely resolved this way are listed in **Section 31, Open Decisions and Clarifications**, not silently decided. Section 30 documents every place the two sources were merged or where one source updated the other.

---

## 1. Project Overview

**EducatraK** is a web-based student billing and payment monitoring system for **Mendez Christian Academy**, a small private K-12 school in Cavite, Philippines. It runs only on the school's local network (intranet), with no external network access at runtime.

Cashiers create billing accounts and record payments in person; the system validates each payment, issues sequentially numbered receipts, emails guardians, tracks installment schedules, and shows financial clearance status to the Enrollment/Registrar office. It is **partially automated by design**: a cashier still encodes accounts and payments by hand, and the system automates everything after that point — validation, receipt generation, balance and schedule status, clearance computation, the email queue, reports, and the audit log.

**Who uses it** (basic computer skill level; current tools are Excel and Google Drive):
- **Super Admin** — protected governance account; manages user lifecycle and reviews security/audit status, without operating finances.
- **Cashier(s)** — the daily heavy users of the system.
- **Accounting Officer** — sets fees and rules, approves voids, reviews reports.
- **Administrator** — manages users, system settings, backups.
- **Auditor** — strictly read-only oversight.
- **Enrollment / Registrar staff** — read-only clearance lookup only.

**Headline feature — "Clearance-Aware Billing":** every payment instantly recomputes each student's clearance status, both for enrollment and for each exam period, and a printable **exam permit** is available only when the student is cleared. Installment schedules with overdue tracking feed this computation. These screens (Module M10) get extra care during build.

**Task scope:** this specification covers the **frontend only**. The backend (Laravel + MySQL) is built separately. The frontend is built against a typed API layer with a **mock adapter**, so the app runs fully without a live backend (see Section 28).

---

## 2. Scope

### 2.1 In scope
Everything described in Sections 8–22 (Modules M0–M14), built against the roles, routes, data model, and business rules in this document.

### 2.2 Explicitly out of scope (do not build)
- Parent or student login/portal, or any public-facing page.
- Online payment gateway, card, bank, or check payment recording. Transactions are recorded as cash only.
- Mobile app or mobile-first layouts.
- SMS, push notifications, or Messenger integration.
- LMS (Quipper) integration, grading, class scheduling, attendance, the enrollment workflow itself (only billing and clearance), payroll, or a general ledger/full accounting system.
- Self-registration and email-based "forgot password" — password resets are performed by an admin only.
- QR codes, barcodes, biometrics, chatbots, AI features, gamification.
- Multi-school or multi-campus support; multiple languages or a language switcher.
- Dark mode or theme customization.
- BIR-registered official-receipt tax compliance features — the receipt title is a setting; do not add tax fields.
- Editing or deleting payments, receipts, or audit entries, ever.
- Decorative dashboards or charts beyond the one Accounting collection-trend chart.
- Real backend code, database code, or deployment scripts (frontend only).

Where this specification is silent, do the simplest thing that fits the rules in Sections 3–6, leave a `// TODO(spec): ...` comment in code, and add a line to `DECISIONS.md`. Do not invent new modules, roles, payment methods, business rules, screens, integrations, or automation beyond what is written here.

---

## 3. Technical Stack and Environment

### 3.1 Stack (fixed)
- React 18 + TypeScript (strict) + Vite
- Tailwind CSS (utility classes; design tokens defined in `tailwind.config`)
- React Router (SPA, client-side routing)
- TanStack Query (server state) and TanStack Table (data tables)
- React Hook Form + Zod (forms and validation)
- Radix UI primitives or shadcn/ui components (self-hosted, no CDN)
- Vitest + Testing Library (unit/component tests), Playwright (key flows — see Section 29)
- Charts: at most one simple bar/line chart (Recharts), on the Accounting dashboard only. No decorative charts.

### 3.2 Environment constraints (from the school's real limits)
- **No external network at runtime.** The school restricts internet access: no CDN scripts, no Google Fonts, no remote images, no analytics, no telemetry. Use the system font stack (`"Segoe UI", system-ui, sans-serif`, see Section 5.2) or a self-hosted font file if one is introduced later.
- **Target browsers:** current Chrome and Edge on Windows 10. **Minimum screen 1366×768.** Desktop only — no mobile layout is required, but the app must not break at 1024px wide.
- **Target hardware:** Intel i5 / 8 GB RAM school PCs. Keep the bundle small, lazy-load report and admin routes, paginate large tables (server-side pagination contract, 25 rows default), and avoid heavy animation.
- **Money:** store and compute as **integer centavos** (`number`), never floats. Format with `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })` (shows ₱). Write and unit-test `money.ts` helpers (add, subtract, format, parse user input like `"1,500.50"`).
- **Dates/time:** timezone `Asia/Manila`. Store ISO strings; display as `Sep 21, 2026`, and `Sep 21, 2026, 3:45 PM` for timestamps.
- **Language:** English UI, plain wording. All user-visible strings live in `src/i18n/en.ts` so Filipino can be added later. Do not build a language switcher.
- **No real student data anywhere** — repo, mocks, tests, or screenshots. Seed only with obviously fake names.
- **Never keep credentials or personal data in `localStorage`.** Auth is a cookie session (see Section 28); the frontend stores only UI preferences (e.g., table page size).
- **Never hard-code school policy** — fee amounts, plan names, grade levels, clearance thresholds, receipt title, and payment methods are all configurable data loaded from the API, never constants in code.

---

## 4. UX Principles

These are the floor requirements for every screen, written for low-experience cashier staff. Section 5 (Design System) builds the full visual language on top of these; where the two overlap, this section's rules win.

- **Type size floor:** base font 16px; body text never smaller than 14px; buttons at least 44px tall.
- **One main task per screen; one primary button per screen.** The primary action sits bottom-right of its form, consistently.
- **Plain-language labels** — say "Amount received," not "Remit"; "Balance left," not "Outstanding principal."
- **Status is never shown by color alone** — always icon + text (`Current`, `Due soon`, `Overdue`, `Cleared`, `Not cleared`).
- **Confirm dialogs for irreversible actions** (submit payment, void request, close-out, import commit) that repeat the key numbers (student, amount, receipt total).
- **Actionable errors** — say what happened and what to do next (e.g., "Amount is more than the balance of ₱2,500.00. Enter ₱2,500.00 or less.").
- **Every screen implements loading, empty, error, and permission-denied states.**
- **Keyboard-first for cashier screens:** auto-focus the first field, Enter submits, Esc closes dialogs, logical tab order, visible focus ring. Meet WCAG AA contrast (see Section 27).
- **Session timeout:** warn 1 minute before expiry with a "Stay signed in" button; on expiry, redirect to `/login` and never keep unsaved form data in storage.

---

## 5. Design System and UI Guidelines

### 5.1 Design Direction

Modern, minimalist, clean, professional, approachable, consistent, easy to scan, smooth and responsive, and usable by non-technical stakeholders without feeling childish or oversimplified.

**Overall goal:** modern, minimalist, clean, readable, approachable, consistent, and effortless — compact but not cramped, readable but not oversized, rounded but not overly rounded, colorful but not noisy, modern but not trendy for its own sake, professional but not intimidating, simple but not lacking functionality, polished but not needlessly complex.

### 5.2 Typography

**Font family.** Because the application runs on a school intranet with no external network access:

```text
Primary: "Segoe UI", system-ui, sans-serif
```

Do not use Google Fonts, external font CDNs, or remote font resources. If a self-hosted font is introduced later, it must remain compatible with the offline environment.

**Typography principles.** Typography should be clean, modern, professional, highly readable, compact but not cramped, appropriate for non-technical school staff, consistent across every module, and accessible at the application's minimum supported screen size. Do not use oversized headings simply for visual impact.

Hierarchy should come primarily from **font weight, spacing, and placement first — reach for a bigger font size last.** Never rely on size alone to create hierarchy.

**Type scale** (baseline, unless a specific requirement elsewhere overrides it):

| Token | Size | Suggested weight | Usage |
|---|---:|---:|---|
| `text-xs` | 12px | 400–500 | Timestamps, compact metadata, table helper text |
| `text-sm` | 14px | 400–500 | Secondary text, helper text, compact labels |
| `text-base` | 16px | 400 | Default body text |
| `text-lg` | 18px | 500–600 | Emphasized body text, section labels |
| `text-xl` | 20px | 600 | Subsection headings |
| `text-2xl` | 24px | 600 | Page headings |
| `text-3xl` | 30px | 600–700 | Major dashboard/page headings, used sparingly |

**Minimum readability rules:**
- Base font size: **16px**. Normal body text must not be smaller than **14px**.
- Avoid 12px text for important information. Important user actions must remain clearly readable.
- Labels must not depend on placeholders to communicate meaning.
- Supporting text may be smaller but must remain readable and accessible.
- Headings should not consume excessive vertical space.

**Font weights** (restrained system):

```text
400 — Regular / body
500 — Medium / labels / controls
600 — Semibold / headings / important values
700 — Bold / major emphasis only
```

Do not make entire interfaces bold.

**Typography hierarchy** — maintain clear distinctions between: page title, section heading, subsection heading, field label, body text, supporting/helper text, table text, status text, button labels, important financial values, and error/warning messages. Financial values, balances, totals, and important statuses may use stronger weight but should not become excessively large.

### 5.3 Color System

Restrained, cohesive palette; strong text/background contrast; limited use of highly saturated color; one consistent accent. No decorative-only color.

**Brand colors** — exact tokens and hex values; do not modify, approximate, rename, or replace them unless a future specification explicitly changes them.

| Token | Hex | Usage |
|---|---|---|
| `brand-green` | `#039935` | Primary buttons, active navigation, headers, primary UI |
| `brand-green-dark` | `#035419` | High-contrast green, especially for white text |
| `brand-green-light` | `#8CCC7E` | Surface/accent backgrounds only |
| `brand-yellow` | `#EAEA09` | Secondary accent, highlights, badges |
| `brand-yellow-dark` | `#AFAF07` | Hover/active yellow state; use with dark text |
| `text-primary` | `#1A1A1A` | Main body text and headings |
| `text-secondary` | `#616161` | Supporting text |
| `text-muted` | `#9E9E9E` | Placeholder, disabled, timestamp text |
| `background` | `#FFFFFF` | Main page background |
| `surface` | `#F5F5F5` | Cards and panels |
| `border` | `#E0E0E0` | Dividers, borders, input outlines |

**Design tokens (implementation-ready):**

```text
Primary:
brand-green: #039935
brand-green-dark: #035419
brand-green-light: #8CCC7E

Accent:
brand-yellow: #EAEA09
brand-yellow-dark: #AFAF07

Text:
text-primary: #1A1A1A
text-secondary: #616161
text-muted: #9E9E9E

Surface:
background: #FFFFFF
surface: #F5F5F5
border: #E0E0E0

Semantic:
success: #20753A
warning: #A85F00
error: #D32F2F
info: #1976D2

Typography:
font-family: "Segoe UI", system-ui, sans-serif
base-size: 16px
minimum-body-size: 14px
```

### 5.4 Semantic Colors

| Token | Hex | Usage |
|---|---|---|
| `success` | `#20753A` | Confirmations, success states, success buttons/badges |
| `warning` | `#A85F00` | Warning states, low-stock/nearing-expiration/frequent-visitor-style flags where applicable |
| `error` / `destructive` | `#D32F2F` | Delete/irreversible actions and validation errors |
| `info` | `#1976D2` | Neutral informational/system messages |

If a lighter semantic variant is needed for an icon or a light badge background, it must use dark text, never white text. Do not introduce arbitrary additional semantic colors without documenting them here.

### 5.5 Contrast and Accessibility

**White text.** Small white text may only be placed on `brand-green-dark`, `success`, `warning`, `error`, or `info`. Do **not** use small white text on `brand-green`, `brand-yellow`, `brand-yellow-dark`, `brand-green-light`, or any light semantic variant.

**Brand green.** `brand-green` may carry white text only when the text qualifies as large/UI text under the stated contrast requirements; for normal body text, use a darker color when necessary.

**Yellow.** Never use white text on `brand-yellow` or `brand-yellow-dark`. Use `text-primary` or `brand-green-dark` instead.

**Light green.** `brand-green-light` is for accent surfaces, light badges, backgrounds, and decorative supporting surfaces — always with dark text, never white text.

**Semantic meaning.** Never communicate meaning through color alone. Every semantic state uses an appropriate combination of color, icon, text label, and position/context:

```text
✓ Cleared
! Due soon
⚠ Overdue
× Error
i Information
```

This reinforces, and does not replace, the "status never by color alone" floor rule in Section 4.

### 5.6 Buttons and Controls

Small-to-medium in visual size, comfortable to click, at least **44px tall** (per Section 4), slightly rounded, easy to distinguish by purpose, consistent across modules. Avoid sharp square buttons, excessively rounded buttons, pill-shaped buttons by default, oversized CTA buttons, and giving every button equal visual emphasis.

**Button hierarchy:**

| Role | Treatment |
|---|---|
| **Primary** | `brand-green` background, white text. The one action you probably want. |
| **Secondary** | Outlined or surface-filled treatment, `brand-green` text. Visually quieter than primary. |
| **Cancel / Neutral** | Plain text, quiet gray outline, or neutral surface treatment. Never competes visually with the primary action. |
| **Destructive** | `error`/`destructive` styling, reserved for genuinely irreversible or destructive actions only — never for ordinary Cancel, Back, Close, Return, or Clear. |

Never rely on color alone for meaning — pair it with labels, icons, or position.

### 5.7 Shape Language

One consistent, subtle radius scale reused across buttons, inputs, cards, dialogs, and containers:

```text
sm  — small controls
md  — standard buttons, inputs, cards
lg  — larger containers/dialogs
```

Exact pixel values may follow the project's Tailwind configuration, but the visual principle is: **slightly rounded, modern, and softened — never sharp, excessively rounded, or playful.** No pill-shaped components as the default; no fully sharp corners; no excessive rounding.

### 5.8 Layout and Spacing

Clean, organized, compact, comfortable, uncluttered — avoid both cramped crowding and excessive whitespace that makes the system feel inefficient. Consistent spacing and alignment show relationships; group related information and separate unrelated information.

### 5.9 Forms

Clear labels (never placeholder-only text), grouped related fields, required fields clearly marked, confusing fields briefly explained, and validation messages a non-technical user understands (never a raw technical/API error — consistent with Section 4's error-wording rule). Preserve entered data when validation fails. Each form should answer, in order: *What do I enter? → Why am I entering it? → What happens next?*

### 5.10 Navigation

Predictable and simple: familiar terminology, no unneeded jargon, current location always clear, recurring controls in a consistent place, and structure organized around the user's tasks (e.g., "Record a payment") rather than the app's internal architecture. The sidebar shows only the modules a signed-in role can use (Section 6).

### 5.11 Feedback and System States

Every relevant component defines loading, saving, success, error, warning, empty, disabled, hover, focus, and completed states, with concise, actionable messages (e.g., "Unable to save changes. Please check the required fields." rather than a raw error). This extends the loading/empty/error/permission-denied floor set in Section 4.

### 5.12 Modals and Confirmation

Use dialogs only where they add real value — don't interrupt for harmless actions. For destructive/irreversible actions (payment void, close-out lock, import commit — see Section 4), clearly state what will happen, visually distinguish the destructive action from the safe one, and always give an obvious way to cancel.

### 5.13 Animation and Microinteractions

Subtle only, and only to communicate state changes, feedback, transitions, loading, or interaction response. No bouncing, no decorative motion, nothing excessive — the app should feel smooth and responsive, not flashy.

### 5.14 Visual Hierarchy

Every screen should let a user quickly tell: where they are, what the page is for, what information matters, what actions are available, which action is most relevant, and what happened after they acted. Achieve this with size, weight, spacing, position, and contrast — not by making everything large, bold, or colorful.

### 5.15 Consistency Rules

Reuse the established type scale, weights, spacing, colors, button/input styles, radii, shadows, icons, and status indicators everywhere; extend an existing component rather than creating a visually different duplicate that solves the same problem.

The branding and typography guidelines in this section **extend** the existing UX and access-control requirements — they do not replace or weaken any of the following, all of which remain in force: the type-size floor and one-task-per-screen rule (Section 4); status never communicated by color alone (Sections 4, 5.5); confirmation dialogs for irreversible actions (Sections 4, 5.12); actionable error messages (Section 4); loading/empty/error/permission-denied states on every screen (Sections 4, 5.11); keyboard-first cashier workflows, visible focus states, and logical tab order (Section 4); WCAG AA contrast (Sections 4, 27); the session-timeout warning (Section 4); no unnecessary animation (Section 5.13); consistent navigation (Section 5.10); accessibility as part of normal design, not an add-on (Section 27); and consistent component reuse (this section).

Where a requirement doesn't spell out a specific behavior, decide using standard usability practice — empty states, tooltips where genuinely needed, icon+text pairing, hover/focus/disabled/loading states, error recovery, success feedback, logical grouping, keyboard accessibility, and guarding against accidental destructive actions — and record the decision in `DECISIONS.md`. Don't add an element just because it looks appealing; every element needs a usability reason.

### 5.16 Priority When Guidelines Conflict

**Usability → Clarity → Accessibility → Consistency → Efficiency → Visual polish.**

Never trade away usability or accessibility for aesthetics.

---

## 6. Roles and Access Control

### 6.1 Role reference

| Code | Role name | TS role key | Summary |
|---|---|---|---|
| `SAD` | Super Admin | `super_admin` | Governance, protected bootstrap account, user administration, security events, audit oversight. No payment or finance operations. |
| `ADM` | Administrator | `admin` | Users, system settings, backups. Does **not** record payments. |
| `CSH` | Cashier | `cashier` | Daily operations: accounts, payments, receipts, follow-up, close-out. |
| `ACC` | Accounting Officer | `accounting` | Finance settings, void approvals, sign-off, reports. |
| `AUD` | Auditor | `auditor` | Read-only Audit Review workspace and approved audit summary. |
| `REG` | Enrollment / Registrar | `registrar` | Clearance lookup and exam permit only. Sees no amounts. |

**Access-note vocabulary:** "own" = only records the user created; "own day" = only the current day's activity; "limited" = reduced fields (noted per module).

### 6.2 Global rules (apply to every module)

1. **No hard deletes of financial or audit records.** Payments, receipts, accounts, adjustments, audit entries, and notification logs can never be deleted or edited after saving. Mistakes are handled by **void** (with approval) or a **correcting adjustment**. Where an operation table says "Delete," the row states what happens instead.
2. **Everything that changes data writes an audit entry** (who, when, what, before/after values).
3. **Separation of duties:** the user who records a payment cannot approve its void.
4. **AUD has no create, edit, approve, send, or print-permit buttons anywhere.**
5. **REG never sees** amounts, payment history, guardian contact details, or account details.
6. **The frontend hides actions a role cannot perform, but the backend is the real enforcer.** Implement a `can(user, capability)` helper (`src/auth/permissions.ts`) and use it for both route guards and to hide/disable buttons — never rely on hiding alone for security, and never show an action a user cannot perform.

### 6.3 Module-level access summary

`F` = full access to the module's operations for that role, `R` = read-only, `L` = limited (see module notes), `-` = no access.

| # | Module | SAD | ADM | CSH | ACC | AUD | REG |
|---|---|---|---|---|---|---|
| M0 | Dashboard & Navigation | F (system governance) | F | F | F | R | L |
| M1 | User Management | F (privileged lifecycle) | F | L (own profile) | L (own profile) | L (own profile) | L (own profile) |
| M2 | Students & Guardians | - | - | F | R (workflow context) | - | - |
| M3 | Billing Accounts | - | - | F | R (workflow context) | - | - |
| M4 | Payments & Receipts | - | - | F | R (workflow context) | - | - |
| M5 | Void Control / Receipt Integrity | - | - | L (request/status) | F (queue/decision) | - | - |
| M6 | Notifications | - | - | L (combined follow-up workspace) | R (combined follow-up workspace) | - | - |
| M7 | Reports | - | - | - | F | - | - |
| M8 | Audit & Backup | F (audit/security and backup-status oversight) | F (security events/backup management) | - | - | R (Audit Review) | - |
| M9 | Settings | - | F (system) | - | F (finance) / R (required system settings) | - | - |
| M10 | Clearance & Exam Permit | - | - | - | - | - | F (limited) |
| M11 | Installments & Follow-up | - | - | F | F | - | - |
| M12 | Ledger Import | - | - | - | - | - | - |
| M13 | End-of-Day Close-out | - | - | F (submit/own history) | F (review/sign-off) | - | - |
| M14 | Shareable PDF Receipt | - | - | F | F | - | - |

> The settings access cells reflect the current role simplification: Administrator manages system settings; Accounting manages finance settings and reads required system configuration; Auditor has no settings workspace. This supersedes the earlier Reconciliation item 3 proposal.

### 6.4 Capability matrix

This is the implementation-level role list. `F` = full/write access, `R` = read-only, blank = no access. The requester authorized implementation of the proposed Super Admin as a separate governance role. Super Admin is limited to user lifecycle, security events, audit oversight, and backup status; it receives no student, billing, payment-recording, finance-setting, void-approval, or report-operation capabilities. Administrator retains day-to-day system configuration; Accounting retains finance operations; Auditor retains the independent Audit Review workspace; Registrar retains clearance. External client acceptance and unresolved bootstrap recovery/second-person policy remain tracked in Section 31.

| Capability | SAD | ADM | CSH | ACC | AUD | REG |
|---|---|---|---|---|---|
| `user.manage` (controlled lifecycle; bootstrap Super Admin excluded) | F | F | | | | |
| `settings.system` (school info, receipt, email, school year) | | F | | R | | |
| `settings.finance` (fees, plans, clearance rules) | | | | F | | |
| `student.view` | | | F | F | | F |
| `student.edit` (basic student info) | | | | | | F |
| `student.financial.view` (student list/profile balance only) | | | F | F | | F |
| `guardianContact.view` (student profile contact details) | | | F | F | | F |
| `account.view` | | | F | F | | |
| `account.create` | | | F | | | |
| `payment.record` | | | F | | | |
| `payment.view` | | | F (own by default) | F | | |
| `payment.void.request` | | | F | | | |
| `payment.void.view` | | | | F | | |
| `payment.void.approve` | | | | F | | |
| `receipt.reprint` (logged) | | | F | F | | |
| `statement.print` (student statement of account) `NEW` | | | | F | | |
| `followup.view` | | | F | F | | |
| `followup.send` (approve reminder batch) | | | F | F | | |
| `clearance.lookup` (limited student identity search for clearance) | | | | | | F* |
| `clearance.view` | | | | | | F* |
| `permit.print` | | | | | | F |
| `closeout.submit` | | | F | | | |
| `closeout.signoff` | | | | F | | |
| `closeout.view` | | | F (own) | F | | |
| `report.view` | | | | F | | |
| `notification.view` | | | F | F | | |
| `notification.retry` | | | F | | | |
| `import.run` | | | | | | |
| `security.events.view` (account and authentication events) | F | F | | | | |
| `audit.view` (financial/change audit) | F | | | | F | |
| `backup.manage` | | F | | | | |

\* **Registrar (`REG`)** sees only: student name, LRN, grade and section, and clearance status with a reason that **hides amounts**. No payment history, no guardian contact details, no account details — see Section 6.2, rule 5, and the reconciliation in Section 30, item 2.

**Auditor is strictly read-only:** no create/edit/approve buttons anywhere.
**Separation of duties:** the person who records a payment cannot approve its void. The UI shows the approve button only to `ACC`.

### 6.5 Per-role summary

**SAD — Super Admin**
**Can:** use the system-governance dashboard; provision the initial protected account only through the trusted server-console bootstrap command; create and manage non-Super-Admin staff accounts (including Administrators, but not Accounting Officers pending policy); review security events and the financial/change audit; view backup status; change their own password.
**Cannot:** record payments, create billing accounts, manage finance settings, request or approve voids, sign off close-outs, send notifications, run backups, access student or financial-operation workspaces, assign another Super Admin, or modify/reset/deactivate the protected bootstrap account. No second-person recovery or break-glass policy is implemented until MCA defines it.

**ADM — Administrator**
**Can:** manage user accounts (M1.3); manage system settings — school year, terms, grade levels, sections, payment methods, receipt, and email configuration (M9.4–M9.6); review authentication/account-administration security events; manage backups (M8.2); view the system dashboard (backup and active-user status) and change their own password.
**Cannot:** access student, guardian, billing-account, payment, receipt, void, notification, clearance, follow-up, close-out, or financial-report workspaces; view or manage finance settings; print exam permits; send reminders; retry notifications; run ledger imports; view the finance/change audit log; record payments or create accounts.

**CSH — Cashier**
**Can:** add/edit students and guardians (M2); create accounts and adjustments (M3); record payments (M4.1); view their own history and void-request status (M4.2); print and reprint receipts (M4.3); request voids (M5); review/retry notification attempts only within the combined follow-up workspace (M6.2); use the follow-up list and send reminder batches (M11); perform close-out and review their own close-out history (M13); change their own password. Clearance status may appear only as supporting context in an authorized student/payment workflow.
**Cannot:** approve voids, access standalone reports/student statements, manage fees/system settings or users, access standalone notification/clearance/permit/import workspaces, view the audit log or backups, see other cashiers' history by default, or sign off close-outs.

**ACC — Accounting Officer**
**Can:** edit fee schedules, plans, and clearance rules (M9.1–M9.3); approve or reject voids (M5); run and export all reports (M7); sign off close-outs (M13.4); reprint receipts and generate PDF receipts (M4.3, M14); view accounts, payments, and notifications (read-only); view follow-up and send reminder batches (M11); read system settings (M9.4–M9.6).
**Cannot:** record payments, create accounts, add adjustments (see Section 31, adjustment-threshold item), manage users, run backups, run ledger imports, manage school and receipt settings, or open the Auditor's Audit Review workspace. System settings are read-only only where required by the current proposal.

**AUD — Auditor**
**Can (read-only):** use one Audit Review workspace for finance/change audit evidence. The dashboard may show the approved read-only oversight summary.
**Cannot:** use separate student, billing, payment, void, notification, report, clearance, follow-up, close-out, or settings pages; create, edit, approve, send, print permits, retry notifications, run backups, or change anything.

**REG — Enrollment / Registrar**
**Can:** search permitted student identity fields only for clearance (`clearance.lookup`); view enrollment/exam clearance status with an amount-free reason; print permits for cleared periods; change their own password.
**Cannot:** browse the general student directory/profile, see amounts, payments, accounts, guardian contacts, reports, billing settings, or other finance/operations workspaces.

---

## 7. Module Summary

**Must** (build first) / **Should** / **Could** — if time is short, drop **Could** items first without asking. Do not start a **Should** item until every **Must** item passes its Definition of Done (Section 29).

| # | Module | Features | Priority |
|---|---|---|---|
| M0 | Dashboard & Navigation | Role-specific dashboard widgets; role-based sidebar; session timeout warning; access-denied page | Must |
| M1 | User Management | Login, logout, first-login password change, lockout message, session timeout, profile/change password, admin user CRUD and password reset, role assignment | Must |
| M2 | Students & Guardians | Searchable student list, student profile, add/edit student and guardian (name, grade, section, guardian name/email, relationship), email-valid indicator | Must |
| M3 | Billing Accounts | Create account wizard (student, fee schedule, plan, review), account detail (fees, schedule, payments, balance), discount/scholarship adjustments | Must |
| M4 | Payment Recording & Receipts | Record payment (fast path), server-side validation results, receipt preview/print, transaction history, payment detail, reprint (marked REPRINT) | Must |
| M5 | Void Control / Receipt Integrity | No delete; void request with reason; approval queue; VOID marking; audit trail | Must |
| M6 | Email Notifications | Notification log (sent/queued/failed with reason), retry failed, per-guardian email status | Must |
| M7 | Reports | Daily collection, monthly financial, student statement of account, outstanding balances; print and export to Excel | Must |
| M8 | Audit & Backup | Audit log viewer with filters, backup status page, "Run backup now," last restore-test date | Must |
| M9 | Settings | Fees per grade level, payment plans, clearance rules, school year/terms, receipt settings, school info | Must |
| M10 | Clearance & Exam Permit (headline) | Clearance lookup, status per student (enrollment and each exam period), printable exam permit | Should |
| M11 | Installments & Follow-up | Schedule display, Current/Due soon/Overdue status, overdue follow-up list, cashier-approved reminder batches | Should |
| M12 | Ledger Import | Upload Excel, map columns, preview, validation report, confirm, result summary | Should |
| M13 | End-of-Day Close-out | Count cash, show variance, require reason, lock day, print report, accounting sign-off | Could |
| M14 | Shareable PDF Receipt | Download a receipt as PDF for guardians who prefer Messenger | Could |

---

## 8. M0 — Dashboard & Navigation (Must)

Each role gets a different dashboard; the sidebar shows only the items that role can use. Route: `/`.

### M0.1 Dashboard widgets

| Operation | What it does | Roles |
|---|---|---|
| View cashier dashboard | Big "Record payment" button; today's collected total and payment count; failed-email count; due-soon count; reminder to submit close-out | CSH |
| View accounting dashboard | Pending void approvals; overdue total; collection trend (one chart); unsigned close-outs | ACC |
| View admin dashboard | Last backup time and result; active user count | ADM |
| View auditor dashboard | Read-only oversight summary; link to Audit Review only | AUD |
| View registrar dashboard | One large student search that opens clearance | REG |
| Quick links | Jump to the most common task for the role | all |

### M0.2 Navigation and session

| Operation | What it does | Roles |
|---|---|---|
| Role-based sidebar | Only shows allowed modules | all |
| Session timeout warning | Warns 1 minute before expiry; "Stay signed in" | all |
| Access denied page | Plain message and a button back to the dashboard | all |

**Route:** `/profile` (My profile — change own password, see own role, last login) is also available to everyone signed in.

---

## 9. M1 — User Management (Must)

### M1.1 Authentication

| Operation | What it does | Roles |
|---|---|---|
| Log in | Username and password; generic error on failure; shows "Account locked, try again in N minutes" on lockout | all |
| Log out | Ends the session | all |
| Lockout handling | After repeated failed logins the account is locked for a time; the screen shows the wait time | all (system) |
| Forced first-login password change | After account creation or admin reset, the user must set a new password with live rule checks | all |
| Session timeout | Ends the session after inactivity; redirects to login | all (system) |

Routes: `/login`, `/first-login`.

### M1.2 My profile

| Operation | What it does | Roles |
|---|---|---|
| View my profile | Name, role, last login | all |
| Change my password | Requires the current password; live rule checks | all |
| Edit my name/username | **Not allowed** (admin only) | - |

### M1.3 User administration

| Operation | What it does | Roles |
|---|---|---|
| List and search users | Search by name or username; filter by role and active state; ADM cannot see the protected Super Admin account | SAD, ADM |
| Create user | Full name, username, role; system creates a temporary password shown **once**; SAD may create Administrator, ADM may create approved non-privileged roles | SAD, ADM |
| Edit user | Change full name and approved role; protected bootstrap account is immutable through the application | SAD, ADM |
| Deactivate / reactivate user | Blocks or restores login; keeps all history; protected bootstrap account cannot be changed through the application | SAD, ADM |
| Reset password | Generates a new temporary password shown once; forces change at next login; protected bootstrap account cannot be reset through the application | SAD, ADM |
| Delete user | **Not allowed.** Use Deactivate so audit history stays linked to the user | - |
| View role matrix | Read-only reference of Section 6 | SAD, ADM |

**Rules:** the initial Super Admin is created only by the trusted console bootstrap and is protected from application-based changes; no public Super Admin registration or later assignment is available. A regular Administrator cannot create/promote an account to Administrator or Super Admin. Accounting Officer assignment remains blocked pending MCA policy. An administrator cannot deactivate themselves or the last active Administrator.

Routes: `/admin/users` (`user.manage`), `/admin/roles` (`user.manage`).

---

## 10. M2 — Students & Guardians (Must)

Registrar (`REG`) is **limited**: name, LRN, grade and section, and clearance status only.

### M2.1 Student records

| Operation | What it does | Roles |
|---|---|---|
| List and search students | Search by name or LRN; filter by grade, section, status | CSH, ACC (finance context only) |
| View student profile | Identity and billing context needed for cashier/accounting workflows | CSH, ACC |
| Add student | LRN, name, grade, section, guardian(s); rejects duplicate LRNs | CSH |
| Edit student | Change name, grade, section, guardian links | CSH |
| Set inactive / reactivate | Marks a student as no longer enrolled; keeps all billing history | CSH |
| Delete student | **Not allowed.** Use Set inactive | - |
| Bulk add students | Through the Ledger Import wizard (M12; unavailable until U08 is approved) | - |
| Jump to Create account / Record payment | Shortcuts on the profile | CSH |

### M2.2 Guardians

| Operation | What it does | Roles |
|---|---|---|
| View guardian details | Name, relationship, email, mobile, email status | CSH, ACC (finance workflow context) |
| Add guardian to a student | Name, relationship, email (validated), mobile (optional) | CSH |
| Edit guardian | Fix email or contact details; resets email status to "unverified" | CSH |
| Unlink guardian from student | Removes the link only; the guardian record stays | CSH |
| Flag missing or bounced email | Automatic badge on the student and guardian | system |
| Delete guardian | **Not allowed** if they have notification history; unlink instead | - |

**Routes:** `/students` and `/students/:id` (`student.view`; Cashier and Accounting, with Accounting use limited to finance context); `/students/new` and `/students/:id/edit` (`student.edit`; Cashier only). Registrar identity search is a separate amount-free clearance workflow under M10, not a general directory.

---

## 11. M3 — Billing Accounts (Must)

An account = one student for one school year: fees, plan, installment schedule, adjustments, payments.

### M3.1 Account creation (wizard)

| Operation | What it does | Roles |
|---|---|---|
| Select student | Search and pick (or add a new student inline) | CSH |
| Load fee schedule | Fees for the student's grade level load automatically | CSH |
| Remove optional fee items | Only items marked optional can be unticked; required items are locked | CSH |
| Choose payment plan | Full, semestral, quarterly, monthly, etc. as configured | CSH |
| Preview installment schedule | Shows due dates and amounts before saving | CSH |
| Review and create | Confirm dialog; creates the account and schedule | CSH |
| Duplicate account guard | Blocks a second account for the same student and school year | CSH (system) |

### M3.2 Account viewing

| Operation | What it does | Roles |
|---|---|---|
| List and search accounts | Filter by school year, grade, status (Current, Due soon, Overdue, Paid) | CSH, ACC |
| View account detail | Total, paid, balance, status; fee items; schedule; payments; adjustments; activity | CSH, ACC |
| View installment schedule | Each row: due date, amount, paid, status | CSH, ACC |
| Edit account fees after creation | **Not allowed** except through adjustments | - |
| Delete account | **Not allowed** | - |

### M3.3 Adjustments (discounts, scholarships, corrections)

| Operation | What it does | Roles |
|---|---|---|
| Add adjustment | Type (discount, scholarship, correction), amount, required reason; recalculates balance and schedule | CSH |
| View adjustments | List with who added it and when | CSH, ACC |
| Reverse an adjustment | Adds an opposite **correction** entry with a reason | CSH |
| Edit / delete adjustment | **Not allowed** | - |

See Section 31 for the open question on whether large adjustments need Accounting Officer approval.

### M3.4 Status

| Operation | What it does | Roles |
|---|---|---|
| Auto-compute status | System sets Paid, Current, Due soon, or Overdue from the schedule | system |
| Show status badge | Icon plus text on lists and details | all with account access |

**Routes:** `/accounts` (`account.view`), `/accounts/new` (`account.create`, 4-step wizard matching M3.1), `/accounts/:id` (`account.view`; Actions: Record payment, Add adjustment (cashier)). See also Flow F2 in Section 23.

---

## 12. M4 — Payments & Receipts (Must)

### M4.1 Record payment

| Operation | What it does | Roles |
|---|---|---|
| Search student | Type name or number; Enter picks the first match | CSH |
| View balance and next due installment | Shown before entry | CSH |
| Enter amount | "Pay next installment" shortcut fills the amount | CSH |
| Choose method | Cash only | CSH |
| Enter reference number | Required for any method except Cash | CSH |
| Set payment date | Defaults to today; back-dating requires a reason; future dates blocked | CSH |
| Add note | Optional free text | CSH |
| Live validation | Blocks overpayment; hard-blocks duplicate reference; warns on same student and amount within 10 minutes (needs tick and reason) | CSH (system) |
| Confirm and save | Confirm dialog repeats student, amount, method, new balance; saves | CSH |
| Retry safety | Client sends a stable `Idempotency-Key` for one payment intent; an identical retry returns the original successful response and must not create another payment or receipt. Reusing the key for a different validated request returns HTTP 409. | CSH (system) |
| Post-save actions | Receipt preview with Print and Done; toast about the email; returns to a fresh form | CSH |

### M4.2 Transaction history

| Operation | What it does | Roles |
|---|---|---|
| List and search payments | Filter by date range, cashier, method, status (valid, void pending, voided), student | ACC; CSH (own by default) |
| View payment detail | Amount, allocation across installments, receipt number, recorded by, email status, audit trail | CSH, ACC |
| View own void-request status | See only requests submitted by the signed-in Cashier | CSH |
| Export to Excel | Exports the current filtered list | ACC; CSH (own) |
| Edit payment | **Not allowed** | - |
| Delete payment | **Not allowed.** Use Void (M5) | - |

### M4.3 Receipts

| Operation | What it does | Roles |
|---|---|---|
| Generate receipt | Server assigns a sequential number automatically on save | system |
| View / print receipt | Print-styled half-page block; title and school header from settings | CSH, ACC |
| Reprint receipt | Logged, increments reprint count, prints with a "REPRINT" mark | CSH, ACC |
| Show VOID mark | Voided receipts print with "VOID" | system |
| Edit receipt number or content | **Not allowed** | - |

**Routes:** `/payments/new` (also `/payments/new?student=:id`, `payment.record` — see Flow F1, Section 23), `/payments` (`payment.view`), `/payments/:id` (`payment.view`; actions: Reprint, Request void), `/receipts/:id/print` (`payment.view`). Void decisions are available only in Accounting's `/voids` queue.

---

## 13. M5 — Void Control / Receipt Integrity (Must)

| Operation | What it does | Roles |
|---|---|---|
| Request void | Reason required (minimum 10 characters); payment shows "Void pending" | CSH |
| View pending void queue | List of requests with reason, amount, requester | ACC |
| Approve void | Payment becomes VOID, balance restored, audit entry written | ACC |
| Reject void | Requires a note; payment returns to valid | ACC |
| View void history | All requests with decision, who decided, and when | ACC; CSH sees own request status in M4.2 |
| Withdraw own void request | **Not in scope.** The cashier asks accounting to reject it | - |

**Rule:** a user cannot approve a void of a payment they recorded (Section 6.2, rule 3).

**Routes:** `/voids` (`payment.void.view`; Accounting approval queue and full history; approval actions require `payment.void.approve`). Cashier request status appears within `/payments` and is limited by the server to requests submitted by the signed-in Cashier. See also Flow F3, Section 23.

---

## 14. M6 — Email Notifications (Must)

### M6.1 Payment confirmation emails

| Operation | What it does | Roles |
|---|---|---|
| Queue confirmation email | Automatically after every confirmed payment: amount, balance, receipt number, date | system |
| Show email status on payment | Queued, Sent, Failed, or "No guardian email" | CSH, ACC |
| Keep payment if email fails | Payment is always saved; failure goes to the log | system |

### M6.2 Notification log

| Operation | What it does | Roles |
|---|---|---|
| List and filter | By status (Sent, Queued, Failed), date, student | CSH, ACC (combined follow-up workspace) |
| View entry | Recipient, type, attempts, failure reason | CSH, ACC (combined follow-up workspace) |
| Retry failed email | Cashier capability only; disabled until an approved delivery worker and retry contract exist (U04) | CSH |
| Delete log entry | **Not allowed** | - |

### M6.3 Guardian email health

| Operation | What it does | Roles |
|---|---|---|
| See students with missing or bounced email | Filter in the follow-up workspace | CSH, ACC |
| Fix email address | Through Edit guardian (M2.2) | CSH |

### M6.4 Reminder template

| Operation | What it does | Roles |
|---|---|---|
| View or edit template | Template ownership and delivery settings remain unavailable pending U04 provider and policy approval | - |

(Sending the reminders themselves is in M11.)

**Route:** `/followup?view=notifications` (`notification.view`; legacy `/notifications` redirects here for Cashier and Accounting). Retry remains unavailable under U04; the `notification.retry` capability belongs to Cashier only.

---

## 15. M7 — Reports (Must)

Every report supports **print** and **export to Excel** unless stated otherwise.

### M7.1 Daily collection

| Operation | What it does | Roles |
|---|---|---|
| Pick date and view | Totals by method and by cashier; list of payments; voids shown separately | ACC |
| Print / export | Print view and Excel file | ACC |

### M7.2 Monthly financial

| Operation | What it does | Roles |
|---|---|---|
| Pick month and view | Collections by fee category and grade level; total collected vs. billed | ACC |
| Print / export | Print view and Excel file | ACC |

### M7.3 Outstanding balances

| Operation | What it does | Roles |
|---|---|---|
| Filter and view | By grade, section, minimum balance, overdue only | ACC |
| Print / export | Print view and Excel file | ACC |

### M7.4 Student statement of account

| Operation | What it does | Roles |
|---|---|---|
| View statement | One student's fees, schedule, payments, balance | ACC |
| Print statement | Handed to a guardian who has no email | ACC |
| Export | Excel file | ACC |

**Routes:** `/reports` (report hub, `report.view`), `/reports/daily`, `/reports/monthly`, `/reports/outstanding`, `/reports/student/:id` (all `report.view`). Accounting owns the report and statement workspace; Cashier sees own transactions and daily totals in the existing transaction and close-out workspaces, without a standalone report or statement page.

---

## 16. M8 — Audit & Backup (Must)

### M8.1 Audit log

| Operation | What it does | Roles |
|---|---|---|
| View finance/change audit | By user, action, date, entity; before/after change detail | SAD (governance oversight), AUD (single Audit Review workspace) |
| View authentication/account-administration security events | By user, action, and date | SAD, ADM (separate Security Events workspace) |
| Edit or delete entries | **Not allowed** | - |
| Write entries | Automatic on every data change and every login, void, reprint, permit print | system |

### M8.2 Backup and recovery

| Operation | What it does | Roles |
|---|---|---|
| View backup status | Last backup time and result; list of recent backups | SAD (dashboard summary), ADM |
| Run backup now | Starts a manual backup | ADM |
| View last restore-test date | Reminder to test recovery | ADM |
| View restore instructions | Plain step-by-step text | ADM |
| Perform restore | Done outside the app by the admin using the instructions | - |
| Nightly automatic backup | Scheduled on the server | system |

**Routes:** `/admin/audit-log` (Administrator `security.events.view`; Super Admin and Auditor `audit.view`), `/admin/security-events` (Super Admin `security.events.view`), `/admin/backup` (`backup.manage`, Administrator only).

---

## 17. M9 — Settings (Must)

Access follows Section 6.4: Administrator manages system settings; Accounting manages finance settings and reads required system configuration. Auditor uses Audit Review only. Cashier and Registrar have no settings workspace.

### M9.1 Fee schedules (per school year and grade level)

| Operation | What it does | Roles |
|---|---|---|
| View fee schedules | List by school year and grade level | ACC |
| Add fee item | Name, category (tuition, miscellaneous, other), amount, required or optional | ACC |
| Edit fee item | Changes apply to **new accounts only**; existing accounts keep their fees | ACC |
| Deactivate fee item | Hides it from new accounts; history kept | ACC |
| Delete fee item | **Not allowed** once used; deactivate instead | - |
| Copy schedule to next school year `NEW` (Could) | Duplicates a grade level's fees so they can be adjusted | ACC |

### M9.2 Payment plans

| Operation | What it does | Roles |
|---|---|---|
| View plans | Name, installments, down payment | ACC |
| Add plan | Name, down payment (amount or percent), installment labels and due dates or offsets | ACC |
| Edit plan | Applies to **new accounts only** | ACC |
| Preview schedule | Shows the schedule for a sample total | ACC |
| Deactivate plan | Hides from new accounts | ACC |
| Delete plan | **Not allowed** once used | - |

Editing a fee item or plan applying to new accounts only requires a **versioning rule on the backend** so existing accounts keep the terms they were created under.

### M9.3 Clearance rules

| Operation | What it does | Roles |
|---|---|---|
| View rules | One enrollment rule and one rule per exam period | ACC |
| Add / edit rule | E.g., minimum down payment for enrollment; installments paid through the exam start date | ACC |
| Plain-language preview | Shows the rule in a sentence | ACC |
| Test with a student | Shows what status that student would get | ACC |
| Deactivate rule | Stops applying it | ACC |

### M9.4 School year, terms, and lists

| Operation | What it does | Roles |
|---|---|---|
| Create school year | Label; set as current | ADM |
| Add / edit terms and exam periods | Names and start dates | ADM |
| Manage grade levels and sections | Add, rename, deactivate | ADM |
| Manage payment methods | Add, rename, deactivate | ADM |
| View lists | Read-only | ACC |

### M9.5 Receipt settings

| Operation | What it does | Roles |
|---|---|---|
| Edit school name and address | Shown on receipts and reports | ADM |
| Set receipt title | "Official Receipt" or "Acknowledgment Receipt" | ADM |
| Set paper size | Letter or A4 | ADM |
| View next receipt number | Read-only once the first receipt exists | ADM |

### M9.6 Email settings

| Operation | What it does | Roles |
|---|---|---|
| Edit sender name and address | Used for all outgoing email | ADM |
| Set daily send limit | Protects free email limits | ADM |
| Send test email | Checks the connection | ADM |

**Routes:** `/settings/fees`, `/settings/plans`, `/settings/clearance-rules` (`settings.finance`; Accounting only), `/settings/school`, `/settings/receipt`, `/settings/email` (`settings.system`; Administrator manages and Accounting reads). Auditor has no settings routes.

---

## 18. M10 — Clearance & Exam Permit (Should, headline feature)

Statuses are computed by the server from the rules in M9.3 and recomputed after every payment, void, or adjustment.

### M10.1 Clearance lookup

| Operation | What it does | Roles |
|---|---|---|
| Search student | Large search box; identity fields only | REG |
| View enrollment clearance | Cleared or Not cleared with an amount-free reason | REG |
| View exam period clearance | One row per exam period with status and amount-free reason | REG |
| Reason detail | Does not disclose balance or payment amounts | REG |
| Filter students by clearance on the student list | Removed from standalone student-list navigation | - |

### M10.2 Exam permit

| Operation | What it does | Roles |
|---|---|---|
| Print exam permit | Available only for a cleared period; opens a print-styled slip | REG |
| Explain why not | Button disabled with the reason if not cleared | REG |
| Log each print | Every print is written to the audit log | system |
| Edit permit content | **Not allowed** | - |

**Routes:** `/clearance` (`clearance.view` — Registrar's clearance workspace, reached from the dashboard's limited identity search); `/api/clearance/students` (`clearance.lookup`); `/permits/:studentId/:examPeriodId/print` (`permit.print`). All clearance reasons are amount-free. See also Flow F4, Section 23.

---

## 19. M11 — Installments & Follow-up (Should)

### M11.1 Schedule and status

| Operation | What it does | Roles |
|---|---|---|
| Show installment schedule | Inside account detail (M3.2) | CSH, ACC |
| Auto-apply payments to oldest installment | Spills into the next installment | system |
| Auto-mark Paid, Current, Due soon, Overdue | Due soon window default 7 days | system |

### M11.2 Overdue follow-up list

| Operation | What it does | Roles |
|---|---|---|
| View overdue and due-soon accounts | Student, guardian contact, amount overdue, days overdue, last reminder date | CSH, ACC |
| Filter and sort | By grade, section, days overdue, amount | CSH, ACC |

### M11.3 Reminder batches

| Operation | What it does | Roles |
|---|---|---|
| Select accounts | Checkbox selection | CSH, ACC |
| Review batch | Recipients, missing-email warnings, message preview, remaining daily send limit | CSH, ACC |
| Confirm and send | Queues the emails; rows show "Reminder sent today" | CSH, ACC |
| Automatic sending with no approval | **Not allowed** | - |

**Route:** `/followup` (`followup.view`, send via `followup.send`). See also Flow F5, Section 23.

---

## 20. M12 — Ledger Import (Should)

Nothing is saved until the final confirm.

| Operation | What it does | Roles |
|---|---|---|
| Upload, map, preview, validate, and commit | Unavailable; import authority and annual rollover policy must be approved under U08 | - |
| Undo a committed import | **Not in scope.** Corrections are made through normal edit and adjustment operations | - |

**Route:** `/import` (`import.run`). See also Flow F7, Section 23.

---

## 21. M13 — End-of-Day Close-out (Could)

| Operation | What it does | Roles |
|---|---|---|
| View system totals for today | By method, for the signed-in cashier | CSH |
| Enter counted cash | Amount counted in the drawer | CSH |
| See variance | Counted cash minus system cash total, live | CSH |
| Enter variance reason | Required when the variance is not zero | CSH |
| Submit close-out | Confirm dialog; locks the day for that cashier | CSH |
| Print summary | Print-styled close-out report | CSH, ACC |
| View history | List by date with variance and sign-off status | ACC; CSH (own) |
| Sign off | Accounting confirms the close-out | ACC |
| Reopen a locked day | **Not in scope** | - |

**Routes:** `/closeout` (`closeout.submit`), `/closeout/history` (`closeout.view`; ACC sees a "Sign off" button on each unsigned entry). See also Flow F6, Section 23.

---

## 22. M14 — Shareable PDF Receipt (Could)

| Operation | What it does | Roles |
|---|---|---|
| Download receipt as PDF | For guardians who prefer Messenger; carries the same number and VOID/REPRINT marks | CSH, ACC |
| Track downloads | Written to the audit log | system |

---

## 23. Screens, Routes, and Key Flows

Route guard = the capability required (Section 6.4). "Shell" = sidebar + header layout; the sidebar shows only the items a role can use.

### 23.1 Public and system routes

| Route | Screen | Notes |
|---|---|---|
| `/login` | Login | Username + password. Generic error on failure. Shows lockout wait time (M1.1). |
| `/first-login` | Set new password | Forced after admin reset or first login; password rules shown live. |
| `/403`, `/404` | Error pages | Plain message and a "Go to dashboard" button. |
| (modal) | Session timeout warning | See Section 4. |

### 23.2 Full route table

| Route | Module | Guard |
|---|---|---|
| `/` | M0 Dashboard | all (content differs by role) |
| `/profile` | M0/M1 My profile | all |
| `/students` | M2 Student list | `student.view` |
| `/students/new`, `/students/:id/edit` | M2 Student form | `student.edit` |
| `/students/:id` | M2 Student profile | `student.view` |
| `/accounts` | M3 Account list | `account.view` |
| `/accounts/new` | M3 Create account wizard | `account.create` |
| `/accounts/:id` | M3 Account detail | `account.view` |
| `/payments/new` (+ `?student=:id`) | M4 Record payment | `payment.record` |
| `/payments` | M4 Transaction history | `payment.view` |
| `/payments/:id` | M4 Payment detail | `payment.view` |
| `/receipts/:id/print` | M4 Receipt print view | `payment.view` |
| `/voids` | M5 Void approval queue | `payment.void.view` |
| `/followup` | M11 Overdue follow-up | `followup.view` |
| `/clearance` | M10 Clearance lookup | `clearance.view` |
| `/permits/:studentId/:period/print` | M10 Exam permit print view | `permit.print` |
| `/closeout` | M13 End-of-day close-out | `closeout.submit` |
| `/closeout/history` | M13 Close-out history | `closeout.view` |
| `/reports` | M7 Report hub | `report.view` |
| `/reports/daily` | M7 Daily collection | `report.view` |
| `/reports/monthly` | M7 Monthly financial | `report.view` |
| `/reports/outstanding` | M7 Outstanding balances | `report.view` |
| `/reports/student/:id` | M7 Statement of account | `report.view` |
| `/notifications` | M6 Notification log | `notification.view` |
| `/import` | M12 Ledger import wizard | `import.run` |
| `/settings/fees` | M9 Fee schedules | `settings.finance` |
| `/settings/plans` | M9 Payment plans | `settings.finance` |
| `/settings/clearance-rules` | M9 Clearance rules | `settings.finance` |
| `/settings/school` | M9 School year and terms | `settings.system` |
| `/settings/receipt` | M9 Receipt settings | `settings.system` |
| `/settings/email` | M9 Email settings | `settings.system` |
| `/admin/users` | M1 Users | `user.manage` |
| `/admin/roles` | M1 Role matrix | `user.manage` |
| `/admin/audit-log` | M8 Audit log | `audit.view` |
| `/admin/backup` | M8 Backup and recovery | `backup.manage` |

### 23.3 Key user flows

Each flow must have a Playwright test against the mock adapter.

**F1. Record a payment** (the most-used flow; target under 2 minutes)
1. Cashier clicks **Record payment** (dashboard) or opens from a student profile.
2. Search field is focused; typing a name or LRN shows results; Enter selects the first match.
3. The screen shows the student, current balance, and the next due installment with its amount.
4. Cashier enters an amount (a "Pay next installment" shortcut fills it), picks a method, enters a reference if not cash.
5. Live validation shows: overpayment block, duplicate warnings, missing reference.
6. Submit opens a confirm dialog: student, amount, method, new balance after payment.
7. On confirm: receipt preview appears with **Print** and **Done**; a toast says the email was queued (or that the guardian has no email).
8. Done returns to a fresh Record payment screen (cashiers process many in a row).

Errors to handle: network/API failure (keep the form, show retry), duplicate reference, overpayment, session expired.

**F2. Create a billing account at enrollment**
Student search (or create student inline) → fees load for the grade level → optional items and adjustments → choose plan → schedule preview → review → create → account detail with a **Record down payment** button.

**F3. Void a payment**
Cashier opens payment → Request void → reason (required, min 10 characters) → status "Void pending." Accounting sees it in `/voids` → approve or reject with note → payment shows VOID, balance updated, audit log entry. The cashier who requested it cannot approve it.

**F4. Check clearance and print an exam permit**
Registrar (or cashier) opens `/clearance` → searches student → sees Enrollment and each exam-period status with a reason **appropriate to the viewer's role** (an amount for CSH/ACC/AUD/ADM, no amount for REG) → for a cleared period, clicks **Print exam permit** → print view → browser print dialog. For a not-cleared period the button is disabled with the reason.

**F5. Overdue follow-up**
Cashier or accounting opens `/followup` → filters → selects rows → **Send reminder emails** → review dialog (recipients, missing emails flagged, message preview) → confirm → rows show "Reminder sent today."

**F6. End-of-day close-out**
Cashier opens `/closeout` → sees system totals by method → enters counted cash → variance appears → adds reason if needed → confirm → day locks and a printable summary opens. Accounting later signs off from history.

**F7. Import an existing ledger**
Upload `.xlsx` or `.csv` → map spreadsheet columns to fields (auto-suggest by header name; the user can correct) → preview table with row-level warnings and errors and a summary → fix the file and re-upload, or continue with valid rows only → final confirm → result screen (created, skipped, with a downloadable error report). Nothing is saved before the final confirm.

**F8. First login and password change**
Admin creates a user → shows a temporary password once → user logs in → forced to `/first-login` → sets a new password (rules shown live) → lands on the dashboard for their role.

---

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
  amount: number; balanceAfter?: number | null; method: string; reference?: string; paidOn: string; recordedBy: string; recordedAt: string;
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
22. **Payment retry safety:** every payment create request requires a user-scoped idempotency key bound to its validated request payload. A same-key/same-payload retry returns the original successful response; same-key/different-payload reuse is rejected with HTTP 409. Payment, allocation, receipt, queued notification records, audit entry, balance-after snapshot and successful idempotency response commit atomically.
23. **Temporary password access:** an account marked `mustChangePassword` may read its authenticated identity, sign out, and change its password only. Other protected APIs return HTTP 423 until the authenticated password-change endpoint confirms the update.

---

## 26. Printing Requirements

Receipts, exam permits, statements, and reports print on the school's ordinary office printers (no thermal printer). Use dedicated print routes/components with `@media print` styles: hide app chrome, black-and-white friendly, page size from a CSS variable (default **Letter, 8.5×11 in**; paper size is a setting because the school may use A4, see M9.5). The receipt is designed as a **half-page block at the top of the sheet** so it can be cut.

Print/export surfaces defined elsewhere in this document:
- Receipt print/reprint, with VOID and REPRINT marks (M4.3).
- Exam permit print, logged on every print (M10.2).
- Student statement of account print, for guardians without email (M7.4).
- Daily collection, monthly financial, and outstanding-balance reports — print and export to Excel (M7.1–M7.3).
- Overdue follow-up list print (M11.2).
- End-of-day close-out summary print (M13).
- Shareable PDF receipt as a download alternative to printing (M14).

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

## 28. Technical Architecture / Frontend Conventions

### 28.1 Folder structure

```
src/
  api/            # types.ts, client.ts (http), mock/ (in-memory adapter + seed), index.ts (chooses by VITE_API_MODE=mock|http)
  auth/           # session, RequireAuth, can() permission helper, roles
  components/     # ui/ (buttons, inputs, dialog, table, badge, toast), layout/ (Shell, Sidebar, Header)
  features/
    dashboard/ students/ accounts/ payments/ voids/ followup/
    clearance/ closeout/ reports/ notifications/ import/
    settings/ admin/ receipts/
  lib/            # money.ts, dates.ts, schedule.ts, clearance.ts (pure, unit-tested)
  i18n/en.ts
  routes.tsx
  main.tsx
DECISIONS.md      # every assumption or spec gap you resolved
```

Keep data fetching in hooks (`useStudents`, `useRecordPayment`, ...) so components stay presentational.

### 28.2 API contract (for the mock adapter and typed client)

Base path `/api`. JSON. Cookie session (Laravel Sanctum style). Lists accept `?page=&perPage=&q=&sort=` and return `{ data: T[], meta: { page, perPage, total } }`. Errors return `{ message: string, errors?: Record<string, string[]> }` with HTTP 401, 403, 404, 409, 422, 423 (locked), or 500.

```
POST /auth/login | POST /auth/logout | GET /auth/me | POST /auth/change-password
GET/POST /users | PATCH /users/:id | POST /users/:id/reset-password
GET/POST /students | GET/PATCH /students/:id | GET /students/:id/clearance
GET/POST /accounts | GET /accounts/:id | POST /accounts/:id/adjustments
GET /payments (?query=&status=&page=) | POST /payments (required `Idempotency-Key` header) | GET /payments/:id | POST /payments/:id/reprint
POST /payments/:id/void-request | GET /void-requests | POST /void-requests/:id/decision
GET /followup | POST /followup/send
GET /clearance?q= | POST /permits/:studentId/:examPeriodId/print
GET /closeouts | POST /closeouts | POST /closeouts/:id/signoff | GET /closeouts/today
GET /reports/daily | /reports/monthly | /reports/outstanding | /reports/student/:id (?format=xlsx for export)
GET /notifications | POST /notifications/:id/retry
POST /import/preview | POST /import/commit
GET/PUT /settings/fees | /settings/plans | /settings/clearance-rules | /settings/school | /settings/receipt | /settings/email
POST /settings/email/test
GET /audit-log | GET /backups | POST /backups/run
GET /dashboard (role-specific summary)
```

`src/api/index.ts` reads `VITE_API_MODE`. In `mock` mode, an in-memory store (seeded with fake data, resettable from a hidden dev menu) implements every endpoint, including the business rules in Section 25, with realistic latency (200–600 ms) and occasional failures to exercise error states.

**Seed data (fake only):** about 60 students across several grade levels, 1–2 guardians each (some with missing emails), a fee schedule per grade level, three payment plans, one school year with two terms and two exam periods, a mix of paid/current/overdue accounts, some voids, some failed notifications, and one user per role (documented in the README with dummy passwords).

---

## 29. Testing Requirements and Definition of Done

### 29.1 Build order
1. **Foundation:** project setup, Tailwind tokens, Shell layout, routing, auth + `can()`, i18n file, API types, mock adapter with seed data, `money.ts` / `dates.ts` / `schedule.ts` with unit tests.
2. **Must, part 1:** M1 (auth, users), M2 (students), M9 (settings), M3 (accounts).
3. **Must, part 2:** M4 + M5 (payments, receipts, voids), M6 (notifications), M7 (reports), M8 (audit, backup).
4. **Should:** M10 (clearance + permit), M11 (installments follow-up), M12 (import).
5. **Could:** M13 (close-out), M14 (PDF receipt).
6. **Hardening:** accessibility pass, print styles check, performance check on a throttled CPU, E2E suite for F1–F8, README.

### 29.2 A screen is done when
- It matches its row in Section 23 (route, roles, contents) and uses `can()` for guards and actions.
- Loading, empty, error, and permission-denied states exist.
- Forms use React Hook Form + Zod with messages that follow Section 4.
- It works at 1366×768 without horizontal scrolling of the page.
- Keyboard-only use works; focus is visible; contrast is AA.
- Print views print cleanly (checked with the browser's print preview).
- No hard-coded school policy, no external network requests, no `console` errors.
- Pure logic (money, allocation, status, clearance in the mock) has unit tests; the relevant flow in Section 23.3 has a Playwright test.

### 29.3 Deliverables
- Working app in `mock` mode with `npm run dev`; `npm run build`, `npm run test`, `npm run e2e` all pass.
- `README.md` (setup, modes, seed logins, folder guide), `DECISIONS.md` (every assumption), and a short `HANDOFF-TO-BACKEND.md` listing any API needs the UI discovered that are not in Section 28.2.

---

## 30. Reconciled Changes

These are the points where the two source documents differed and were merged into a single rule, using the precedence order stated at the top of this document.

1. **Student-statement role reconciliation (M7.4).** The original handoff only let cashiers see their own day's reports; the access-control breakdown adds that the fallback for guardians without email needs a cashier-printed statement. **Current role simplification:** standalone student statements and printing are assigned to Accounting; Cashier does not have a separate reports/statement page.
2. **Registrar sees clearance reasons without amounts (M10.1).** The original handoff's Flow F4 example showed "Balance due: ₱1,200.00," which contradicts the explicit privacy rule that the Registrar sees no amounts (Section 6.2, rule 5). Per the reconciliation priority (explicit privacy rule outranks a general screen example), **resolved:** reasons are role-aware — Flow F4 (Section 23.3) and M10.1 now state this explicitly, and the illustrative amount was removed from the Registrar's case.
3. **Read-only settings for ADM and AUD (M9).** The original handoff gave finance settings only to Accounting. **Current role simplification:** Administrator manages system settings only, Accounting manages finance settings and reads system configuration, and Auditor uses Audit Review only.
4. **Fee and plan edits apply to new accounts only (M9.1, M9.2).** Both sources agree; the access-control breakdown adds the requirement that this needs a versioning rule on the backend so existing accounts keep their original terms. **Resolved:** stated as Business Rule 20 (Section 25).
5. **Copy fee schedule to next school year (M9.1).** A new Could-have convenience introduced in the access-control breakdown, not present in the original handoff. **Resolved:** kept as a Could-priority operation in M9.1.
6. **"Delete" replaced by deactivate, void, or correct everywhere.** Both sources agree on the pattern (Global Rule 1, Section 6.2); it is applied consistently throughout every module's operation table. The need for final client/adviser confirmation of this policy is carried forward — see Section 31.
7. **Admin safety rules (M1.3).** Present only in the access-control breakdown (an admin cannot deactivate themselves or the last active admin). **Resolved:** carried forward as-is; no conflict with the handoff.
8. **Cashier "own" scope** for payment history and close-out history is enforced by the backend, not only the UI — stated explicitly in the access-control breakdown and consistent with the handoff's general "frontend never relies on hiding alone" rule (Section 6.2, rule 6). Daily totals appear in the Dashboard/Close-out workspaces; report pages remain Accounting-only.

---

## 31. Open Decisions and Clarifications

Only genuine unresolved items are listed here — points the two source documents could not settle between them, or that both sources explicitly flagged as needing client or adviser input.

### 31.1 Adjustment approval threshold
- **Issue:** Should a discount or scholarship adjustment above a certain amount require Accounting Officer approval before it takes effect?
- **Conflicting/incomplete information:** The access-control breakdown raises this as a consideration ("discounts and scholarships change money owed, so consider requiring accounting approval above a threshold") but explicitly marks it "not decided."
- **Current interpretation:** None adopted. As currently specified (M3.3), the Cashier can add an adjustment unilaterally, with a required reason and a full audit trail; there is no approval gate.
- **What needs confirmation:** Ask the Accounting Officer whether a threshold and approval step are required, and if so, what the threshold and approval flow should be.

### 31.2 Confirmation of the "no hard delete" policy
- **Issue:** Deactivate/void/correct is used everywhere instead of delete (Section 6.2, rule 1), but the access-control breakdown flags this global pattern as needing sign-off.
- **Current interpretation:** Applied throughout this document as the working rule, since both sources are consistent with it and no alternative is proposed anywhere in either source.
- **What needs confirmation:** Confirm this policy with the client and the academic adviser before backend implementation locks it in.

### 31.3 Items still awaiting client confirmation (carried over as configurable, not final)
These were flagged in the original handoff as assumptions to be treated as configurable, not as finished requirements. They should be built as settings/config data (never hard-coded) and each one noted in `DECISIONS.md`:
1. Grade levels, sections, and school terms — unknown; seed with samples only.
2. Fee types, payment plans, discounts, and scholarships — configurable by Accounting (M9.1–M9.2).
3. What counts as "cleared" for enrollment and exams — configurable rules (M9.3).
4. Receipt title ("Official Receipt" vs. "Acknowledgment Receipt") and paper size (Letter vs. A4) (M9.5).
5. Payment methods list — Cash only.
6. The role/capability permission matrix itself (Section 6.4) — proposal awaiting client confirmation.
7. Who may add or edit student records — current role assignment is Cashier only under Section 6.4/6.5; MCA approval of student/guardian authority and the complete mutation API contract remain pending under U02.
8. Due-soon window (default 7 days) and the duplicate-payment time window (default 10 minutes) (Section 25, rules 4–5).
9. Whether the backend uses Inertia.js or a separate REST API — default assumed here: SPA + REST (Section 28.2); components should stay presentational so either works.
