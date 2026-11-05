<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpsertStudentRequest;
use App\Models\GradeLevel;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use App\Services\AuditLogger;
use App\Support\CapabilityMap;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StudentController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $canViewFinancialContext = CapabilityMap::allows($user->role, 'students.financial.view');
        $filters = $request->validate([
            'query' => ['nullable', 'string', 'max:120'],
            'grade' => ['nullable', 'string', 'max:100'],
            'section' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['enrolled', 'inactive'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50'],
        ]);
        $students = Student::query()
            ->with(['gradeLevel:id,name', 'section:id,name'])
            ->when($canViewFinancialContext, fn ($query) => $query->withSum(
                ['billingAccounts as current_balance_cents' => fn ($accounts) => $accounts->whereHas('schoolYear', fn ($years) => $years->where('is_current', true))],
                'balance_cents',
            ))
            ->when(isset($filters['query']) && trim($filters['query']) !== '', function ($query) use ($filters): void {
                $search = trim($filters['query']);
                $query->where(function ($matches) use ($search): void {
                    $matches->where('full_name', 'like', "%{$search}%")
                        ->orWhere('student_no', 'like', "%{$search}%");
                });
            })
            ->when(isset($filters['grade']), fn ($query) => $query->whereHas('gradeLevel', fn ($grades) => $grades->where('name', $filters['grade'])))
            ->when(isset($filters['section']), fn ($query) => $query->whereHas('section', fn ($sections) => $sections->where('name', $filters['section'])))
            ->when(isset($filters['status']), fn ($query) => $query->where('status', $filters['status']))
            ->orderBy('full_name')
            ->paginate((int) ($filters['per_page'] ?? 10));

        return response()->json([
            'data' => $students->getCollection()->map(fn (Student $student): array => $this->studentData($student, ! $canViewFinancialContext)),
            'meta' => [
                'currentPage' => $students->currentPage(),
                'lastPage' => $students->lastPage(),
                'total' => $students->total(),
                'perPage' => $students->perPage(),
            ],
        ]);
    }

    public function show(Request $request, Student $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $canViewGuardianContacts = CapabilityMap::allows($user->role, 'guardianContact.view');
        $canViewFinancialContext = CapabilityMap::allows($user->role, 'students.financial.view');
        $student->load(['gradeLevel:id,name', 'section:id,name']);
        if ($canViewGuardianContacts) {
            $student->load(['guardians:id,full_name,relationship,email,mobile,email_status']);
        }
        if ($canViewFinancialContext) {
            $student->loadSum(
                ['billingAccounts as current_balance_cents' => fn ($accounts) => $accounts->whereHas('schoolYear', fn ($years) => $years->where('is_current', true))],
                'balance_cents',
            );
        }

        return response()->json(['data' => $this->studentData(
            $student,
            ! $canViewFinancialContext,
            $canViewGuardianContacts,
        )]);
    }

    public function store(UpsertStudentRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $attributes = $this->validatedAttributes($request);
        $student = Student::query()->create($attributes);
        $this->auditLogger->record($request, 'student.created', $student, null, $this->studentAuditData($student));

        return response()->json(['data' => $this->studentData($student->load(['gradeLevel:id,name', 'section:id,name']), ! CapabilityMap::allows($user->role, 'students.financial.view'))], 201);
    }

    public function recordOptions(): JsonResponse
    {
        $grades = GradeLevel::query()
            ->where('active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name'])
            ->map(fn (GradeLevel $grade): array => [
                'id' => (string) $grade->id,
                'name' => $grade->name,
                'sections' => Section::query()
                    ->where('grade_level_id', $grade->id)
                    ->where('active', true)
                    ->orderBy('name')
                    ->get(['id', 'name'])
                    ->map(fn (Section $section): array => ['id' => (string) $section->id, 'name' => $section->name])
                    ->values(),
            ])
            ->values();

        return response()->json(['data' => ['grades' => $grades, 'statuses' => ['enrolled', 'inactive']]]);
    }

    public function update(UpsertStudentRequest $request, Student $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $before = $this->studentAuditData($student);
        $student->update($this->validatedAttributes($request));
        $student->refresh();
        $this->auditLogger->record($request, 'student.updated', $student, $before, $this->studentAuditData($student));

        return response()->json(['data' => $this->studentData($student->load(['gradeLevel:id,name', 'section:id,name']), ! CapabilityMap::allows($user->role, 'students.financial.view'))]);
    }

    /** @return array<string, mixed> */
    private function validatedAttributes(UpsertStudentRequest $request): array
    {
        $attributes = $request->validated();
        $sectionMatchesGrade = Section::query()
            ->whereKey($attributes['section_id'])
            ->where('grade_level_id', $attributes['grade_level_id'])
            ->exists();

        if (! $sectionMatchesGrade) {
            throw ValidationException::withMessages(['section_id' => 'The selected section does not belong to the selected grade level.']);
        }

        return $attributes;
    }

    /** @return array<string, mixed> */
    private function studentAuditData(Student $student): array
    {
        return $student->only(['student_no', 'full_name', 'grade_level_id', 'section_id', 'status']);
    }

    /** @return array<string, mixed> */
    private function studentData(Student $student, bool $limited, bool $includeGuardians = false): array
    {
        $data = [
            'id' => (string) $student->id,
            'studentNo' => $student->student_no,
            'fullName' => $student->full_name,
            'gradeLevel' => $student->gradeLevel?->name,
            'section' => $student->section?->name,
            'status' => $student->status,
        ];
        if (! $limited) {
            $data['balanceCents'] = (int) ($student->current_balance_cents ?? 0);
        }
        if ($includeGuardians) {
            $data['guardians'] = $student->guardians->map(fn ($guardian): array => [
                'fullName' => $guardian->full_name,
                'relationship' => $guardian->relationship,
                'email' => $guardian->email,
                'mobile' => $guardian->mobile,
                'emailStatus' => $guardian->email_status,
            ])->values();
        }

        return $data;
    }
}
