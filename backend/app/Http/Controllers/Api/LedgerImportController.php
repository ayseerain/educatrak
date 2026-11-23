<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillingAccount;
use App\Models\ImportBatch;
use App\Models\OpeningBalanceConversion;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use App\Services\AuditLogger;
use App\Support\CapabilityMap;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * SRS v3.0 financial ledger import as a one-time opening-balance conversion (owner decisions 2026-11-23).
 * Cashier uploads a CSV draft and submits it; a different Accounting user confirms the eligible rows or
 * rejects the batch. Confirmation is storage-only: it creates OpeningBalanceConversion records and never
 * creates or changes students, billing accounts, installments, payments, receipts, adjustments,
 * close-outs, or notifications. Posting into billing accounts awaits an approved accounting mapping.
 *
 * Row statuses: eligible, invalid (format/reference errors), duplicate (repeated in the file or already
 * recorded), conflict (the student already has a billing account for that school year and needs an
 * approved reconciliation rule).
 */
class LedgerImportController extends Controller
{
    /** @var list<string> */
    public const Columns = ['source_row_id', 'student_lrn', 'school_year', 'as_of_date', 'total_due_cents', 'total_paid_cents', 'balance_cents', 'source_reference', 'notes'];

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $query = ImportBatch::query()->orderByDesc('id');
        if (CapabilityMap::allows($user->role, 'ledger.import.prepare')) {
            $query->where('created_by', $user->id);
        } else {
            $query->whereNotIn('status', ['previewed', 'cancelled']);
        }

