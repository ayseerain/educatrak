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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class UserAdministrationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'query' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', Rule::in(array_map(fn (UserRole $role): string => $role->value, UserRole::cases()))],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'archived'])],
            'sort' => ['nullable', Rule::in(['name', 'created_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50'],
        ]);
        $perPage = (int) ($filters['per_page'] ?? 10);
        $users = User::query()->with('archivedBy:id,full_name')
            ->when($this->isRegularAdministrator($request), fn ($query) => $query->where('role', '!=', UserRole::SuperAdmin->value))
            ->when(($filters['status'] ?? null) === 'archived', fn ($query) => $query->whereNotNull('archived_at'))
            ->when(($filters['status'] ?? null) !== 'archived', fn ($query) => $query->whereNull('archived_at'))
            ->when(($filters['status'] ?? null) === 'active', fn ($query) => $query->where('active', true))
            ->when(($filters['status'] ?? null) === 'inactive', fn ($query) => $query->where('active', false))
            ->when(isset($filters['role']), fn ($query) => $query->where('role', $filters['role']))
            ->when(isset($filters['query']) && trim($filters['query']) !== '', function ($query) use ($filters): void {
                $term = '%'.trim($filters['query']).'%';
                $query->where(fn ($matches) => $matches->where('full_name', 'like', $term)->orWhere('username', 'like', $term));
            })
            ->when(isset($filters['date_from']), fn ($query) => $query->whereDate('created_at', '>=', $filters['date_from']))
            ->when(isset($filters['date_to']), fn ($query) => $query->whereDate('created_at', '<=', $filters['date_to']))
            ->orderBy(($filters['sort'] ?? 'name') === 'created_at' ? 'created_at' : 'full_name', $filters['direction'] ?? 'asc')->orderBy('id')
            ->paginate($perPage);

        return response()->json([
            'data' => $users->getCollection()->map(fn (User $user): array => $this->staffProfile($user)),
            'meta' => ['currentPage' => $users->currentPage(), 'lastPage' => $users->lastPage(), 'total' => $users->total(), 'perPage' => $users->perPage()],
        ]);
    }

    public function archive(Request $request, User $staffUser, AuditLogger $auditLogger): JsonResponse
    {
        $this->assertNotProtected($request, $staffUser);
        if ($request->user()?->is($staffUser)) {
            throw ValidationException::withMessages(['user' => 'You cannot archive your own account.']);
        }
        if ($staffUser->archived_at !== null) {
            throw ValidationException::withMessages(['user' => 'This account is already archived.']);
        }

        $archived = DB::transaction(function () use ($request, $staffUser, $auditLogger): User {
            $activeAdministratorIds = User::query()->where('role', UserRole::Admin->value)->where('active', true)->orderBy('id')->lockForUpdate()->pluck('id');
            $lockedUser = User::query()->with('archivedBy:id,full_name')->lockForUpdate()->findOrFail($staffUser->id);
            $this->assertAdministratorRemainsAvailable($request, $lockedUser, ['active' => false], $activeAdministratorIds->count());
            $before = $this->auditProfile($lockedUser);
            $now = now();
            $lockedUser->forceFill([
                'active' => false,
                'archived_at' => $now,
                'archived_by' => $request->user()->id,
                'anonymize_at' => $now->copy()->addDays(max(1, (int) config('services.user_archive.retention_days', 30))),
            ])->save();
            $auditLogger->record($request, 'user.archived', $lockedUser, $before, $this->auditProfile($lockedUser));

            return $lockedUser->load('archivedBy:id,full_name');
        });

        return response()->json(['data' => $this->staffProfile($archived)]);
    }

    public function restore(Request $request, User $staffUser, AuditLogger $auditLogger): JsonResponse
    {
        $this->assertNotProtected($request, $staffUser);
        $restored = DB::transaction(function () use ($request, $staffUser, $auditLogger): User {
            $lockedUser = User::query()->with('archivedBy:id,full_name')->lockForUpdate()->findOrFail($staffUser->id);
            if ($lockedUser->archived_at === null) {
                throw ValidationException::withMessages(['user' => 'This account is not archived.']);
            }
            if ($lockedUser->anonymize_at === null || $lockedUser->anonymize_at->isPast()) {
                throw ValidationException::withMessages(['user' => 'The restore period has expired. This account has been anonymized.']);
            }
            $before = $this->auditProfile($lockedUser);
            $lockedUser->forceFill(['active' => true, 'archived_at' => null, 'archived_by' => null, 'anonymize_at' => null])->save();
            $auditLogger->record($request, 'user.restored', $lockedUser, $before, $this->auditProfile($lockedUser));

            return $lockedUser->load('archivedBy:id,full_name');
        });

        return response()->json(['data' => $this->staffProfile($restored)]);
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
        $this->assertNotProtected($request, $staffUser);
        $changes = $request->validated();
        $updatedUser = DB::transaction(function () use ($request, $staffUser, $changes, $auditLogger): User {
            // Lock every active Administrator in a stable order so concurrent
            // changes cannot both pass the last-Administrator check.
            $activeAdministratorIds = User::query()
                ->where('role', UserRole::Admin->value)
                ->where('active', true)
                ->orderBy('id')
                ->lockForUpdate()
                ->pluck('id');
            $lockedUser = User::query()->lockForUpdate()->findOrFail($staffUser->id);
            $this->assertNotArchived($lockedUser);

            $this->assertAdministratorRemainsAvailable(
                $request,
                $lockedUser,
                $changes,
                $activeAdministratorIds->count(),
            );

            $before = $this->auditProfile($lockedUser);
            $lockedUser->fill($changes)->save();
            $auditLogger->record($request, 'user.updated', $lockedUser, $before, $this->auditProfile($lockedUser));

            return $lockedUser;
        });

        return response()->json(['data' => $this->staffProfile($updatedUser)]);
    }

    public function resetPassword(Request $request, User $staffUser, AuditLogger $auditLogger): JsonResponse
    {
        $this->assertNotProtected($request, $staffUser);
        [$staffUser, $temporaryPassword] = DB::transaction(function () use ($request, $staffUser, $auditLogger): array {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($staffUser->id);
            $this->assertNotArchived($lockedUser);
            $temporaryPassword = Str::password(20);
            $lockedUser->forceFill([
                'password' => $temporaryPassword,
                'must_change_password' => true,
            ])->save();

            $auditLogger->record(
                $request,
                'user.password_reset',
                $lockedUser,
                null,
                ['must_change_password' => true],
            );

            return [$lockedUser, $temporaryPassword];
        });

        return response()->json([
            'data' => $this->staffProfile($staffUser),
            'temporaryPassword' => $temporaryPassword,
        ]);
    }

    private function assertNotProtected(Request $request, User $staffUser): void
    {
        if ($staffUser->is_protected) {
            throw new AccessDeniedHttpException('This bootstrap account is protected from routine changes.');
        }
    }

    private function assertNotArchived(User $staffUser): void
    {
        if ($staffUser->archived_at !== null) {
            throw ValidationException::withMessages([
                'user' => 'Archived accounts must be restored before they can be changed.',
            ]);
        }
    }

    private function isRegularAdministrator(Request $request): bool
    {
        return $request->user()?->role === UserRole::Admin;
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    private function assertAdministratorRemainsAvailable(
        Request $request,
        User $staffUser,
        array $changes,
        int $activeAdministratorCount,
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
            && $activeAdministratorCount <= 1
        ) {
            throw ValidationException::withMessages([
                'role' => 'At least one active Administrator account is required.',
            ]);
        }
    }

    /** @return array<string, mixed> */
    private function staffProfile(User $user): array
    {
        return [
            'id' => (string) $user->id,
            'username' => $user->username,
            'fullName' => $user->full_name,
            'email' => $user->email,
            'role' => $user->role->value,
            'active' => $user->active,
            'isProtected' => $user->is_protected,
            'mustChangePassword' => $user->must_change_password,
            'lastLoginAt' => $user->last_login_at?->toISOString(),
            'archivedAt' => $user->archived_at?->toISOString(),
            'anonymizeAt' => $user->anonymize_at?->toISOString(),
            'archivedBy' => $user->archivedBy?->full_name,
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
            'archived_at' => $user->archived_at?->toISOString(),
            'archived_by' => $user->archived_by === null ? null : (string) $user->archived_by,
            'anonymize_at' => $user->anonymize_at?->toISOString(),
        ];
    }
}
