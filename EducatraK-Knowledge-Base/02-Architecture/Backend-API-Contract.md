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
| `GET /api/admin/users` | Optional query, role, status, sort, direction, Manila date range, page, and per-page 10/25/50 filters. | 200: `{data: StaffProfile[],meta}`; each profile has `id`, `username`, `fullName`, nullable `email`, `role`, `active`, `mustChangePassword`, nullable `lastLoginAt`. | Authenticated; `users.manage`; `UserAdministrationController::index`. Filter contract covered by `UserAdministrationTest::test_administrator_user_list_filters_ordinary_accounts_by_query_role_and_status`. |
| `POST /api/admin/users` | JSON: `username` required, max 100, alpha-dash and unique; `full_name` required, max 255; nullable unique valid `email`, max 255; `role` required enum. | 201: `{data: StaffProfile, temporaryPassword}`. The generated password is hashed at rest and returned once in this response. Validation/unique conflict: 422. | Authenticated; `users.manage`; `StoreStaffUserRequest`; audits `user.created`. Covered by `UserAdministrationTest`. |
| `PATCH /api/admin/users/{staffUser}` | Partial JSON: `full_name` string max 255; nullable valid unique `email`; `role` enum; `active` boolean. Each field is optional. | 200: `{data: StaffProfile}`. Validation and self/last-Administrator safeguards return 422 with field errors. | Authenticated; `users.manage`; `UpdateStaffUserRequest`; audits before/after profile. Ordinary update contract covered by `UserAdministrationTest::test_administrator_can_update_an_ordinary_user_contract`. |
| `POST /api/admin/users/{staffUser}/reset-password` | No body fields. | 200: `{data: StaffProfile, temporaryPassword}`; target must change it at next login. | Authenticated; `users.manage`; `UserAdministrationController::resetPassword`; audits `user.password_reset`. Covered by `UserAdministrationTest`. |
| `GET /api/admin/security-events` | Optional user, action, Manila date range, page, and per-page 10/25/50 filters. | 200: `{data: SecurityEvent[], meta: {currentPage,lastPage,total,perPage}}`; entries expose `id`, `action`, `entityType`, `entityId`, safe `details` from audit `after`, and ISO `occurredAt`. | Authenticated; `security.events.view`; `SecurityEventController::index`. Only listed authentication/user actions are returned. Safe-field and pagination contracts are covered by `UserAdministrationTest`. |

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
| Finance settings | `GET /api/settings/finance/fees`, `/plans`; `POST /api/settings/finance/fees/{feeSchedule}/items`; `PATCH /api/settings/finance/fee-items/{feeItem}`; `POST .../deactivate`; `POST /api/settings/finance/plans`; `PATCH /api/settings/finance/plans/{paymentPlan}`; `POST .../plans/{paymentPlan}/deactivate`, `/preview` (W1b) | `settings.finance.view/manage`. |
| System settings (W1a, W1c) | `GET,PATCH /api/settings/system`; `GET,POST /api/settings/school-years`; `PATCH /api/settings/school-years/{schoolYear}`; `POST .../{schoolYear}/make-current`, `/terms`; `PATCH /api/settings/terms/{term}`; `POST /api/settings/terms/{term}/exam-periods`; `PATCH /api/settings/exam-periods/{examPeriod}`; `GET,POST /api/settings/grade-levels`; `PATCH /api/settings/grade-levels/{gradeLevel}`; `POST .../{gradeLevel}/sections`; `PATCH /api/settings/sections/{section}` | Reads `settings.system.view` (Administrator, Accounting); writes `settings.system.manage` (Administrator). |
| Reports | `GET /api/reports/daily`, `/outstanding`, `/students/{student}/statement` | `reports.view`; role capability map controls access. |
| Students/accounts | `GET,POST /api/students`; `GET /api/student-record-options`; `GET,PATCH /api/students/{student}`; `GET,POST /api/billing-accounts`; `POST /api/billing-accounts/preview` (W2); `GET /api/billing-accounts/{billingAccount}`; `POST /api/billing-accounts/{billingAccount}/adjustments` | Student view/manage and account view/manage capabilities. No student import route. |
| Payments/voids | `GET /api/payment-students`, `/api/payment-students/{student}/context`, `/api/payments`, `/api/payments/{payment}`; `POST /api/payments`, `/api/payments/{payment}/reprint`, `/api/payments/{payment}/void-requests`; `GET /api/void-requests`; `PATCH /api/void-requests/{voidRequest}` | Payment record/view, receipt reprint and void request/approval capabilities. |
| Close-outs | `GET /api/close-outs`, `/today`; `POST /api/close-outs`, `/api/close-outs/{closeOut}/sign-off`; `GET,POST,DELETE /api/close-outs/business-date` | View/submit/sign-off capabilities. Business-date simulator is a real route, protect from production exposure through deployment configuration/review. |

Laravel current error response remains `{message}` and validation `{message,errors}`. The owner confirmed retaining this shape. A shared `code/request_id` envelope remains unapproved. Test evidence is distributed among `backend/tests/Feature/` (authentication, user administration, audit, backup, student, billing, finance, payments/close-out, notifications, reports and dashboard); no new tests were run in this docs-only pass.

The 65 named MockDB function exports in `api.ts`, `selectors.ts`, `store.ts`, `seed.ts`, and `integrity.ts` are client-side operations, not 65 network endpoints. `reset()`, `snapshot()`, raw seed, developer latency/error/empty switches, date simulation, and derived selectors do not create routes. Server routes cover the listed business operations; student masterlist import has no backend endpoint. Its staged UI does not authorize import implementation. LRN database hardening and any installed-record correction remain separate approval items.

### Owner answers and open contract questions

