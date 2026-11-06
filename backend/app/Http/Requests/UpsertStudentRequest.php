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
            'student_no' => ['required', 'string', 'max:100', Rule::unique('students', 'student_no')->ignore($this->route('student'))],
            'full_name' => ['required', 'string', 'max:255'],
            'grade_level_id' => ['required', 'integer', Rule::exists('grade_levels', 'id')],
            'section_id' => ['required', 'integer', Rule::exists('sections', 'id')],
            'status' => ['required', Rule::in(['enrolled', 'inactive'])],
            'guardian_name' => ['nullable', 'string', 'max:255', 'required_with:guardian_relationship,guardian_email,guardian_mobile'],
            'guardian_relationship' => ['nullable', 'string', 'max:100', 'required_with:guardian_name,guardian_email,guardian_mobile'],
            'guardian_email' => ['nullable', 'email', 'max:255'],
            'guardian_mobile' => ['nullable', 'string', 'max:32'],
        ];
    }
}
