# Frontend Implementation Guide

> Source-derived implementation conventions. The canonical Project Specification remains authoritative.

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
