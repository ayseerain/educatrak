<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use App\UserRole;
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

        return [
            'full_name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($staffUser)],
            'role' => ['sometimes', Rule::enum(UserRole::class)],
            'active' => ['sometimes', 'boolean'],
        ];
    }
}
