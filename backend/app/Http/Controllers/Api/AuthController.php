<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use App\Services\AuditLogger;
use App\Support\CapabilityMap;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(LoginRequest $request, AuditLogger $auditLogger): JsonResponse
    {
        $credentials = $request->validated();
        $guard = Auth::guard('web');

        if (! $guard->attempt($credentials)) {
            $auditLogger->recordAuthenticationFailure(
                $request,
                $credentials['username'],
                'invalid_credentials',
            );

            return response()->json(['message' => 'The supplied credentials are invalid.'], 422);
        }

        /** @var User $user */
        $user = $guard->user();

        if (! $user->active) {
            $guard->logout();
            $auditLogger->recordAuthenticationFailure(
                $request,
                $user->username,
                'inactive_account',
                $user,
            );

            return response()->json(['message' => 'This account is inactive.'], 403);
        }

        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();
        $auditLogger->record($request, 'auth.login', $user);

        return response()->json(['data' => $this->profile($user)]);
    }

    public function logout(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $auditLogger->record($request, 'auth.logout', $request->user());
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(status: 204);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json(['data' => $this->profile($user)]);
    }

    public function changePassword(ChangePasswordRequest $request, AuditLogger $auditLogger): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->forceFill([
            'password' => $request->string('password')->value(),
            'must_change_password' => false,
        ])->save();
        $auditLogger->record($request, 'auth.change_password', $user);

        return response()->json(['data' => $this->profile($user)]);
    }

    /** @return array<string, mixed> */
    private function profile(User $user): array
    {
        return [
            'id' => (string) $user->id,
            'username' => $user->username,
            'fullName' => $user->full_name,
            'role' => $user->role->value,
            'active' => $user->active,
            'isProtected' => $user->is_protected,
            'mustChangePassword' => $user->must_change_password,
            'lastLoginAt' => $user->last_login_at?->toISOString(),
            'capabilities' => CapabilityMap::for($user->role),
        ];
    }
}
