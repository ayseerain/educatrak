<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStaffUserRequest;
use App\Http\Requests\UpdateStaffUserRequest;
use App\Models\User;
use App\Services\AuditLogger;
use App\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UserAdministrationController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => User::query()
                ->orderBy('full_name')
                ->get()
                ->map(fn (User $user): array => $this->staffProfile($user)),
        ]);
    }

    public function store(StoreStaffUserRequest $request, AuditLogger $auditLogger): JsonResponse
    {
        $temporaryPassword = Str::password(20);
        $staffUser = User::query()->create([
            ...$request->validated(),
            'password' => $temporaryPassword,
            'must_change_password' => true,
            'active' => true,
        ]);

        $auditLogger->record($request, 'user.created', $staffUser, null, $this->auditProfile($staffUser));

        return response()->json([
            'data' => $this->staffProfile($staffUser),
            'temporaryPassword' => $temporaryPassword,
        ], 201);
    }

    public function update(
        UpdateStaffUserRequest $request,
        User $staffUser,
        AuditLogger $auditLogger,
    ): JsonResponse {
        $changes = $request->validated();
        $this->assertAdministratorRemainsAvailable($request, $staffUser, $changes);

        $before = $this->auditProfile($staffUser);
        $staffUser->fill($changes)->save();
        $auditLogger->record($request, 'user.updated', $staffUser, $before, $this->auditProfile($staffUser));

        return response()->json(['data' => $this->staffProfile($staffUser)]);
    }

    public function resetPassword(Request $request, User $staffUser, AuditLogger $auditLogger): JsonResponse
    {
        $temporaryPassword = Str::password(20);
        $staffUser->forceFill([
            'password' => $temporaryPassword,
            'must_change_password' => true,
        ])->save();

        $auditLogger->record(
            $request,
            'user.password_reset',
            $staffUser,
            null,
            ['must_change_password' => true],
        );

        return response()->json([
            'data' => $this->staffProfile($staffUser),
            'temporaryPassword' => $temporaryPassword,
        ]);
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    private function assertAdministratorRemainsAvailable(
        Request $request,
        User $staffUser,
        array $changes,
    ): void {
        $nextRole = UserRole::tryFrom($changes['role'] ?? $staffUser->role->value) ?? $staffUser->role;
        $nextActive = $changes['active'] ?? $staffUser->active;
        $removesActiveAdministrator = $staffUser->active
            && $staffUser->role === UserRole::Admin
            && (! $nextActive || $nextRole !== UserRole::Admin);

        if ($request->user()?->is($staffUser) && ! $nextActive) {
            throw ValidationException::withMessages([
                'active' => 'Administrators cannot deactivate their own account.',
            ]);
        }

        if (
            $removesActiveAdministrator
            && User::query()
                ->where('role', UserRole::Admin->value)
                ->where('active', true)
                ->count() <= 1
        ) {
            throw ValidationException::withMessages([
                'role' => 'At least one active Administrator account is required.',
            ]);
        }
    }

    /**
     * @return array{id: string, username: string, fullName: string, email: ?string, role: string, active: bool, mustChangePassword: bool, lastLoginAt: ?string}
     */
    private function staffProfile(User $user): array
    {
        return [
            'id' => (string) $user->id,
            'username' => $user->username,
            'fullName' => $user->full_name,
            'email' => $user->email,
            'role' => $user->role->value,
            'active' => $user->active,
            'mustChangePassword' => $user->must_change_password,
            'lastLoginAt' => $user->last_login_at?->toISOString(),
        ];
    }

    /**
     * @return array{username: string, fullName: string, role: string, active: bool}
     */
    private function auditProfile(User $user): array
    {
        return [
            'username' => $user->username,
            'fullName' => $user->full_name,
            'role' => $user->role->value,
            'active' => $user->active,
        ];
    }
}
