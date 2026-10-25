<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Installment;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FollowUpController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['due_soon', 'overdue'])],
            'grade' => ['nullable', 'string', 'max:80'],
            'section' => ['nullable', 'string', 'max:80'],
            'search' => ['nullable', 'string', 'max:120'],
            'sort' => ['nullable', Rule::in(['due_date', 'amount_due', 'days_overdue'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50'],
        ]);
        $today = CarbonImmutable::now('Asia/Manila')->startOfDay();
        $direction = $filters['direction'] ?? 'asc';

        $installments = Installment::query()
            ->withMax(['notificationLogs as last_reminder_at' => fn ($logs) => $logs->where('kind', 'reminder')->whereIn('status', ['queued', 'sent', 'failed'])], 'created_at')
            ->with([
                'billingAccount.student:id,student_no,full_name,grade_level_id,section_id',
                'billingAccount.student.guardians:id,full_name,email,mobile,email_status',
                'billingAccount.student.gradeLevel:id,name',
                'billingAccount.student.section:id,name',
                'billingAccount.schoolYear:id,label',
            ])
            ->whereColumn('paid_cents', '<', 'amount_cents')
            ->where(function ($query) use ($today): void {
                $query->where('status', 'due_soon')
                    ->orWhere(function ($overdue) use ($today): void {
                        $overdue->whereDate('due_date', '<', $today->toDateString());
                    });
            })
            ->when(isset($filters['status']), function ($query) use ($filters, $today): void {
                if ($filters['status'] === 'overdue') {
                    $query->whereDate('due_date', '<', $today->toDateString());
                } else {
                    $query->where('status', 'due_soon')->whereDate('due_date', '>=', $today->toDateString());
                }
            })
            ->when(isset($filters['grade']), fn ($query) => $query->whereHas('billingAccount.student.gradeLevel', fn ($grade) => $grade->where('name', $filters['grade'])))
            ->when(isset($filters['section']), fn ($query) => $query->whereHas('billingAccount.student.section', fn ($section) => $section->where('name', $filters['section'])))
            ->when(isset($filters['search']) && trim($filters['search']) !== '', function ($query) use ($filters): void {
                $term = '%' . trim($filters['search']) . '%';
                $query->whereHas('billingAccount.student', fn ($student) => $student->where('full_name', 'like', $term)->orWhere('student_no', 'like', $term));
            });

        $sort = $filters['sort'] ?? 'due_date';
        if ($sort === 'amount_due') {
            $installments->orderByRaw('(amount_cents - paid_cents) ' . $direction);
        } elseif ($sort === 'days_overdue') {
            $installments->orderBy('due_date', $direction === 'asc' ? 'desc' : 'asc');
        } else {
            $installments->orderBy('due_date', $direction);
        }

        $page = $installments->orderBy('id')->paginate((int) ($filters['per_page'] ?? 10));
        return response()->json([
            'data' => $page->getCollection()->map(function (Installment $installment) use ($today): array {
                $account = $installment->billingAccount;
                $student = $account?->student;
                $dueDate = CarbonImmutable::parse($installment->due_date->toDateString(), 'Asia/Manila')->startOfDay();
                $status = $dueDate->lt($today) ? 'overdue' : $installment->status;

                return [
                    'id' => (string) $installment->id,
                    'studentId' => $student === null ? null : (string) $student->id,
                    'studentNo' => $student?->student_no,
                    'studentName' => $student?->full_name ?? 'Unavailable',
                    'grade' => $student?->gradeLevel?->name,
                    'section' => $student?->section?->name,
                    'schoolYear' => $account?->schoolYear?->label,
                    'installment' => $installment->label,
                    'dueDate' => $dueDate->toDateString(),
                    'amountDueCents' => max(0, (int) $installment->amount_cents - (int) $installment->paid_cents),
                    'daysOverdue' => $dueDate->lt($today) ? (int) $dueDate->diffInDays($today) : 0,
                    'status' => $status,
                    'guardians' => $student?->guardians->map(fn ($guardian): array => [
                        'name' => $guardian->full_name,
                        'email' => $guardian->email,
                        'mobile' => $guardian->mobile,
                        'emailStatus' => $guardian->email_status,
                    ])->values()->all() ?? [],
                    'lastReminderAt' => $installment->last_reminder_at,
                ];
            })->values(),
            'meta' => [
                'currentPage' => $page->currentPage(),
                'lastPage' => $page->lastPage(),
                'total' => $page->total(),
                'perPage' => $page->perPage(),
                'today' => $today->toDateString(),
            ],
        ]);
    }
}