| Question | Answer | Why / evidence |
|---|---|---|
| Session idle/renewal/warning | Owner policy: 30 minutes idle; activity renews; warn at 1 minute. | Direct owner confirmation, recorded in `06-Decisions/2026-11-09-backend-part-1b-owner-decisions.md`. Laravel's default, example, and test configuration were aligned to 30 minutes on 2026-11-10; browser renewal/warning acceptance remains separate. |
| Error response envelope | Retain current Laravel `{message}` and validation `{message,errors}`. | Owner confirmation; changing envelope requires separate approval. |
| Audit contents and retention | Keep required evidence, minimize sensitive snapshots; retention undecided. | Owner confirmation; specific snapshot allowlist and retention durations remain open. |
| Deployment topology/TLS | Unverified; follow-up. | No deployment host evidence supplied. |
| Guardian access and ownership | Open; recommendation only. | Existing data model has guardian links; accountable role/lifecycle not approved. |
| Adjustment threshold | Open; recommendation only. | Current implementation requires reason/audits; no threshold decision. |
| Super Admin lifecycle | Open; recommendation only. | Implementation is not MCA policy approval. |
| No-current-year dashboard | Open; recommendation only. | Current fallback behavior requires owner decision before being treated as policy. |
| Global no-hard-delete sign-off | Open; recommendation only. | Preserve existing financial/audit evidence; client-wide policy confirmation open. |
| Live student identifier | Current schema/API uses unique 12-digit text `lrn`; ordinary student updates must retain the stored value. | `backend/database/migrations/2026_10_09_062757_create_educatrak_reference_and_people_tables.php`; `backend/app/Http/Requests/UpsertStudentRequest.php`. Existing-environment backfill and any dedicated LRN-correction workflow remain separate approval items. |

### Known boundaries and follow-up

The current branch contains route families absent from the Part 1 snapshot; this reconciles the current API description only. The route-by-route ledger below records handler validation and named test evidence. Some response fields and audit assertions remain summarized or lack direct tests, so this is not a generated client contract. Review mock/backend differences against dated decisions before frontend integration. No endpoint was added or changed in this task.

## Part 1b route-by-route reconciliation (51 routes)

The following ledger expands the grouped inventory above into one row per
registered route. Inputs and outputs are summarized from the named action;
where an action has no dedicated Form Request, its controller is the source
for query/body handling. Middleware and capability are from
`backend/routes/api.php`; common framework errors are 401/403/404/419/422/500,
with 429 for throttled login. Mutations use `AuditLogger` only where the action
does so; do not infer audit coverage from HTTP method. Test references name
the corresponding feature-test family; absent dedicated coverage is marked
for follow-up rather than implied.

