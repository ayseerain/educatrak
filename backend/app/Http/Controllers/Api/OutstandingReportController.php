<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillingAccount;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OutstandingReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if ($user->role->value === 'cashier') {
            abort(403);
        }

        $filters = $request->validate([
            'grade' => ['nullable', 'string', 'max:100'],
            'section' => ['nullable', 'string', 'max:100'],
            'minimum_balance_cents' => ['nullable', 'integer', 'min:0'],
            'maximum_balance_cents' => ['nullable', 'integer', 'min:0'],
            'overdue_only' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50'],
        ]);
        $minimum = (int) ($filters['minimum_balance_cents'] ?? 0);
        $maximum = $filters['maximum_balance_cents'] ?? null;
        if ($maximum !== null && (int) $maximum < $minimum) {
            throw ValidationException::withMessages(['maximum_balance_cents' => 'Maximum balance must be greater than or equal to minimum balance.']);
        }
        $accounts = BillingAccount::query()
            ->with(['student.gradeLevel:id,name', 'student.section:id,name', 'schoolYear:id,label'])
            ->where('balance_cents', '>', 0)
            ->where('balance_cents', '>=', $minimum)
            ->when($maximum !== null, fn ($query) => $query->where('balance_cents', '<=', (int) $maximum))
            ->when(isset($filters['grade']) && trim($filters['grade']) !== '', fn ($query) => $query->whereHas('student.gradeLevel', fn ($grades) => $grades->where('name', 'like', '%'.trim($filters['grade']).'%')))
            ->when(isset($filters['section']) && trim($filters['section']) !== '', fn ($query) => $query->whereHas('student.section', fn ($sections) => $sections->where('name', 'like', '%'.trim($filters['section']).'%')))
            ->when(filter_var($filters['overdue_only'] ?? false, FILTER_VALIDATE_BOOLEAN), fn ($query) => $query->whereHas('installments', fn ($installments) => $installments->whereDate('due_date', '<', today('Asia/Manila'))->whereColumn('paid_cents', '<', 'amount_cents')))
            ->orderByDesc('balance_cents')
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 10));

        return response()->json([
            'data' => $accounts->getCollection()->map(fn (BillingAccount $account): array => [
                'id' => (string) $account->id,
                'studentId' => (string) $account->student_id,
                'lrn' => $account->student->lrn,
                'studentName' => $account->student->full_name,
                'gradeLevel' => $account->student->gradeLevel?->name,
                'section' => $account->student->section?->name,
                'schoolYear' => $account->schoolYear->label,
                'balanceCents' => (int) $account->balance_cents,
                'status' => $account->status,
            ])->all(),
            'meta' => ['currentPage' => $accounts->currentPage(), 'lastPage' => $accounts->lastPage(), 'total' => $accounts->total(), 'perPage' => $accounts->perPage()],
        ]);
    }
}
