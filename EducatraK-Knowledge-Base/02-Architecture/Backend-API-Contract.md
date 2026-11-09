# Backend API Contract — current feature/backend-foundation snapshot

> Current evidence is in the 2026-11-09 reconciliation section. The original nine-route inventory below is retained as historical Part 1 evidence at `ae6fcee9d9edc6f592ce4e18611f995c0f00e458`; it is superseded by the current 51-route inventory below.

## Status and scope

This is a descriptive contract for the owner-selected branch snapshot at
`ae6fcee9d9edc6f592ce4e18611f995c0f00e458`. It records the nine API routes
registered by `backend/routes/api.php` and verified with
`php artisan route:list --path=api --except-vendor`.

It is not approval for new endpoints or a statement that the API is complete.
This branch is 57 commits behind `main`; it contains only the initial auth and
user-administration API surface. Routes and requirements on `main` are not
silently imported into this branch.

## Shared behavior

- Routes use the unversioned `/api` prefix. No `/api/v1` route exists.
- `routes/api.php` wraps routes in Laravel's `web` middleware. Stateful
  Sanctum auth uses a session cookie; authenticated routes also use
  `auth:sanctum`. Obtain the CSRF cookie from Sanctum's
  `/sanctum/csrf-cookie` endpoint before state-changing browser requests.
- `bootstrap/app.php` enables `statefulApi()`, forces JSON rendering for
  `api/*`, and registers `/up` as the framework health route. There is no
  `/api/health` route.
- JSON validation failures use Laravel's `message` and `errors` structure
  (422). Unauthenticated requests return 401; capability denial returns 403.
  Login also returns 422 for invalid credentials and 403 for an inactive
  account. Login throttling can return 429. No shared application error
  envelope or request ID is implemented.
- Stored timestamps use the configured `Asia/Manila` timezone. Money fields
  are outside the current route surface.
- Roles currently defined in `App\UserRole`: `admin`, `cashier`,
  `accounting`, `auditor`, `registrar`. Do not infer that this branch's
  role map reflects later approvals.
- Login attempts are limited to five per minute, keyed by lowercased username
  and IP (`AppServiceProvider`). No general API rate limiter was found.

## Route inventory

| Method and path | Request | Response | Access and evidence |
|---|---|---|---|
| `POST /api/auth/login` | JSON: `username` (required string, max 100), `password` (required string, max 255). | 200: `{data: profile}`; profile has `id`, `username`, `fullName`, `role`, `active`, `mustChangePassword`, nullable `lastLoginAt`, and `capabilities`. Invalid credentials: 422 `{message}`; inactive user: 403 `{message}`; validation: 422; throttle: 429. | Public, `throttle:login`; `AuthController::login`, `LoginRequest`; audits success and failed attempts. Covered by `AuthenticationTest`. |
| `GET /api/auth/me` | No body. | 200: `{data: profile}`, same profile fields as login. | Authenticated Sanctum session; `AuthController::me`. Unauthenticated: 401. Login/profile path covered by `AuthenticationTest`. |
| `POST /api/auth/logout` | No body. | 204, empty response. | Authenticated Sanctum session; `AuthController::logout`; records `auth.logout`, invalidates session, regenerates CSRF token. Unauthenticated: 401. No dedicated logout assertion found in this branch's tests. |
| `POST /api/auth/change-password` | JSON: `current_password` required and checked against `web`; `password` required, string, min 12, with matching `password_confirmation`. | 200: `{data: profile}`; validation failure: 422. | Authenticated Sanctum session; `ChangePasswordRequest`, `AuthController::changePassword`; clears `must_change_password` and records `auth.change_password`. No focused test found in this branch. |
| `GET /api/admin/users` | No body or query contract beyond framework defaults. | 200: `{data: StaffProfile[]}`; each profile has `id`, `username`, `fullName`, nullable `email`, `role`, `active`, `mustChangePassword`, nullable `lastLoginAt`. Sorted by `full_name`; no pagination. | Authenticated; `users.manage`; `UserAdministrationController::index`. Access denial covered by `UserAdministrationTest`. |
| `POST /api/admin/users` | JSON: `username` required, max 100, alpha-dash and unique; `full_name` required, max 255; nullable unique valid `email`, max 255; `role` required enum. | 201: `{data: StaffProfile, temporaryPassword}`. The generated password is hashed at rest and returned once in this response. Validation/unique conflict: 422. | Authenticated; `users.manage`; `StoreStaffUserRequest`; audits `user.created`. Covered by `UserAdministrationTest`. |
| `PATCH /api/admin/users/{staffUser}` | Partial JSON: `full_name` string max 255; nullable valid unique `email`; `role` enum; `active` boolean. Each field is optional. | 200: `{data: StaffProfile}`. Validation and self/last-Administrator safeguards return 422 with field errors. | Authenticated; `users.manage`; `UpdateStaffUserRequest`; audits before/after profile. Safeguards covered by `UserAdministrationTest`. |
| `POST /api/admin/users/{staffUser}/reset-password` | No body fields. | 200: `{data: StaffProfile, temporaryPassword}`; target must change it at next login. | Authenticated; `users.manage`; `UserAdministrationController::resetPassword`; audits `user.password_reset`. Covered by `UserAdministrationTest`. |
| `GET /api/admin/security-events` | Optional Laravel `page` query parameter; fixed page size 50. | 200: `{data: SecurityEvent[], meta: {currentPage,lastPage,total}}`; entries expose `id`, `action`, `entityType`, `entityId`, `details` from audit `after`, and ISO `occurredAt`. | Authenticated; `security.events.view`; `SecurityEventController::index`. Returns only its seven listed authentication/user actions. `UserAdministrationTest` covers role denial; no pagination/field-allowlist test found. |