| # | Method and path | Input contract / response | Access / action / audit / test evidence |
|---:|---|---|---|
| 1 | `POST /api/webhooks/twilio/messages/{notificationLog}` | Twilio form fields `AccountSid`, `MessageSid`, `MessageStatus`; valid `X-Twilio-Signature`; returns `{ok:true}`. Invalid signature/account/SID returns 403; wrong channel/kind returns 404. | `web` (no Sanctum); `ReminderDeliveryController::twilioStatus`. `FollowUpTest::test_cashier_can_queue_idempotent_email_and_twilio_reminders_and_delivery_callback_confirms_sms`, `::test_invalid_twilio_delivery_signature_is_rejected`. |
| 2 | `POST /api/auth/login` | `LoginRequest`: required `username` string max 100; required `password` string max 255; optional boolean `remember`. 200 `{data: profile}`; invalid credentials 422 `{message}`; inactive account 403 `{message}`. | `throttle:login`; `AuthController::login`; success/failure audit. `AuthenticationTest::test_user_can_log_in_and_read_their_profile`, `::test_inactive_user_cannot_log_in`, `::test_failed_login_is_audited_without_a_password`, `::test_login_rate_limit_returns_retry_after_after_repeated_failures`. |
| 3 | `GET /api/auth/me` | No input; 200 `{data: profile}` with `id`, `username`, `fullName`, `role`, `active`, `isProtected`, `mustChangePassword`, `lastLoginAt`, `capabilities`. | `auth:sanctum`, `active.user`; `AuthController::me`; `AuthenticationTest::test_user_can_log_in_and_read_their_profile`. |
| 4 | `POST /api/auth/logout` | No body; 204 empty. | Auth + active; `AuthController::logout`; `auth.logout` audit. `AuthenticationTest::test_authenticated_user_can_logout_through_the_session_guard`. |
| 5 | `POST /api/auth/change-password` | Required `current_password` checked against web guard; required string password min 12 with matching `password_confirmation`; 200 `{data: profile}`. | Auth + active; `ChangePasswordRequest`; `auth.change_password` audit. `AuthenticationTest::test_password_change_accepts_the_server_minimum_without_undocumented_character_class_rules`, `::test_temporary_password_users_are_limited_to_session_and_password_change_until_updated`. |
| 6 | `GET /api/dashboard` | Optional `range` in `today`, `last_7_days`, `last_30_days`, `school_year` (default `last_7_days`); 200 `{data: role-specific summary}`. | Auth + active + password changed; `dashboard.view`; `DashboardController::show`. `DashboardTest::test_cashier_dashboard_uses_own_payments_and_current_school_year_accounts`, `::test_accounting_auditor_and_administrator_summaries_match_their_approved_widgets`, `::test_administrator_backup_widget_handles_missing_and_unknown_results`, `::test_super_admin_dashboard_shows_governance_status_without_financial_fields`, `::test_registrar_receives_a_limited_dashboard_and_unknown_ranges_are_rejected`, `::test_date_ranges_use_inclusive_manila_calendar_day_boundaries`. |
| 7 | `GET /api/admin/users` | Optional `query` max 120; `role`; `status` active/inactive/archived; `sort` name/created_at; `direction` asc/desc; `date_from`, `date_to`; `page`; `per_page` 10/25/50 (default 10). Returns `{data,meta}`. | Capability `users.manage`; `UserAdministrationController::index`. `UserAdministrationTest::test_administrator_user_list_filters_ordinary_accounts_by_query_role_and_status` covers the direct list-filter contract. |
| 8 | `POST /api/admin/users` | Required username max 100/pattern/unique, `full_name` max 255, role enum with actor-based restrictions; nullable unique valid email max 255. 201 `{data: profile,temporaryPassword}`. | `users.manage`; `user.created` audit. `UserAdministrationTest::test_administrator_can_create_a_staff_account_with_a_one_time_temporary_password`, `::test_administrator_cannot_create_or_promote_an_accounting_officer_without_approved_assignment_policy`, `::test_super_admin_can_create_administrators_but_cannot_enter_payment_workflows`. |
| 9 | `PATCH /api/admin/users/{staffUser}` | Optional `full_name` max 255, nullable valid unique `email`, actor-restricted role enum, boolean `active`; 200 `{data: profile}`. | `users.manage`; before/after audit; protected/self/last-admin safeguards. `UserAdministrationTest::test_administrator_can_update_an_ordinary_user_contract` covers the ordinary update response/persistence/audit contract. |
| 10 | `POST /api/admin/users/{staffUser}/archive` | No body; 200 `{data: profile}`; self, protected, already archived, last-admin cases reject. | `users.manage`; `user.archived` before/after audit. `UserAdministrationTest::test_administrator_can_archive_and_restore_an_account_during_the_configured_retention_period`, `::test_archiving_protects_super_admin_self_and_last_active_administrator`. |
| 11 | `POST /api/admin/users/{staffUser}/restore` | No body; 200 `{data: profile}`; archived account must still be inside restore period. | `users.manage`; `user.restored` audit. `UserAdministrationTest::test_administrator_can_archive_and_restore_an_account_during_the_configured_retention_period`, `::test_expired_archives_are_anonymized_without_deleting_linked_audit_history`. |
| 12 | `POST /api/admin/users/{staffUser}/reset-password` | No body; 200 `{data: profile,temporaryPassword}`; target must change it on next login. | `users.manage`; `user.password_reset` audit. `UserAdministrationTest::test_administrator_can_reset_a_password_and_must_require_a_change`, `::test_archived_account_password_cannot_be_reset_without_restoring_it`. |
| 13 | `GET /api/admin/security-events` | Optional `user`, `action` (max 120), Manila date range, `page`, `per_page` 10/25/50 (default 10); returns `{data,meta}` with safe event fields. | `security.events.view`; `SecurityEventController::index`. `UserAdministrationTest::test_administrator_security_log_returns_account_identity_and_excludes_password_fields`, `::test_security_log_rejects_nested_values_in_safe_metadata_fields`, `::test_administrator_security_log_filters_by_user_action_and_manila_date`, and `::test_administrator_security_log_paginates_the_safe_event_contract`. |
| 14 | `GET /api/audit-log` | Optional user/action/entity type/entity id filters; Manila date range; `page`, `per_page` 10/25/50. Returns `{data,meta}`; before/after detail keys are allowlisted. | `audit.view`; `AuditLogController::index`. `AuditLogReadTest::test_auditor_and_super_admin_can_read_filtered_finance_audit_entries`, `::test_audit_date_filters_and_pagination_metadata_are_returned`. |
| 15 | `GET /api/backups` | No query inputs; 200 `{data:[{id,result,sizeBytes,error,completedAt}]}` newest first. | `backup.manage`; `BackupController::index`; read listing only. `BackupReadTest::test_administrator_can_view_backup_history_in_reverse_completion_order`, `::test_non_administrators_cannot_view_backup_history`. |
| 16 | `GET /api/notifications` | Optional status (`queued/sent/failed/not_sent`), Manila date range, student text, page, per_page (10/25/50; default 10); returns `{data,meta}`. | `notification.view`; `NotificationLogController::index`. `NotificationLogReadTest::test_approved_roles_can_filter_persisted_notification_attempts_and_registrar_cannot`. |
| 17 | `GET /api/follow-up` | Optional status (`due_soon/overdue`), grade, section, search, sort (`due_date/amount_due/days_overdue`), direction, page, per_page (10/25/50); `{data,meta}`. | `followup.view`; `FollowUpController::index`. `FollowUpTest::test_follow_up_lists_only_unpaid_due_soon_and_overdue_installments_with_contact_details`, `::test_follow_up_endpoint_is_limited_to_cashier_and_accounting`. |
| 18 | `POST /api/follow-up/reminders` | Requires enabled delivery; UUID idempotency_key; 1–50 distinct existing installment_ids; channels array email/sms. Returns 202 `{data,summary}`. | `followup.manage`; reminder status audit. `FollowUpTest::test_reminder_sending_is_denied_for_roles_without_follow_up_management_capability`, `::test_reminder_sending_and_retry_are_unavailable_until_delivery_policy_is_approved`, `::test_cashier_can_queue_idempotent_email_and_twilio_reminders_and_delivery_callback_confirms_sms`. |
| 19 | `POST /api/notifications/{notificationLog}/retry` | No body; eligible reminder only; 202 `{data: notification result}`. | `notification.retry`; `reminder.retried` audit. `FollowUpTest::test_reminder_sending_and_retry_are_unavailable_until_delivery_policy_is_approved`, `::test_cashier_can_queue_idempotent_email_and_twilio_reminders_and_delivery_callback_confirms_sms`. |
| 20 | `GET /api/settings/finance/fees` | No query; 200 `{data:[schedule with items]}`; item fields id/name/category/amountCents/required/active/version. | `settings.finance.view`; `FinanceSettingsController::feeSchedules`. `FinanceSettingsReadTest::test_approved_roles_can_read_persisted_fee_schedules_and_payment_plans`, `::test_cashier_and_registrar_cannot_read_finance_settings`. |
| 21 | `GET /api/settings/finance/plans` | No query; 200 `{data:[plan with installment definitions]}`. | `settings.finance.view`; `FinanceSettingsController::paymentPlans`; same two `FinanceSettingsReadTest` methods as route 20. |
| 22 | `POST /api/settings/finance/fees/{feeSchedule}/items` | Required name max 120, category tuition/miscellaneous/other, amount_cents integer >=0, required boolean; optional apply_to_all boolean; 201 with item and actual `updatedAccountCount`. For every selected schedule, the new fee is copied to all existing accounts using that schedule, one unpaid installment is added, total due/balance increase by the fee amount, and the existing installment/account statuses are immediately recalculated. | `settings.finance.manage`; fee-item audit. `FinanceSettingsMutationTest::test_accounting_synchronizes_new_fees_while_preserving_existing_account_fee_snapshots_on_revision`, `::test_fee_addition_recalculates_a_paid_account_and_same_day_installment_status`, `::test_only_accounting_can_mutate_fee_items_and_input_uses_the_approved_categories`, `::test_accounting_can_apply_new_and_revised_fees_to_all_grade_schedules_without_duplicates`. |
| 23 | `PATCH /api/settings/finance/fee-items/{feeItem}` | Same required fee fields and optional apply_to_all; returns revised item/version and actual `updatedAccountCount`. Existing account-item snapshots remain unchanged for a revision. With `apply_to_all`, a schedule missing the prior fee receives the newly created fee, same account/installment synchronization, and immediate status recalculation; schedules already carrying the fee only receive a versioned revision. | `settings.finance.manage`; before/after audit. `FinanceSettingsMutationTest::test_accounting_synchronizes_new_fees_while_preserving_existing_account_fee_snapshots_on_revision`, `::test_fee_addition_recalculates_a_paid_account_and_same_day_installment_status`, `::test_accounting_can_apply_new_and_revised_fees_to_all_grade_schedules_without_duplicates`, `::test_all_grade_revision_synchronizes_a_fee_to_existing_accounts_only_for_schedules_missing_it`, `::test_only_accounting_can_mutate_fee_items_and_input_uses_the_approved_categories`. |
| 24 | `POST /api/settings/finance/fee-items/{feeItem}/deactivate` | No body; returns item; already inactive returns 409. | `settings.finance.manage`; before/after audit. `FinanceSettingsMutationTest::test_accounting_can_deactivate_an_active_fee_item_contract`. |
| 25 | `GET /api/reports/daily` | Optional Manila date (Y-m-d), page, void_page, per_page 10/25/50; defaults to today and 10. | `reports.view`; `DailyReportController::show`. `DailyReportTest::test_cashier_has_no_standalone_daily_report_access`, `::test_daily_report_uses_persisted_records_for_accounting_only`. |
| 26 | `GET /api/reports/outstanding` | Optional grade, section, minimum/maximum balance cents, overdue_only boolean, page, per_page 10/25/50; max below min returns 422. | `reports.view`; cashiers also denied in action. `OutstandingReportTest::test_current_year_outstanding_report_applies_grade_section_minimum_and_overdue_filters`. |
| 27 | `GET /api/reports/students/{student}/statement` | No query/body; current-year statement; 404 `{message}` when no current-year account. | `reports.view`; `StudentStatementController::show`. `DailyReportTest::test_accounting_student_statement_returns_only_the_current_account_contract`. |
| 28 | `GET /api/students` | Optional query max 120, grade, section, status enrolled/inactive, page, per_page 10/25/50; financial fields vary by capability. | `students.view`. `StudentAccessTest::test_registrar_can_list_the_student_directory_with_financial_context`, `::test_only_student_roles_can_open_the_student_directory`, `::test_registrar_student_search_returns_financial_context_without_guardians`, `::test_accounting_can_read_student_list_with_active_year_balance_field`, `::test_student_list_financial_field_boundary_is_enforced_for_all_six_roles`. |
| 29 | `POST /api/students` | Required 12-digit `lrn`, full_name, grade_level_id, section_id, status; optional guardian_name/relationship/email/mobile with cross-field rules; section must belong to grade. Returns 201. For a new guardian, the server writes the validated relationship both to the link and the required legacy column in the same transaction as the student and audit record. | `students.manage`; student.created audit. `StudentAccessTest::test_registrar_returns_422_for_invalid_lrn_formats` proves nonnumeric, short, and long values are rejected; `::test_registrar_accepts_a_twelve_digit_lrn_with_leading_zeroes` proves string preservation. Guardian persistence/rollback is covered by `::test_registrar_creates_a_guardian_with_compatibility_and_link_relationships` and `::test_student_creation_is_rolled_back_when_audit_recording_fails`. |
| 30 | `GET /api/student-record-options` | No inputs; active grades and sections for student form. | `students.manage`; `StudentController::recordOptions`. `StudentAccessTest::test_registrar_can_read_active_student_record_options_contract`. |
| 31 | `GET /api/students/{student}` | No inputs; student detail; guardian/current-balance fields capability-dependent. | `students.view`. `StudentAccessTest::test_approved_roles_receive_guardian_contact_details_on_student_profile`, `::test_registrar_can_open_student_profiles_with_guardian_and_financial_context`. |
| 32 | `PATCH /api/students/{student}` | Same required full `UpsertStudentRequest` fields as create, not partial; submitted `lrn` must equal the stored value. Returns updated student. Guardian relationship changes update the student–guardian link and preserve an existing guardian-wide legacy value. | `students.manage`; student.updated before/after audit. `StudentAccessTest::test_student_update_changes_the_link_relationship_without_overwriting_legacy_relationship`, `::test_registrar_can_create_and_update_a_student_while_cashier_cannot`. |
| 33 | `GET /api/billing-accounts` | Optional query, school_year, school_year_id, scope current/all, grade, status current/due_soon/overdue/paid, minimum/maximum balance cents, page, per_page 10/25/50; `{data,meta}`. | `accounts.view`. `BillingAccountReadTest::test_finance_reader_roles_can_view_billing_accounts_and_registrar_cannot`, `::test_billing_account_list_filters_by_minimum_and_maximum_balance`. |
| 34 | `GET /api/billing-accounts/{billingAccount}` | No inputs; account, student, school year, fee items, installments, payments, adjustments and activity. | `accounts.view`. `BillingAccountReadTest::test_account_detail_returns_fees_schedule_and_payment_history`, `::test_account_activity_combines_its_records_and_payment_audit_events_only`. |
| 35 | `POST /api/billing-accounts/{billingAccount}/adjustments` | Required type discount/scholarship/correction, nonzero integer amount_cents, reason 10–1000 chars; returns 201 adjustment. | `accounts.manage`; adjustment.created audit with before/after balances. `CashierOperationsTest::test_cashier_can_create_a_billing_adjustment_contract` covers the direct creation contract. Threshold remains open. |
| 36 | `GET /api/payment-students` | Optional free-text query (no explicit validation/length cap); returns up to 10 students and current account balance. | `payments.record`. `CashierOperationsTest::test_payment_entry_student_lookup_and_billing_context_are_cashier_only`. |
| 37 | `GET /api/payment-students/{student}/context` | No inputs; current payment-entry context and due items. | `payments.record`; same CashierOperations test as route 36. |
| 38 | `GET /api/payments` | Optional query max 100, status valid/void_pending/voided, date range, cashier, method, amount min/max cents, page, per_page 10/25/50; `{data,meta}`. | `payments.view`; cashiers scoped to own rows. `CashierOperationsTest::test_payment_history_is_available_to_finance_readers_and_cashiers_remain_scoped`, `::test_payment_history_filters_by_date_cashier_method_status_and_student_search`. |
| 39 | `POST /api/payments` | Idempotency-Key required, max 100 with allowed `A-Za-z0-9._:-`; billing_account_id; positive amount_cents; paid_on not future; past date requires backdate_reason; optional duplicate_override_reason, notes, notification_channels email/sms. | `payments.record`; transactional allocation/receipt and audit. `CashierOperationsTest::test_cashier_can_record_a_cash_payment_with_oldest_first_allocation_and_receipt`, `::test_cashier_payment_is_rejected_when_it_exceeds_the_account_balance`, `::test_same_student_and_amount_within_ten_minutes_requires_an_override_reason`, `::test_repeating_a_payment_with_the_same_idempotency_key_replays_one_receipt`, `::test_idempotency_key_cannot_be_reused_for_a_different_payment`, `::test_payment_submission_requires_an_idempotency_key`. |
| 40 | `GET /api/payments/{payment}` | No inputs; payment, receipt, allocations and notification history. | `payments.view`; cashier ownership check. `CashierOperationsTest::test_payment_detail_keeps_its_balance_after_snapshot_when_later_payments_post`. |
| 41 | `POST /api/payments/{payment}/reprint` | No body; receipt print metadata/count; cashier may reprint own payment only. | `receipts.reprint`; audit evidence. `CashierOperationsTest::test_first_receipt_print_does_not_count_as_a_reprint_but_later_prints_do`. |
| 42 | `POST /api/payments/{payment}/void-requests` | Required reason string 10–1000 chars; returns 201 void request; cashier restricted to own payment. | `void.request`; payment.void_requested audit. `CashierOperationsTest::test_accounting_approval_voids_the_payment_and_restores_the_billing_balance`, `::test_cashier_void_request_history_is_own_scoped_while_accounting_sees_all_requests`, `BillingStatusSynchronizationTest::test_payment_and_void_recalculate_installment_and_account_statuses_using_the_configured_window`. |
| 43 | `GET /api/void-requests` | No query inputs; all for finance roles, caller-owned for cashier. | `void.view`. `CashierOperationsTest::test_cashier_void_request_history_is_own_scoped_while_accounting_sees_all_requests`. |
| 44 | `PATCH /api/void-requests/{voidRequest}` | Required decision approved/rejected and decision_note 1–1000 chars; updated request. | `void.approve`; payment-state audit. `CashierOperationsTest::test_accounting_approval_voids_the_payment_and_restores_the_billing_balance`, `BillingStatusSynchronizationTest::test_payment_and_void_recalculate_installment_and_account_statuses_using_the_configured_window`. |
| 45 | `GET /api/close-outs/today` | No inputs; business date, `system_cash_cents` for cash-drawer variance, `system_totals` keyed by recorded payment method, and close-out state. | `closeout.submit`. `CashierOperationsTest::test_cashier_can_submit_only_one_daily_close_out_and_non_zero_variance_needs_a_reason`, `::test_cashier_close_out_returns_system_totals_by_payment_method_while_variance_uses_cash_only`. |
| 46 | `GET /api/close-outs/business-date` | No inputs; simulation state/current time; restricted to local/testing environments. | `closeout.submit`. `CashierOperationsTest::test_business_date_simulator_uses_date_matched_fictional_payments_and_preserves_locks_and_sign_off`, `::test_business_date_simulator_is_rejected_outside_local_or_testing`. |
| 47 | `POST /api/close-outs/business-date` | Required `business_datetime` with `Y-m-dTH:i` format; returns simulation state. | `closeout.submit`; same two simulator tests as route 46. |
| 48 | `DELETE /api/close-outs/business-date` | No body; restores real business date and returns simulation state. | `closeout.submit`; same two simulator tests as route 46. |
| 49 | `GET /api/close-outs` | No query inputs; sorted by business date/id; cashier sees own entries. Each row retains the submitted `system_cash_cents` and `system_totals` method snapshot. | `closeout.view`. `CashierOperationsTest::test_cashier_close_out_history_is_limited_to_their_own_records`. |
| 50 | `POST /api/close-outs` | Required counted_cash_cents integer >=0; optional variance_reason string 10–1000; returns 201 close-out with the submitted `system_cash_cents` and `system_totals` method snapshot. | `closeout.submit`; closeout.submitted audit. `CashierOperationsTest::test_cashier_can_submit_only_one_daily_close_out_and_non_zero_variance_needs_a_reason`, `::test_cashier_close_out_returns_system_totals_by_payment_method_while_variance_uses_cash_only`. |
| 51 | `POST /api/close-outs/{closeOut}/sign-off` | No body; signed-off close-out; repeated sign-off returns 422 `{message}`. | `closeout.signoff`; closeout.signed_off audit. No direct sign-off test identified; simulator preservation assertion is indirect. |
| 52 | `GET /api/settings/school-years` | No query; years with `current`, `startsOn`, `endsOn`, derived `datesLocked`, terms and exam periods. | `settings.system.view`. `SchoolStructureSettingsTest::test_terms_and_exam_periods_can_be_added_and_edited`, `::test_only_administrator_manages_and_accounting_only_reads_school_structure`. |
| 53 | `POST /api/settings/school-years` | Required label max 40 (case-insensitive unique), `starts_on` and `ends_on` (Y-m-d, end after start, no overlap). The first year ever created becomes current. 201. | `settings.system.manage`; `school_year.created` audit in the same transaction. `::test_administrator_creates_school_years_and_the_first_becomes_current`, `::test_school_year_validation_rejects_bad_order_overlap_and_duplicate_labels`, `::test_school_year_creation_rolls_back_when_audit_recording_fails`. |
| 54 | `PATCH /api/settings/school-years/{schoolYear}` | Optional label, `starts_on`, `ends_on`. Dates return 422 once any billing account exists for the year; label stays editable. | `settings.system.manage`; before/after audit. `::test_dates_lock_once_a_billing_account_exists_but_labels_stay_editable`. |
| 55 | `POST /api/settings/school-years/{schoolYear}/make-current` | Required reason 10–1000 chars. Locks all years and switches the one current year; 409 if the year is already current. | `settings.system.manage`; `school_year.current_changed` audit with before/after and reason. `::test_make_current_requires_a_reason_and_keeps_exactly_one_current_year`, `::test_make_current_rolls_back_when_audit_recording_fails`. |
| 56–57 | `POST /api/settings/school-years/{schoolYear}/terms`, `PATCH /api/settings/terms/{term}` | name max 120, sequence 1–65535 (unique per year), optional dates (end after start). Dates lock with the year. | `settings.system.manage`; audit. `::test_terms_and_exam_periods_can_be_added_and_edited`, `::test_dates_lock_once_a_billing_account_exists_but_labels_stay_editable`. |
| 58–59 | `POST /api/settings/terms/{term}/exam-periods`, `PATCH /api/settings/exam-periods/{examPeriod}` | name, required `starts_on`, optional `ends_on` after start. No clearance or permit logic. | `settings.system.manage`; audit. `::test_terms_and_exam_periods_can_be_added_and_edited`. |
| 60–64 | `GET,POST /api/settings/grade-levels`, `PATCH /api/settings/grade-levels/{gradeLevel}`, `POST /api/settings/grade-levels/{gradeLevel}/sections`, `PATCH /api/settings/sections/{section}` | Grade name (unique) and sort order (unique), active; section name unique per grade, active. Add, rename, activate and deactivate only; no delete. | Read `settings.system.view`; write `settings.system.manage`; audit. `::test_grade_levels_and_sections_can_be_added_renamed_and_deactivated`. |
| 65 | `POST /api/settings/finance/plans` | name max 120 (case-insensitive unique across versions), `down_payment_type` amount\|percent, `down_payment_value` int ≥0 (basis points ≤10000 if percent), `installments[]` {label, `due_day_offset` 0–65535, `percent_of_remaining_basis_points` 1–10000} summing to 10000. 201 version 1. | `settings.finance.manage`; audit. `PaymentPlanSettingsTest::test_accounting_creates_a_plan_and_previews_an_exact_centavo_schedule`, `::test_plan_validation_rejects_bad_percentages_and_duplicate_names`. |
| 66 | `PATCH /api/settings/finance/plans/{paymentPlan}` | Same body. Creates version N+1 with `previousVersionId` and deactivates the old version, which existing accounts keep. 409 for an inactive or superseded version. | `settings.finance.manage`; before/after audit. `::test_revision_creates_a_new_version_and_existing_accounts_keep_their_plan_and_installments`, `::test_plan_revision_rolls_back_when_audit_recording_fails`. |
| 67 | `POST /api/settings/finance/plans/{paymentPlan}/deactivate` | No body; 409 if already inactive. No delete route; DB RESTRICT blocks deleting a used plan. | `settings.finance.manage`; audit. Same revision test; `::test_used_plans_cannot_be_deleted_at_the_database_level`. |
| 68 | `POST /api/settings/finance/plans/{paymentPlan}/preview` | Required `total_cents` ≥1. Rows {label, sequence, dueDayOffset, dueDate (today Manila + offset), amountCents}. The down payment is due on the anchor; floor per row; remainder on the last; zero rows omitted. | `settings.finance.view`. `::test_accounting_creates_a_plan_and_previews_an_exact_centavo_schedule`, `::test_only_accounting_manages_plans`. |
| 69–70 | `GET,PATCH /api/settings/system` | Partial PATCH: `school_name` ≤160, `school_address` ≤500, `receipt_title` Official Receipt\|Acknowledgment Receipt, `paper_size` Letter\|A4, `email_sender_name` ≤120, `email_sender_address` email, `email_daily_send_limit` int ≥0. `next_receipt_number` and `next_receipt_sequence` are read-only (422 if sent). Absent keys return null. | GET `settings.system.view`; PATCH `settings.system.manage`; changed-keys audit. `SystemSettingsTest` (4 tests). Test email and payment methods are BLOCKED. |
| 71 | `POST /api/billing-accounts` | Required `student_id`, `school_year_id`, `payment_plan_id`; optional `excluded_fee_item_ids[]`. The student must be enrolled with a grade; the year must be current; the plan must be active; exactly one active fee schedule must exist for (year, grade). Only optional active items may be removed. One account per student and year. Total ≥1. 201 with the detail shape of route 34. | `accounts.manage`; `billing_account.created` audit in the same transaction. `BillingAccountCreationTest::test_cashier_creates_an_account_with_fee_snapshots_and_an_exact_installment_schedule`, `::test_optional_fees_are_included_unless_removed_and_rounding_lands_on_the_last_installment`, `::test_duplicate_account_and_invalid_fee_removals_are_rejected`, `::test_inactive_student_non_current_year_inactive_plan_and_ambiguous_schedules_are_rejected`, `::test_account_creation_rolls_back_when_audit_recording_fails`, `::test_only_cashier_can_create_or_preview_accounts`, `::test_a_payment_can_be_recorded_against_a_new_account`. |
| 72 | `POST /api/billing-accounts/preview` | Same body and rules as route 71; returns items, `totalDueCents` and installments without writing. | `accounts.manage`. `::test_preview_returns_the_schedule_without_writing`. |

