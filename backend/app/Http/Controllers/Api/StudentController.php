<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\User;
use App\Support\CapabilityMap;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $filters = $request->validate([
            'query' => $user->role->value === 'registrar'
                ? ['required', 'string', 'max:120']
                : ['nullable', 'string', 'max:120'],
            'grade' => ['nullable', 'string', 'max:100'],
            'section' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['enrolled', 'inactive'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50'],
        ]);
        $students = Student::query()
            ->with(['gradeLevel:id,name', 'section:id,name'])
            ->when($user->role->value !== 'registrar', fn ($query) => $query->withSum(
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
            'data' => $students->getCollection()->map(fn (Student $student): array => $this->studentData($student, $user->role->value === 'registrar')),
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
        $student->load(['gradeLevel:id,name', 'section:id,name']);
        if ($canViewGuardianContacts) {
            $student->load(['guardians:id,full_name,relationship,email,mobile,email_status']);
        }
        if ($user->role->value !== 'registrar') {
            $student->loadSum(
                ['billingAccounts as current_balance_cents' => fn ($accounts) => $accounts->whereHas('schoolYear', fn ($years) => $years->where('is_current', true))],
                'balance_cents',
            );
        }

        return response()->json(['data' => $this->studentData(
            $student,
            $user->role->value === 'registrar',
            $canViewGuardianContacts,
        )]);
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