All route declarations are in `backend/routes/api.php:8-25`. Controller,
request-validation, capability, and audit details are in the linked class names
above. Framework-generated 404, 419, 500, and other errors are not normalized
by an application-level API error mapper.

## Mock adapter classification

The expected `frontend/src/api/mock/` MockDB directory is absent on this
branch. The branch instead has two exported functions in
`frontend/src/api/mockAdapter.ts`:

| Export | Classification | Backend match |
|---|---|---|
| `fetchDashboardSummary` | Development/demo dashboard generator. It returns role-specific hard-coded summaries and sample activity. | No dashboard route on this branch. |
| `recordMockPayment` | Development/demo payment simulation. It delays, increments an in-memory receipt counter, and returns a posted payment. | No payment route on this branch. |

`frontend/src/api/dashboardTypes.ts` exports data types, not HTTP calls.
There are no 65 MockDB exports to classify in this snapshot. Do not turn
selectors, store primitives, test helpers, or a later branch's MockDB helpers
into public routes without a separate contract decision.

## Not implemented here

This branch has no student, fee/settings, billing-account, payment/receipt,
void, close-out, notification, report, backup, import, or audit-review API
routes. These are omissions from this branch snapshot, not proposed endpoint
shapes. In particular, the mock dashboard/payment operations have no matching
server route. The current task explicitly keeps retired clearance workflows
out of active routes; the branch's older specification still contains
clearance requirements and needs reconciliation outside this document's
approved scope.

## Contract approvals still needed

Resolve session/idle lifetime and cookie settings; whether to adopt a common
error envelope; API-wide throttling; security headers; audit snapshot privacy
and retention; deployment origin/TLS/CORS; exact production database version;
and which proposed domain routes, fields, pagination, status codes, and role
capabilities are approved. No proposed route is represented as implemented.

## 2026-11-09 reconciliation — current branch snapshot

This section supersedes the historical nine-route snapshot above for the current `feature/backend-foundation` HEAD `b4ee0e3f535e07810d87a3106268e3965029f7a4`. Part 1 itself documented `ae6fcee9d9edc6f592ce4e18611f995c0f00e458`; the intervening main refresh added the implementation now recorded here. Route inventory was verified with `php artisan route:list --path=api --except-vendor`: **51 routes**. Routes and files are read-only evidence, not new approval.

### Current route inventory