**Evidence quality note:** this ledger reflects current validation,
serialization, audit calls, and named test evidence. A named test may assert
only part of a route contract; rows identify known gaps. This is not generated
OpenAPI, and some controller response objects remain summarized rather than
field-enumerated. Do not use it for client code generation.

## MockDB exported function inventory (65 functions)

Every row names a function export, its source line, operational class, and
server-route relationship. These are in-process client operations, not HTTP
endpoints. The line numbers are current source evidence and should be refreshed
if these files move.

| Source | Export and line | Class | Server route / gap |
|---|---|---|---|
| `frontend/src/api/mock/api.ts` | `mockApiDelay` L18 | latency/test helper | None; no route. |
| `frontend/src/api/mock/api.ts` | `listMockStudents` L28 | read adapter | `GET /api/students` analogous domain read; mock-only. |
| `frontend/src/api/mock/api.ts` | `listMockBillingAccounts` L32 | read adapter | `GET /api/billing-accounts` analogous domain read; mock-only. |
| `frontend/src/api/mock/api.ts` | `listMockPayments` L36 | read adapter | `GET /api/payments` analogous domain read; mock-only. |
| `frontend/src/api/mock/selectors.ts` | `getMockGradeLevels` L171 | selector | Finance/student option APIs overlap only; mock-only. |
| `frontend/src/api/mock/selectors.ts` | `selectBillingAccounts` L241 | selector | `GET /api/billing-accounts` analogous read. |
| `frontend/src/api/mock/selectors.ts` | `selectMockFollowUpAccounts` L277 | selector | `GET /api/follow-up` analogous read. |
| `frontend/src/api/mock/selectors.ts` | `selectStudents` L306 | selector | `GET /api/students` analogous read. |
| `frontend/src/api/mock/selectors.ts` | `selectPayments` L321 | selector | `GET /api/payments` analogous read. |
| `frontend/src/api/mock/selectors.ts` | `getStudentById` L354 | selector | `GET /api/students/{student}` analogous read. |
| `frontend/src/api/mock/selectors.ts` | `getBillingAccount` L358 | selector | `GET /api/billing-accounts/{billingAccount}` analogous read. |
| `frontend/src/api/mock/selectors.ts` | `getStudentBillingAccounts` L362 | selector | Billing-account reads; no exact route parameterized by student. |
| `frontend/src/api/mock/selectors.ts` | `getCurrentBillingAccount` L366 | selector | Billing-account reads; mock-derived current record. |
| `frontend/src/api/mock/selectors.ts` | `getRenewalSchoolYears` L372 | selector | No exact route; no renewal-specific endpoint. |
| `frontend/src/api/mock/selectors.ts` | `getSuggestedRenewalSchoolYear` L381 | selector | No exact route; mock-only suggestion. |
| `frontend/src/api/mock/selectors.ts` | `getMockFeeSchedule` L389 | selector | `GET /api/settings/finance/fees` analogous read. |
| `frontend/src/api/mock/selectors.ts` | `createMockFeeItem` L396 | mutator | `POST /api/settings/finance/fees/{feeSchedule}/items` analogous. |
| `frontend/src/api/mock/selectors.ts` | `updateMockFeeItem` L440 | mutator | `PATCH /api/settings/finance/fee-items/{feeItem}` analogous. |
| `frontend/src/api/mock/selectors.ts` | `archiveMockFeeItem` L483 | mutator | Deactivation endpoint analogous; archive semantics differ. |
| `frontend/src/api/mock/selectors.ts` | `createMockGradeLevel` L495 | mutator | No corresponding grade-level management route. |
| `frontend/src/api/mock/selectors.ts` | `updateMockGradeLevel` L508 | mutator | No corresponding grade-level management route. |
| `frontend/src/api/mock/selectors.ts` | `archiveMockGradeLevel` L534 | mutator | No corresponding grade-level management route. |
| `frontend/src/api/mock/selectors.ts` | `createMockSchoolYear` L548 | mutator | No corresponding school-year management route. |
| `frontend/src/api/mock/selectors.ts` | `getMockPaymentPlans` L567 | selector | `GET /api/settings/finance/plans` analogous read. |
| `frontend/src/api/mock/selectors.ts` | `previewMockInstallmentSchedule` L595 | derived calculator | Payment-plan read only; no preview endpoint. |
| `frontend/src/api/mock/selectors.ts` | `getPaymentsForStudent` L599 | selector | `GET /api/payments` analogous read; no student filter guarantee. |
| `frontend/src/api/mock/selectors.ts` | `getMockPayment` L603 | selector | `GET /api/payments/{payment}` analogous read. |
| `frontend/src/api/mock/selectors.ts` | `getDueInstallments` L607 | selector | Payment context/account detail analogous; no exact endpoint. |
| `frontend/src/api/mock/selectors.ts` | `getNextDueRecord` L613 | selector | Payment context analogous; mock-derived. |
| `frontend/src/api/mock/selectors.ts` | `getMockGuardianContact` L619 | selector | Student read may contain contact; no dedicated guardian endpoint. |
| `frontend/src/api/mock/selectors.ts` | `selectMockNotificationRows` L626 | selector | `GET /api/notifications` analogous read. |
| `frontend/src/api/mock/selectors.ts` | `selectMockStaffUsers` L640 | selector | `GET /api/admin/users` analogous read. |
| `frontend/src/api/mock/selectors.ts` | `createMockStaffUser` L649 | mutator | `POST /api/admin/users` analogous. |
| `frontend/src/api/mock/selectors.ts` | `updateMockStaffUser` L670 | mutator | `PATCH /api/admin/users/{staffUser}` analogous. |
| `frontend/src/api/mock/selectors.ts` | `archiveMockStaffUser` L685 | mutator | `POST /api/admin/users/{staffUser}/archive` analogous. |
| `frontend/src/api/mock/selectors.ts` | `restoreMockStaffUser` L704 | mutator | `POST /api/admin/users/{staffUser}/restore` analogous. |
| `frontend/src/api/mock/selectors.ts` | `createMockStudent` L718 | mutator | `POST /api/students` analogous. |
| `frontend/src/api/mock/selectors.ts` | `updateMockStudent` L741 | mutator | `PATCH /api/students/{student}` analogous. |
| `frontend/src/api/mock/selectors.ts` | `createMockBillingAccount` L782 | mutator | No account-create route; backend account provisioning is elsewhere. |
| `frontend/src/api/mock/selectors.ts` | `requestMockVoid` L825 | mutator | `POST /api/payments/{payment}/void-requests` analogous. |
| `frontend/src/api/mock/selectors.ts` | `decideMockVoid` L836 | mutator | `PATCH /api/void-requests/{voidRequest}` analogous. |
| `frontend/src/api/mock/selectors.ts` | `mockSystemCashTotal` L848 | derived calculator | Used by close-out flow; no exact total endpoint. |
| `frontend/src/api/mock/selectors.ts` | `selectMockCloseOuts` L855 | selector | `GET /api/close-outs` analogous read. |
| `frontend/src/api/mock/selectors.ts` | `recordMockCloseOut` L860 | mutator | `POST /api/close-outs` analogous. |
| `frontend/src/api/mock/selectors.ts` | `reopenMockCloseOutForNewDay` L876 | mutator/helper | `GET /api/close-outs/today` supplies context; no reopen endpoint. |
| `frontend/src/api/mock/selectors.ts` | `signOffMockCloseOut` L896 | mutator | `POST /api/close-outs/{closeOut}/sign-off` analogous. |
| `frontend/src/api/mock/selectors.ts` | `recordMockBillingPayment` L906 | mutator | `POST /api/payments` analogous. |
| `frontend/src/api/mock/store.ts` | `getMockState` L55 | store primitive | No HTTP route. |
| `frontend/src/api/mock/store.ts` | `getMockToday` L59 | store/date primitive | No HTTP route; simulated date support is separately exposed. |
| `frontend/src/api/mock/store.ts` | `getMockBusinessDateTime` L69 | store/date primitive | `GET /api/close-outs/business-date` analogous. |
| `frontend/src/api/mock/store.ts` | `getMockSimulatedDateTime` L73 | store/date primitive | Simulator state helper; no direct endpoint. |
| `frontend/src/api/mock/store.ts` | `simulateMockBusinessDateTime` L77 | mutator | `POST /api/close-outs/business-date` analogous. |
| `frontend/src/api/mock/store.ts` | `restoreMockBusinessDateTime` L84 | mutator | `DELETE /api/close-outs/business-date` analogous. |
| `frontend/src/api/mock/store.ts` | `replaceMockState` L90 | store primitive | No HTTP route. |
| `frontend/src/api/mock/store.ts` | `updateMockState` L96 | store primitive | No HTTP route. |
| `frontend/src/api/mock/store.ts` | `setMockToday` L102 | mutator/date primitive | No exact route; mock-only current date. |
| `frontend/src/api/mock/store.ts` | `resetMockStore` L111 | test/development primitive | No HTTP route. |
| `frontend/src/api/mock/store.ts` | `mockSnapshot` L119 | store snapshot primitive | No HTTP route. |
| `frontend/src/api/mock/store.ts` | `loadMockSnapshot` L123 | store snapshot primitive | No HTTP route. |
| `frontend/src/api/mock/store.ts` | `subscribeToMockState` L127 | store subscription | No HTTP route. |
| `frontend/src/api/mock/seed.ts` | `resolveRelativeDate` L37 | seed/date helper | No HTTP route. |
| `frontend/src/api/mock/seed.ts` | `seedMockDatabase` L47 | seed primitive | No HTTP route. |
| `frontend/src/api/mock/seed.ts` | `defaultMockToday` L75 | seed/date helper | No HTTP route. |
| `frontend/src/api/mock/integrity.ts` | `mockIntegrityErrors` L24 | integrity checker | No HTTP route. |
| `frontend/src/api/mock/integrity.ts` | `assertMockIntegrity` L109 | integrity assertion | No HTTP route. |

The separate exported constant `rawMockDatabase` in `seed.ts` is not a
function and is excluded from the 65-function count.

> **W1a–W2 update — Friday, November 20, 2026 — 01:05:12 +08:00:** Routes 52–72 were added on `feature/backend-completion`. `php artisan route:list --path=api --except-vendor` reports **72 routes**. Account creation is no longer absent. Error shapes remain `{message}` / `{message,errors}`.
