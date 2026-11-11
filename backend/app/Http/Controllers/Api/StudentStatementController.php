<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\JsonResponse;

class StudentStatementController extends Controller
{
    public function show(Student $student): JsonResponse
    {
        $account = $student->billingAccounts()
            ->whereHas('schoolYear', fn ($years) => $years->where('is_current', true))
            ->with([
                'schoolYear:id,label',
                'items:id,billing_account_id,name,category,amount_cents',
                'installments:id,billing_account_id,label,sequence,due_date,amount_cents,paid_cents,status',
                'payments' => fn ($payments) => $payments->orderByDesc('paid_on')->orderByDesc('id'),
                'payments.receipt:id,payment_id,receipt_no',
            ])
            ->latest('id')
            ->first();

        if ($account === null) {
            return response()->json(['message' => 'No billing account exists for the current school year.'], 404);
        }

        return response()->json(['data' => [
            'studentId' => (string) $student->id,
            'lrn' => $student->lrn,
            'studentName' => $student->full_name,
            'schoolYear' => $account->schoolYear->label,
            'totalDueCents' => (int) $account->total_due_cents,
            'totalPaidCents' => (int) $account->total_paid_cents,
            'balanceCents' => (int) $account->balance_cents,
            'items' => $account->items->map(fn ($item): array => [
                'name' => $item->name,
                'category' => $item->category,
                'amountCents' => (int) $item->amount_cents,
            ])->all(),
            'installments' => $account->installments->sortBy('sequence')->values()->map(fn ($installment): array => [
                'label' => $installment->label,
                'dueDate' => $installment->due_date->toDateString(),
                'amountCents' => (int) $installment->amount_cents,
                'paidCents' => (int) $installment->paid_cents,
                'status' => $installment->status,
            ])->all(),
            'payments' => $account->payments->values()->map(fn ($payment): array => [
                'receiptNo' => $payment->receipt?->receipt_no,
                'amountCents' => (int) $payment->amount_cents,
                'paidOn' => $payment->paid_on->toDateString(),
                'status' => $payment->status,
            ])->all(),
        ]]);
    }
}