| Area | Implemented declarations | Capability / behavior evidence |
|---|---|---|
| Authentication | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/change-password` | Session Sanctum; login throttle; auth controllers/requests. |
| User/security/audit | `GET,POST /api/admin/users`; `PATCH /api/admin/users/{staffUser}`; `POST .../archive`, `/restore`, `/reset-password`; `GET /api/admin/security-events`, `/api/audit-log` | `users.manage`, `security.events.view`, `audit.view`; current code's protected-account and archive safeguards. |
| Dashboard/backup | `GET /api/dashboard`, `/api/backups` | `dashboard.view`, `backup.manage`; backup route is a read listing, not backup execution. |
| Notifications/follow-up | `GET /api/notifications`, `POST /api/notifications/{notificationLog}/retry`, `GET /api/follow-up`, `POST /api/follow-up/reminders`, `POST /api/webhooks/twilio/messages/{notificationLog}` | Notification/follow-up capabilities; webhook signature validation is in delivery implementation. |
| Finance settings | `GET /api/settings/finance/fees`, `/plans`; `POST /api/settings/finance/fees/{feeSchedule}/items`; `PATCH /api/settings/finance/fee-items/{feeItem}`; `POST .../deactivate` | `settings.finance.view/manage`. |
| Reports | `GET /api/reports/daily`, `/outstanding`, `/students/{student}/statement` | `reports.view`; role capability map controls access. |
| Students/accounts | `GET,POST /api/students`; `GET /api/student-record-options`; `GET,PATCH /api/students/{student}`; `GET /api/billing-accounts`, `/api/billing-accounts/{billingAccount}`; `POST /api/billing-accounts/{billingAccount}/adjustments` | Student view/manage and account view/manage capabilities. No student import route. |
| Payments/voids | `GET /api/payment-students`, `/api/payment-students/{student}/context`, `/api/payments`, `/api/payments/{payment}`; `POST /api/payments`, `/api/payments/{payment}/reprint`, `/api/payments/{payment}/void-requests`; `GET /api/void-requests`; `PATCH /api/void-requests/{voidRequest}` | Payment record/view, receipt reprint and void request/approval capabilities. |
| Close-outs | `GET /api/close-outs`, `/today`; `POST /api/close-outs`, `/api/close-outs/{closeOut}/sign-off`; `GET,POST,DELETE /api/close-outs/business-date` | View/submit/sign-off capabilities. Business-date simulator is a real route, protect from production exposure through deployment configuration/review. |

Laravel current error response remains `{message}` and validation `{message,errors}`. The owner confirmed retaining this shape. A shared `code/request_id` envelope remains unapproved. Test evidence is distributed among `backend/tests/Feature/` (authentication, user administration, audit, backup, student, billing, finance, payments/close-out, notifications, reports and dashboard); no new tests were run in this docs-only pass.

The 65 named MockDB function exports in `api.ts`, `selectors.ts`, `store.ts`, `seed.ts`, and `integrity.ts` are client-side operations, not 65 network endpoints. `reset()`, `snapshot()`, raw seed, developer latency/error/empty switches, date simulation, and derived selectors do not create routes. Server routes cover the listed business operations; student masterlist import has no backend endpoint. Its staged UI does not authorize import implementation. LRN is approved only for separately authorized future work.

### Owner answers and open contract questions

| Question | Answer | Why / evidence |
|---|---|---|
| Session idle/renewal/warning | Owner policy: 30 minutes idle; activity renews; warn at 1 minute. | Direct owner confirmation, recorded in `06-Decisions/2026-11-09-backend-part-1b-owner-decisions.md`. Current Laravel config default remains 120 minutes; alignment is not implemented. |
| Error response envelope | Retain current Laravel `{message}` and validation `{message,errors}`. | Owner confirmation; changing envelope requires separate approval. |
| Audit contents and retention | Keep required evidence, minimize sensitive snapshots; retention undecided. | Owner confirmation; specific snapshot allowlist and retention durations remain open. |
| Deployment topology/TLS | Unverified; follow-up. | No deployment host evidence supplied. |
| Guardian access and ownership | Open; recommendation only. | Existing data model has guardian links; accountable role/lifecycle not approved. |
| Adjustment threshold | Open; recommendation only. | Current implementation requires reason/audits; no threshold decision. |
| Super Admin lifecycle | Open; recommendation only. | Implementation is not MCA policy approval. |
| No-current-year dashboard | Open; recommendation only. | Current fallback behavior requires owner decision before being treated as policy. |
| Global no-hard-delete sign-off | Open; recommendation only. | Preserve existing financial/audit evidence; client-wide policy confirmation open. |
| Student Number to LRN | Approved for a separately authorized future change; not implemented here. | Owner confirmation; schema semantics, migration and import contract remain open. |

### Known boundaries and follow-up

The current branch contains route families absent from the Part 1 snapshot; this reconciles the current API description only. Exact per-route field/response schemas should be expanded from their Form Requests/resources as a separately scoped contract pass if needed. Current mock/backend differences must be reviewed against the dated decisions before any frontend edits. No endpoint was added or changed in this task.