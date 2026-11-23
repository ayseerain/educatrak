<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpsertStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'lrn' => [
                'required',
                'string',
                'regex:/^\d{12}$/',
                Rule::unique('students', 'lrn')->ignore($this->route('student')),
                ...($this->isMethod('PATCH') ? [Rule::in([(string) $this->route('student')?->lrn])] : []),
            ],
            'full_name' => ['required', 'string', 'max:255'],
            'grade_level_id' => ['required', 'integer', Rule::exists('grade_levels', 'id')],
            'section_id' => ['required', 'integer', Rule::exists('sections', 'id')],
            'status' => ['required', Rule::in(['enrolled', 'inactive'])],
            'guardian_id' => ['nullable', 'integer', Rule::exists('guardians', 'id')],
            'guardian_name' => ['nullable', 'string', 'max:255', 'required_with:guardian_relationship,guardian_email,guardian_mobile'],
            'guardian_relationship' => ['nullable', 'string', 'max:100', 'required_with:guardian_name,guardian_email,guardian_mobile'],
            'guardian_email' => ['nullable', 'email', 'max:255'],
            'guardian_mobile' => ['nullable', 'string', 'max:32'],
        ];
    }
}
