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
        ];
    }
}
