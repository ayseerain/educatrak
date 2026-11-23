<?php

namespace App\Http\Requests;

use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStaffUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $staffUser = $this->route('staffUser');
        $roleRules = ['sometimes', Rule::enum(UserRole::class)];

        $actor = $this->user();
        $forbiddenRoles = [UserRole::SuperAdmin->value];
        if ($actor?->role !== UserRole::SuperAdmin) {
            $forbiddenRoles[] = UserRole::Accounting->value;
            $forbiddenRoles[] = UserRole::Admin->value;
            // Allow a regular Administrator to retain an existing Admin role,
            // but never to promote an operational account to that role.
            if ($staffUser?->role === UserRole::Admin) {
                $forbiddenRoles = array_values(array_diff($forbiddenRoles, [UserRole::Admin->value]));
            }
            if ($staffUser?->role === UserRole::Accounting) {
                $forbiddenRoles = array_values(array_diff($forbiddenRoles, [UserRole::Accounting->value]));
            }
        }
        $roleRules[] = Rule::notIn($forbiddenRoles);

        return [
            'full_name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($staffUser)],
            'role' => $roleRules,
            'active' => ['sometimes', 'boolean'],
        ];
    }
}
