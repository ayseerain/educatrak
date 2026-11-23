<?php

namespace App\Http\Requests;

use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStaffUserRequest extends FormRequest
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
        $roleRules = ['required', Rule::enum(UserRole::class)];

        // The bootstrap-only Super Admin can create Administrators and
        // Accounting Officers. Regular Administrators cannot assign either
        // privileged role.
        if ($this->user()?->role !== UserRole::SuperAdmin) {
            $roleRules[] = Rule::notIn([UserRole::Admin->value, UserRole::Accounting->value, UserRole::SuperAdmin->value]);
        } else {
            $roleRules[] = Rule::notIn([UserRole::SuperAdmin->value]);
        }

        return [
            'username' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9._-]+$/', Rule::unique('users', 'username')],
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')],
            'role' => $roleRules,
        ];
    }
}
