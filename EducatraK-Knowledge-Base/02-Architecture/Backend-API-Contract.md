# Backend API Contract — feature/backend-foundation snapshot

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
