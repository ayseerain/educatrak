<?php

use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\BillingAccountController;
use App\Http\Controllers\Api\BusinessDateSimulatorController;
use App\Http\Controllers\Api\CloseOutController;
use App\Http\Controllers\Api\DailyReportController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FinanceSettingsController;
use App\Http\Controllers\Api\FollowUpController;
use App\Http\Controllers\Api\GuardianController;
use App\Http\Controllers\Api\LedgerImportController;
use App\Http\Controllers\Api\NotificationLogController;
use App\Http\Controllers\Api\OutstandingReportController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReminderDeliveryController;
use App\Http\Controllers\Api\SchoolStructureSettingsController;
use App\Http\Controllers\Api\SecurityEventController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentStatementController;
use App\Http\Controllers\Api\SystemSettingsController;
use App\Http\Controllers\Api\UserAdministrationController;
use App\Http\Controllers\Api\VoidRequestController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->group(function (): void {
    Route::post('/webhooks/twilio/messages/{notificationLog}', [ReminderDeliveryController::class, 'twilioStatus']);
    Route::middleware('throttle:login')->post('/auth/login', [AuthController::class, 'login']);

    Route::middleware(['auth:sanctum', 'active.user'])->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

        Route::middleware('password.changed')->group(function (): void {
            Route::get('/dashboard', [DashboardController::class, 'show'])
                ->middleware('capability:dashboard.view');
            Route::get('/admin/users', [UserAdministrationController::class, 'index'])
                ->middleware('capability:users.manage');
            Route::post('/admin/users', [UserAdministrationController::class, 'store'])
                ->middleware('capability:users.manage');
            Route::patch('/admin/users/{staffUser}', [UserAdministrationController::class, 'update'])
                ->middleware('capability:users.manage');
            Route::post('/admin/users/{staffUser}/archive', [UserAdministrationController::class, 'archive'])
                ->middleware('capability:users.manage');
            Route::post('/admin/users/{staffUser}/restore', [UserAdministrationController::class, 'restore'])
                ->middleware('capability:users.manage');
            Route::post('/admin/users/{staffUser}/reset-password', [UserAdministrationController::class, 'resetPassword'])
                ->middleware('capability:users.manage');
            Route::get('/admin/security-events', [SecurityEventController::class, 'index'])
                ->middleware('capability:security.events.view');
            Route::get('/audit-log', [AuditLogController::class, 'index'])
                ->middleware('capability:audit.view');
            Route::get('/backups', [BackupController::class, 'index'])
                ->middleware('capability:backup.view');
            Route::post('/backups', [BackupController::class, 'store'])
                ->middleware('capability:backup.manage');
            Route::get('/notifications', [NotificationLogController::class, 'index'])
                ->middleware('capability:notification.view');
            Route::get('/follow-up', [FollowUpController::class, 'index'])
                ->middleware('capability:followup.view');
            Route::post('/follow-up/reminders', [ReminderDeliveryController::class, 'send'])
                ->middleware('capability:followup.manage');
            Route::post('/notifications/{notificationLog}/retry', [ReminderDeliveryController::class, 'retry'])
                ->middleware('capability:notification.retry');
            Route::get('/settings/finance/fees', [FinanceSettingsController::class, 'feeSchedules'])
                ->middleware('capability:settings.finance.view');
            Route::get('/settings/finance/plans', [FinanceSettingsController::class, 'paymentPlans'])
                ->middleware('capability:settings.finance.view');
            Route::post('/settings/finance/plans', [FinanceSettingsController::class, 'storePaymentPlan'])
                ->middleware('capability:settings.finance.manage');
            Route::patch('/settings/finance/plans/{paymentPlan}', [FinanceSettingsController::class, 'revisePaymentPlan'])
                ->middleware('capability:settings.finance.manage');
            Route::post('/settings/finance/plans/{paymentPlan}/deactivate', [FinanceSettingsController::class, 'deactivatePaymentPlan'])
                ->middleware('capability:settings.finance.manage');
            Route::post('/settings/finance/plans/{paymentPlan}/preview', [FinanceSettingsController::class, 'previewPaymentPlan'])
                ->middleware('capability:settings.finance.view');
            Route::post('/settings/finance/fees/{feeSchedule}/items', [FinanceSettingsController::class, 'storeFeeItem'])
                ->middleware('capability:settings.finance.manage');
            Route::patch('/settings/finance/fee-items/{feeItem}', [FinanceSettingsController::class, 'reviseFeeItem'])
                ->middleware('capability:settings.finance.manage');
            Route::post('/settings/finance/fee-items/{feeItem}/deactivate', [FinanceSettingsController::class, 'deactivateFeeItem'])
                ->middleware('capability:settings.finance.manage');
            Route::get('/settings/system', [SystemSettingsController::class, 'show'])
                ->middleware('capability:settings.system.view');
            Route::patch('/settings/system', [SystemSettingsController::class, 'update'])
                ->middleware('capability:settings.system.manage');
            Route::get('/settings/school-years', [SchoolStructureSettingsController::class, 'schoolYears'])
                ->middleware('capability:settings.system.view');
            Route::post('/settings/school-years', [SchoolStructureSettingsController::class, 'storeSchoolYear'])
                ->middleware('capability:settings.system.manage');
            Route::patch('/settings/school-years/{schoolYear}', [SchoolStructureSettingsController::class, 'updateSchoolYear'])
                ->middleware('capability:settings.system.manage');
            Route::post('/settings/school-years/{schoolYear}/make-current', [SchoolStructureSettingsController::class, 'makeCurrent'])
                ->middleware('capability:settings.system.manage');
            Route::post('/settings/school-years/{schoolYear}/terms', [SchoolStructureSettingsController::class, 'storeTerm'])
                ->middleware('capability:settings.system.manage');
            Route::patch('/settings/terms/{term}', [SchoolStructureSettingsController::class, 'updateTerm'])
                ->middleware('capability:settings.system.manage');
            Route::post('/settings/terms/{term}/exam-periods', [SchoolStructureSettingsController::class, 'storeExamPeriod'])
                ->middleware('capability:settings.system.manage');
            Route::patch('/settings/exam-periods/{examPeriod}', [SchoolStructureSettingsController::class, 'updateExamPeriod'])
                ->middleware('capability:settings.system.manage');
            Route::get('/settings/grade-levels', [SchoolStructureSettingsController::class, 'gradeLevels'])
                ->middleware('capability:settings.system.view');
            Route::post('/settings/grade-levels', [SchoolStructureSettingsController::class, 'storeGradeLevel'])
                ->middleware('capability:settings.system.manage');
            Route::patch('/settings/grade-levels/{gradeLevel}', [SchoolStructureSettingsController::class, 'updateGradeLevel'])
                ->middleware('capability:settings.system.manage');
            Route::post('/settings/grade-levels/{gradeLevel}/sections', [SchoolStructureSettingsController::class, 'storeSection'])
                ->middleware('capability:settings.system.manage');
            Route::patch('/settings/sections/{section}', [SchoolStructureSettingsController::class, 'updateSection'])
                ->middleware('capability:settings.system.manage');
            Route::get('/reports/daily', [DailyReportController::class, 'show'])
                ->middleware('capability:reports.view');
            Route::get('/reports/outstanding', [OutstandingReportController::class, 'index'])
                ->middleware('capability:reports.view');
            Route::get('/reports/students/{student}/statement', [StudentStatementController::class, 'show'])
                ->middleware('capability:reports.view');

            Route::get('/students', [StudentController::class, 'index'])
                ->middleware('capability:students.view');
            Route::post('/students', [StudentController::class, 'store'])
                ->middleware('capability:students.manage');
            Route::get('/student-record-options', [StudentController::class, 'recordOptions'])
                ->middleware('capability:students.manage');
            Route::get('/students/{student}', [StudentController::class, 'show'])
                ->middleware('capability:students.view');
            Route::patch('/students/{student}', [StudentController::class, 'update'])
                ->middleware('capability:students.manage');
            Route::post('/students/{student}/guardians', [GuardianController::class, 'store'])
                ->middleware('capability:guardians.manage');
            Route::post('/students/{student}/guardians/link', [GuardianController::class, 'link'])
                ->middleware('capability:guardians.manage');
            Route::patch('/students/{student}/guardians/{guardian}', [GuardianController::class, 'update'])
                ->middleware('capability:guardians.manage');
            Route::post('/students/{student}/guardians/{guardian}/make-primary', [GuardianController::class, 'makePrimary'])
                ->middleware('capability:guardians.manage');
            Route::delete('/students/{student}/guardians/{guardian}', [GuardianController::class, 'destroy'])
                ->middleware('capability:guardians.manage');
            Route::get('/billing-accounts', [BillingAccountController::class, 'index'])
                ->middleware('capability:accounts.view');
            Route::post('/billing-accounts', [BillingAccountController::class, 'store'])
                ->middleware('capability:accounts.manage');
            Route::post('/billing-accounts/preview', [BillingAccountController::class, 'preview'])
                ->middleware('capability:accounts.manage');
            Route::get('/billing-accounts/creation-options', [BillingAccountController::class, 'creationOptions'])
                ->middleware('capability:accounts.manage');
            Route::get('/billing-accounts/{billingAccount}', [BillingAccountController::class, 'show'])
                ->middleware('capability:accounts.view');
            Route::post('/billing-accounts/{billingAccount}/adjustments', [BillingAccountController::class, 'storeAdjustment'])
                ->middleware('capability:accounts.manage');

            Route::get('/payment-students', [PaymentController::class, 'searchStudents'])
                ->middleware('capability:payments.record');
            Route::get('/payment-students/{student}/context', [PaymentController::class, 'context'])
                ->middleware('capability:payments.record');
            Route::get('/payments', [PaymentController::class, 'index'])
                ->middleware('capability:payments.view');
            Route::post('/payments', [PaymentController::class, 'store'])
                ->middleware('capability:payments.record');
            Route::get('/payments/{payment}', [PaymentController::class, 'show'])
                ->middleware('capability:payments.view');
            Route::post('/payments/{payment}/reprint', [PaymentController::class, 'reprint'])
                ->middleware('capability:receipts.reprint');
            Route::post('/payments/{payment}/void-requests', [VoidRequestController::class, 'store'])
                ->middleware('capability:void.request');
            Route::get('/void-requests', [VoidRequestController::class, 'index'])
                ->middleware('capability:void.view');
            Route::patch('/void-requests/{voidRequest}', [VoidRequestController::class, 'update'])
                ->middleware('capability:void.approve');
            Route::get('/ledger-imports', [LedgerImportController::class, 'index'])
                ->middleware('capability:ledger.import.view');
            Route::post('/ledger-imports', [LedgerImportController::class, 'store'])
                ->middleware('capability:ledger.import.prepare');
            Route::get('/ledger-imports/{importBatch}', [LedgerImportController::class, 'show'])
                ->middleware('capability:ledger.import.view');
            Route::get('/ledger-imports/{importBatch}/error-report', [LedgerImportController::class, 'errorReport'])
                ->middleware('capability:ledger.import.view');
            Route::post('/ledger-imports/{importBatch}/submit', [LedgerImportController::class, 'submit'])
                ->middleware('capability:ledger.import.prepare');
            Route::post('/ledger-imports/{importBatch}/cancel', [LedgerImportController::class, 'cancel'])
                ->middleware('capability:ledger.import.prepare');
            Route::post('/ledger-imports/{importBatch}/reject', [LedgerImportController::class, 'reject'])
                ->middleware('capability:ledger.import.review');
            Route::post('/ledger-imports/{importBatch}/confirm', [LedgerImportController::class, 'confirm'])
                ->middleware('capability:ledger.import.review');
            Route::get('/close-outs/today', [CloseOutController::class, 'today'])
                ->middleware('capability:closeout.submit');
            Route::get('/close-outs/business-date', [BusinessDateSimulatorController::class, 'show'])
                ->middleware('capability:closeout.submit');
            Route::post('/close-outs/business-date', [BusinessDateSimulatorController::class, 'store'])
                ->middleware('capability:closeout.submit');
            Route::delete('/close-outs/business-date', [BusinessDateSimulatorController::class, 'destroy'])
                ->middleware('capability:closeout.submit');
            Route::get('/close-outs', [CloseOutController::class, 'index'])
                ->middleware('capability:closeout.view');
            Route::post('/close-outs', [CloseOutController::class, 'store'])
                ->middleware('capability:closeout.submit');
            Route::post('/close-outs/{closeOut}/sign-off', [CloseOutController::class, 'signOff'])
                ->middleware('capability:closeout.signoff');
        });
    });
});