        return response()->json([
            'data' => $query->limit(100)->get()->map(fn (ImportBatch $batch): array => $this->batchData($batch, false))->values(),
            'meta' => $this->meta(),
        ]);
    }

    public function store(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:'.config('educatrak.ledger_import.max_file_kilobytes')],
            'mapping' => ['sometimes', 'array'],
            'mapping.*' => ['nullable', 'string', 'max:255'],
        ]);
        /** @var User $user */
        $user = $request->user();
        $file = $request->file('file');
        $contents = (string) file_get_contents($file->getRealPath());
        $rows = $this->classifyRows($this->parseCsv($contents, $validated['mapping'] ?? []));

        $batch = DB::transaction(function () use ($request, $user, $file, $contents, $rows, $validated, $auditLogger): ImportBatch {
            $batch = ImportBatch::query()->forceCreate([
                'created_by' => $user->id,
                'filename' => mb_substr(basename($file->getClientOriginalName()), 0, 255),
                'file_sha256' => hash('sha256', $contents),
                'status' => 'previewed',
                'summary' => [...$this->summary($rows), 'mapping' => $validated['mapping'] ?? null],
                'rows' => $rows,
            ]);
            $auditLogger->record($request, 'ledger_import.prepared', $batch, null, $this->auditSummary($batch));

            return $batch;
        });

        return response()->json(['data' => $this->batchData($batch, true), 'meta' => $this->meta()], 201);
    }

    public function show(Request $request, ImportBatch $importBatch): JsonResponse
    {
        $this->authorizeBatchAccess($request, $importBatch);

        return response()->json(['data' => $this->batchData($importBatch, true), 'meta' => $this->meta()]);
    }

    public function submit(Request $request, ImportBatch $importBatch, AuditLogger $auditLogger): JsonResponse
    {
        return $this->transition($request, $importBatch, $auditLogger, 'previewed', 'submitted', 'ledger_import.submitted', function (ImportBatch $batch): void {
            $rows = $this->classifyRows($this->storedValues($batch));
            if ($this->summary($rows)['eligible_count'] === 0) {
                throw ValidationException::withMessages(['batch' => 'This batch has no eligible rows. Correct the file and upload a new batch.']);
            }
            $batch->rows = $rows;
            $batch->summary = [...$batch->summary, ...$this->summary($rows)];
            $batch->submitted_at = now();
        });
    }

    public function cancel(Request $request, ImportBatch $importBatch, AuditLogger $auditLogger): JsonResponse
    {
        return $this->transition($request, $importBatch, $auditLogger, 'previewed', 'cancelled', 'ledger_import.cancelled', fn () => null);
    }

    public function reject(Request $request, ImportBatch $importBatch, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate(['review_note' => ['required', 'string', 'min:10', 'max:1000']]);

        return $this->transition($request, $importBatch, $auditLogger, 'submitted', 'rejected', 'ledger_import.rejected', function (ImportBatch $batch) use ($request, $validated): void {
            $this->assertNotPreparer($request, $batch);
            $batch->reviewed_by = $request->user()->id;
            $batch->reviewed_at = now();
            $batch->review_note = $validated['review_note'];
        });
    }

    /**
     * Records the eligible rows only. The request names the eligible lines the reviewer saw; if fresh
     * revalidation gives a different set, nothing is written and the reviewer must look again.
     */
    public function confirm(Request $request, ImportBatch $importBatch, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'file_sha256' => ['required', 'string', 'size:64'],
            'eligible_lines' => ['required', 'array', 'min:1'],
            'eligible_lines.*' => ['integer', 'distinct', 'min:2'],
        ]);
        if ($this->cutoverDate() === null) {
            abort(409, 'The opening-balance cutover date has not been approved and configured. Confirmation is unavailable until it is.');
        }

        return $this->transition($request, $importBatch, $auditLogger, 'submitted', 'confirmed', 'ledger_import.confirmed', function (ImportBatch $batch) use ($request, $validated): void {
            $this->assertNotPreparer($request, $batch);
            if (! hash_equals((string) $batch->file_sha256, $validated['file_sha256'])) {
                abort(409, 'This batch does not match the revision you reviewed. Reload it and review again.');
            }
            $rows = $this->classifyRows($this->storedValues($batch));
            $eligibleLines = collect($rows)->where('status', 'eligible')->pluck('line')->sort()->values()->all();
            $reviewedLines = collect($validated['eligible_lines'])->map(fn ($line): int => (int) $line)->sort()->values()->all();
            if ($eligibleLines === [] || $eligibleLines !== $reviewedLines) {
                abort(409, 'The eligible rows changed since you reviewed this batch. Reload it and review again.');
            }

            foreach ($rows as $index => $row) {
                if ($row['status'] !== 'eligible') {
                    $rows[$index]['outcome'] = 'excluded';

                    continue;
                }
                $values = $row['values'];
                OpeningBalanceConversion::query()->forceCreate([
                    'import_batch_id' => $batch->id,
                    'student_id' => $row['student_id'],
                    'school_year_id' => $row['school_year_id'],
                    'source_row_id' => $values['source_row_id'],
                    'as_of_date' => $values['as_of_date'],
                    'total_due_cents' => (int) $values['total_due_cents'],
                    'total_paid_cents' => (int) $values['total_paid_cents'],
                    'balance_cents' => (int) $values['balance_cents'],
                    'source_reference' => $values['source_reference'],
                    'notes' => $values['notes'] === '' ? null : $values['notes'],
                    'confirmed_by' => $request->user()->id,
                ]);
                $rows[$index]['outcome'] = 'recorded';
            }
            $batch->rows = $rows;
            $batch->summary = [
                ...$batch->summary,
                ...$this->summary($rows),
                'recorded_count' => count($eligibleLines),
                'excluded_count' => count($rows) - count($eligibleLines),
                'cutover_date' => $this->cutoverDate(),
            ];
            $batch->reviewed_by = $request->user()->id;
            $batch->reviewed_at = now();
            $batch->committed_at = now();
        });
    }

    /** CSV of every row that is not eligible, with its reasons. Cell values are neutralized against spreadsheet formulas. */
    public function errorReport(Request $request, ImportBatch $importBatch): StreamedResponse
    {
        $this->authorizeBatchAccess($request, $importBatch);
        $rows = collect($this->currentRows($importBatch))->where('status', '!=', 'eligible');

        return response()->streamDownload(function () use ($rows): void {
            $output = fopen('php://output', 'wb');
            fputcsv($output, ['line', 'status', 'source_row_id', 'student_lrn', 'school_year', 'errors']);
            foreach ($rows as $row) {
                fputcsv($output, array_map($this->safeCell(...), [
                    (string) $row['line'],
                    $row['status'],
                    $row['values']['source_row_id'],
                    $row['values']['student_lrn'],
                    $row['values']['school_year'],
                    implode(' ', $row['errors']),
                ]));
            }
            fclose($output);
        }, "ledger-import-{$importBatch->id}-errors.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @param callable(ImportBatch): void $apply */
    private function transition(Request $request, ImportBatch $importBatch, AuditLogger $auditLogger, string $from, string $to, string $action, callable $apply): JsonResponse
    {
        $this->authorizeBatchAccess($request, $importBatch);

        $batch = DB::transaction(function () use ($request, $importBatch, $auditLogger, $from, $to, $action, $apply): ImportBatch {
            $batch = ImportBatch::query()->lockForUpdate()->findOrFail($importBatch->id);
            if ($batch->status !== $from) {
                abort(409, "This batch is {$batch->status} and cannot be changed to {$to}.");
            }
            $apply($batch);
            $batch->status = $to;
            $batch->save();
            $auditLogger->record($request, $action, $batch, ['status' => $from], ['status' => $to, ...$this->auditSummary($batch)]);

            return $batch;
        });

        return response()->json(['data' => $this->batchData($batch, true), 'meta' => $this->meta()]);
    }

    private function authorizeBatchAccess(Request $request, ImportBatch $batch): void
    {
        /** @var User $user */
        $user = $request->user();
        $visible = CapabilityMap::allows($user->role, 'ledger.import.prepare')
            ? (int) $batch->created_by === (int) $user->id
            : ! in_array($batch->status, ['previewed', 'cancelled'], true);
        if (! $visible) {
            abort(404);
        }
    }

    private function assertNotPreparer(Request $request, ImportBatch $batch): void
    {
        if ((int) $batch->created_by === (int) $request->user()->id) {
            abort(403, 'The user who prepared a batch cannot review it.');
        }
    }

    private function cutoverDate(): ?string
    {
        $cutover = config('educatrak.ledger_cutover_date');
        if (! is_string($cutover) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $cutover) !== 1) {
            return null;
        }

        return $cutover;
    }

    /** @return array<string, mixed> */
    private function meta(): array
    {
        return [
            'cutoverDate' => $this->cutoverDate(),
            'cutoverPending' => $this->cutoverDate() === null,
            'postingMode' => 'storage_only',
            'columns' => self::Columns,
        ];
    }

    /**
     * @param  array<string, string|null>  $mapping  required column => header in the uploaded file
     * @return list<array<string, string>>
     */
    private function parseCsv(string $contents, array $mapping): array
    {
        $contents = preg_replace('/^\xEF\xBB\xBF/', '', $contents) ?? '';
        $lines = preg_split('/\r\n|\n|\r/', trim($contents)) ?: [];
        if ($contents === '' || count($lines) < 2) {
            throw ValidationException::withMessages(['file' => 'The CSV file must contain a header row and at least one data row.']);
        }
        $header = array_map(fn (?string $column): string => trim((string) $column), str_getcsv(array_shift($lines)));
        if (count($header) !== count(array_unique(array_map('strtolower', $header)))) {
            throw ValidationException::withMessages(['file' => 'The CSV header has duplicate column names.']);
        }
        $positions = [];
        foreach (self::Columns as $column) {
            $source = $mapping[$column] ?? $column;
            $position = $source === null || $source === '' ? false : array_search(strtolower($source), array_map('strtolower', $header), true);
            if ($position === false && $column !== 'notes') {
                throw ValidationException::withMessages(['mapping' => "Map the required column {$column} to a column in the file."]);
            }
            $positions[$column] = $position;
        }
        $mapped = array_filter($positions, fn ($position): bool => $position !== false);
        if (count($mapped) !== count(array_unique($mapped))) {
            throw ValidationException::withMessages(['mapping' => 'Each file column can be mapped to only one required column.']);
        }
        if (count($lines) > config('educatrak.ledger_import.max_rows')) {
            throw ValidationException::withMessages(['file' => 'A batch may contain at most '.config('educatrak.ledger_import.max_rows').' rows.']);
        }

        $rows = [];
        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }
            $cells = str_getcsv($line);
            $row = [];
            foreach ($positions as $column => $position) {
                $row[$column] = $position === false ? '' : trim((string) ($cells[$position] ?? ''));
            }
            $rows[] = $row;
        }

        return $rows;
    }

    /** @return list<array<string, string>> */
    private function storedValues(ImportBatch $batch): array
    {
        return array_map(fn (array $row): array => $row['values'], $batch->rows ?? []);
    }

    /**
     * Previews and pending reviews are revalidated against current records; finished batches show
     * the classification stored when they were confirmed, rejected or cancelled.
     *
     * @return list<array<string, mixed>>
     */
    private function currentRows(ImportBatch $batch): array
    {
        return in_array($batch->status, ['previewed', 'submitted'], true)
            ? $this->classifyRows($this->storedValues($batch))
            : ($batch->rows ?? []);
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @return list<array{line: int, status: string, values: array<string, string>, errors: list<string>, student_id: int|null, school_year_id: int|null}>
     */
    private function classifyRows(array $rows): array
    {
        $cutover = $this->cutoverDate();
        $students = Student::query()->whereIn('lrn', array_column($rows, 'student_lrn'))->pluck('id', 'lrn');
        $schoolYears = SchoolYear::query()->pluck('id', 'label');
        $recorded = OpeningBalanceConversion::query()->get(['student_id', 'school_year_id'])
            ->map(fn (OpeningBalanceConversion $conversion): string => $conversion->student_id.':'.$conversion->school_year_id)
            ->flip();
        $accounts = BillingAccount::query()->whereIn('student_id', $students->values())->get(['student_id', 'school_year_id'])
            ->map(fn (BillingAccount $account): string => $account->student_id.':'.$account->school_year_id)
            ->flip();
        $sourceIdCounts = array_count_values(array_filter(array_column($rows, 'source_row_id'), fn (string $id): bool => $id !== ''));
        $studentYearCounts = [];
        foreach ($rows as $values) {
            $key = ($students[$values['student_lrn']] ?? '?').':'.($schoolYears[$values['school_year']] ?? '?');
            $studentYearCounts[$key] = ($studentYearCounts[$key] ?? 0) + 1;
        }

        $classified = [];
        foreach ($rows as $index => $values) {
            $errors = [];
            foreach (['source_row_id', 'student_lrn', 'school_year', 'as_of_date', 'total_due_cents', 'total_paid_cents', 'balance_cents', 'source_reference'] as $column) {
                if ($values[$column] === '') {
                    $errors[] = "{$column} is required.";
                }
            }
            if (mb_strlen($values['source_row_id']) > 64 || mb_strlen($values['source_reference']) > 255 || mb_strlen($values['notes']) > 1000) {
                $errors[] = 'source_row_id (64), source_reference (255) or notes (1000) is too long.';
            }
            if ($values['student_lrn'] !== '' && preg_match('/^\d{12}$/', $values['student_lrn']) !== 1) {
                $errors[] = 'student_lrn must be exactly 12 digits.';
            }
            $studentId = $students[$values['student_lrn']] ?? null;
            if ($studentId === null && preg_match('/^\d{12}$/', $values['student_lrn']) === 1) {
                $errors[] = 'No existing student has this LRN; imports never create students.';
            }
            $schoolYearId = $schoolYears[$values['school_year']] ?? null;
            if ($schoolYearId === null && $values['school_year'] !== '') {
                $errors[] = 'school_year does not match a configured school year.';
            }

            if ($values['as_of_date'] !== '') {
                $asOf = preg_match('/^\d{4}-\d{2}-\d{2}$/', $values['as_of_date']) === 1
                    ? CarbonImmutable::createFromFormat('!Y-m-d', $values['as_of_date'], 'Asia/Manila')
                    : false;
                if ($asOf === false || $asOf->format('Y-m-d') !== $values['as_of_date']) {
                    $errors[] = 'as_of_date must be a valid YYYY-MM-DD date.';
                } elseif ($cutover !== null && $values['as_of_date'] > $cutover) {
                    $errors[] = 'as_of_date is later than the approved cutover date.';
                }
            }

            $amountsAreValid = true;
            foreach (['total_due_cents', 'total_paid_cents', 'balance_cents'] as $column) {
                if ($values[$column] !== '' && preg_match('/^\d{1,15}$/', $values[$column]) !== 1) {
                    $errors[] = "{$column} must be a non-negative whole number of centavos.";
                    $amountsAreValid = false;
                }
            }
            if ($amountsAreValid && $values['total_due_cents'] !== '' && $values['total_paid_cents'] !== '' && $values['balance_cents'] !== ''
                && (int) $values['total_due_cents'] - (int) $values['total_paid_cents'] !== (int) $values['balance_cents']) {
                $errors[] = 'total_due_cents - total_paid_cents must equal balance_cents.';
            }

            $status = $errors === [] ? 'eligible' : 'invalid';
            if ($status === 'eligible') {
                $key = $studentId.':'.$schoolYearId;
                if (($sourceIdCounts[$values['source_row_id']] ?? 0) > 1) {
                    $status = 'duplicate';
                    $errors[] = 'source_row_id appears more than once in this file.';
                }
                if (($studentYearCounts[$key] ?? 0) > 1) {
                    $status = 'duplicate';
                    $errors[] = 'This student and school year appear more than once in this file.';
                }
                if (isset($recorded[$key])) {
                    $status = 'duplicate';
                    $errors[] = 'An opening balance is already recorded for this student and school year.';
                }
                if ($status === 'eligible' && isset($accounts[$key])) {
                    $status = 'conflict';
                    $errors[] = 'The student already has a billing account for this school year. Accounting must reconcile it under an approved rule; it is not recorded.';
                }
            }

            $classified[] = [
                'line' => $index + 2,
                'status' => $status,
                'values' => $values,
                'errors' => $errors,
                'student_id' => $studentId,
                'school_year_id' => $schoolYearId,
            ];
        }

        return $classified;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, int>
     */
    private function summary(array $rows): array
    {
        $counts = array_count_values(array_column($rows, 'status'));

        return [
            'row_count' => count($rows),
            'eligible_count' => $counts['eligible'] ?? 0,
            'invalid_count' => $counts['invalid'] ?? 0,
            'duplicate_count' => $counts['duplicate'] ?? 0,
            'conflict_count' => $counts['conflict'] ?? 0,
        ];
    }

    /** @return array<string, int> */
    private function auditSummary(ImportBatch $batch): array
    {
        return array_intersect_key($batch->summary ?? [], array_flip(['row_count', 'eligible_count', 'invalid_count', 'duplicate_count', 'conflict_count', 'recorded_count', 'excluded_count']));
    }

    private function safeCell(string $value): string
    {
        return preg_match('/^[=+\-@\t\r]/', $value) === 1 ? "'".$value : $value;
    }

    /** @return array<string, mixed> */
    private function batchData(ImportBatch $batch, bool $includeRows): array
    {
        $rows = $includeRows ? $this->currentRows($batch) : [];
        $summary = $includeRows ? [...($batch->summary ?? []), ...$this->summary($rows)] : ($batch->summary ?? []);
        $data = [
            'id' => (string) $batch->id,
            'filename' => $batch->filename,
            'fileSha256' => $batch->file_sha256,
            'status' => $batch->status,
            'summary' => [
                'rowCount' => (int) ($summary['row_count'] ?? 0),
                'eligibleCount' => (int) ($summary['eligible_count'] ?? 0),
                'invalidCount' => (int) ($summary['invalid_count'] ?? 0),
                'duplicateCount' => (int) ($summary['duplicate_count'] ?? 0),
                'conflictCount' => (int) ($summary['conflict_count'] ?? 0),
                'recordedCount' => isset($summary['recorded_count']) ? (int) $summary['recorded_count'] : null,
                'excludedCount' => isset($summary['excluded_count']) ? (int) $summary['excluded_count'] : null,
            ],
            'preparedBy' => (string) $batch->created_by,
            'reviewedBy' => $batch->reviewed_by === null ? null : (string) $batch->reviewed_by,
            'reviewNote' => $batch->review_note,
            'createdAt' => $batch->created_at?->toIso8601String(),
            'submittedAt' => $batch->submitted_at?->toIso8601String(),
            'reviewedAt' => $batch->reviewed_at?->toIso8601String(),
        ];
        if ($includeRows) {
            $data['rows'] = array_map(fn (array $row): array => [
                'line' => $row['line'],
                'status' => $row['status'],
                'outcome' => $row['outcome'] ?? null,
                'values' => $row['values'],
                'errors' => $row['errors'],
            ], $rows);
        }

        return $data;
    }
}
