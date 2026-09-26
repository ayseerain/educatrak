# Frontend Architecture

> Source-derived technical stack, environment constraints, and frontend conventions extracted from the canonical Project Specification.

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
GET /payments | POST /payments | GET /payments/:id | POST /payments/:id/reprint
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
