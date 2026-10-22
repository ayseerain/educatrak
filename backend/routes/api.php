<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CloseOutController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\SecurityEventController;
use App\Http\Controllers\Api\UserAdministrationController;
use App\Http\Controllers\Api\VoidRequestController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->group(function (): void {
    Route::middleware('throttle:login')->post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

        Route::get('/admin/users', [UserAdministrationController::class, 'index'])
            ->middleware('capability:users.manage');
        Route::post('/admin/users', [UserAdministrationController::class, 'store'])
            ->middleware('capability:users.manage');
        Route::patch('/admin/users/{staffUser}', [UserAdministrationController::class, 'update'])
            ->middleware('capability:users.manage');
        Route::post('/admin/users/{staffUser}/reset-password', [UserAdministrationController::class, 'resetPassword'])
            ->middleware('capability:users.manage');
        Route::get('/admin/security-events', [SecurityEventController::class, 'index'])
            ->middleware('capability:security.events.view');

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
        Route::get('/close-outs/today', [CloseOutController::class, 'today'])
            ->middleware('capability:closeout.submit');
        Route::get('/close-outs', [CloseOutController::class, 'index'])
            ->middleware('capability:closeout.view');
        Route::post('/close-outs', [CloseOutController::class, 'store'])
            ->middleware('capability:closeout.submit');
        Route::post('/close-outs/{closeOut}/sign-off', [CloseOutController::class, 'signOff'])
            ->middleware('capability:closeout.signoff');
    });
});
