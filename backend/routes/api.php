<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SecurityEventController;
use App\Http\Controllers\Api\UserAdministrationController;
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
    });
});
