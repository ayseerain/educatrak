<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillingAccount;
use App\Models\ExamPeriod;
use App\Models\GradeLevel;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Term;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Administrator-managed school structure: school years, terms, exam periods, grade levels and sections.
 * Nothing here is ever deleted; financially significant dates lock once a billing account exists for the year.
 */
class SchoolStructureSettingsController extends Controller
{
    private const DATE = 'date_format:Y-m-d';

    public function schoolYears(): JsonResponse
    {
        $years = SchoolYear::query()
            ->with('terms.examPeriods')
            ->orderByDesc('starts_on')
            ->orderByDesc('id')
            ->get();
        $lockedYearIds = BillingAccount::query()->distinct()->pluck('school_year_id')->map(fn ($id): int => (int) $id)->all();

        return response()->json(['data' => $years->map(fn (SchoolYear $year): array => $this->schoolYearData($year, in_array($year->id, $lockedYearIds, true)))->values()]);
    }

    public function storeSchoolYear(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'label' => ['required', 'string', 'max:40'],
            'starts_on' => ['required', self::DATE],
            'ends_on' => ['required', self::DATE, 'after:starts_on'],
        ]);
        $label = trim($validated['label']);

        $year = DB::transaction(function () use ($request, $auditLogger, $validated, $label): SchoolYear {
            $existingCount = SchoolYear::query()->lockForUpdate()->count();
            $this->ensureSchoolYearLabelAvailable($label);
            $this->ensureNoOverlap($validated['starts_on'], $validated['ends_on']);

            $year = new SchoolYear;
            $year->forceFill([
                'label' => $label,
                'starts_on' => $validated['starts_on'],
                'ends_on' => $validated['ends_on'],
                'is_current' => $existingCount === 0,
            ])->save();
            $auditLogger->record($request, 'school_year.created', $year, null, $this->schoolYearAudit($year));

            return $year;
        });

        return response()->json(['data' => $this->schoolYearData($year->load('terms.examPeriods'), false)], 201);
    }

    public function updateSchoolYear(Request $request, SchoolYear $schoolYear, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'label' => ['sometimes', 'required', 'string', 'max:40'],
            'starts_on' => ['sometimes', 'required', self::DATE],
            'ends_on' => ['sometimes', 'required', self::DATE],
        ]);

        [$year, $locked] = DB::transaction(function () use ($request, $schoolYear, $auditLogger, $validated): array {
            $year = SchoolYear::query()->lockForUpdate()->findOrFail($schoolYear->id);
            $locked = $this->datesLocked($year);
            $before = $this->schoolYearAudit($year);
            $startsOn = $validated['starts_on'] ?? $this->dateString($year->starts_on);
            $endsOn = $validated['ends_on'] ?? $this->dateString($year->ends_on);

            if ($locked && ($startsOn !== $this->dateString($year->starts_on) || $endsOn !== $this->dateString($year->ends_on))) {
                throw ValidationException::withMessages([
                    $startsOn !== $this->dateString($year->starts_on) ? 'starts_on' : 'ends_on' => 'School-year dates are locked because billing accounts exist for this school year.',
                ]);
            }
            if ($startsOn >= $endsOn) {
                throw ValidationException::withMessages(['ends_on' => 'The end date must be after the start date.']);
            }
            if (isset($validated['label'])) {
                $this->ensureSchoolYearLabelAvailable(trim($validated['label']), $year->id);
                $year->label = trim($validated['label']);
            }
            $this->ensureNoOverlap($startsOn, $endsOn, $year->id);
            $year->forceFill(['starts_on' => $startsOn, 'ends_on' => $endsOn]);

            if ($year->isDirty()) {
                $year->save();
                $auditLogger->record($request, 'school_year.updated', $year, $before, $this->schoolYearAudit($year));
            }

            return [$year, $locked];
        });

        return response()->json(['data' => $this->schoolYearData($year->load('terms.examPeriods'), $locked)]);
    }

    public function makeCurrent(Request $request, SchoolYear $schoolYear, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $year = DB::transaction(function () use ($request, $schoolYear, $auditLogger, $validated): SchoolYear {
            $years = SchoolYear::query()->lockForUpdate()->get();
            $target = $years->firstWhere('id', $schoolYear->id);
            if ($target->is_current) {
                abort(409, 'This school year is already the current school year.');
            }

            $previous = $years->firstWhere('is_current', true);
            SchoolYear::query()->whereKeyNot($target->id)->where('is_current', true)->update(['is_current' => false]);
            $target->forceFill(['is_current' => true])->save();
            $auditLogger->record(
                $request,
                'school_year.current_changed',
                $target,
                ['current_school_year_id' => $previous?->id, 'current_school_year_label' => $previous?->label],
                ['current_school_year_id' => $target->id, 'current_school_year_label' => $target->label, 'reason' => $validated['reason']],
            );

            return $target;
        });

        return response()->json(['data' => $this->schoolYearData($year->load('terms.examPeriods'), $this->datesLocked($year))]);
    }

    public function storeTerm(Request $request, SchoolYear $schoolYear, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'sequence' => ['required', 'integer', 'min:1', 'max:65535'],
            'starts_on' => ['nullable', self::DATE],
            'ends_on' => ['nullable', self::DATE],
        ]);

        $term = DB::transaction(function () use ($request, $schoolYear, $auditLogger, $validated): Term {
            $year = SchoolYear::query()->lockForUpdate()->findOrFail($schoolYear->id);
            $startsOn = $validated['starts_on'] ?? null;
            $endsOn = $validated['ends_on'] ?? null;
            if ($this->datesLocked($year) && ($startsOn !== null || $endsOn !== null)) {
                throw ValidationException::withMessages([$startsOn !== null ? 'starts_on' : 'ends_on' => 'Term dates are locked because billing accounts exist for this school year.']);
            }
            $this->ensureDateOrder($startsOn, $endsOn);
            $this->ensureTermSequenceAvailable($year->id, (int) $validated['sequence']);

            $term = new Term;
            $term->forceFill([
                'school_year_id' => $year->id,
                'name' => trim($validated['name']),
                'sequence' => (int) $validated['sequence'],
                'starts_on' => $startsOn,
                'ends_on' => $endsOn,
            ])->save();
            $auditLogger->record($request, 'term.created', $term, null, $this->termAudit($term));

            return $term;
        });

        return response()->json(['data' => $this->termData($term->load('examPeriods'))], 201);
    }

    public function updateTerm(Request $request, Term $term, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'sequence' => ['sometimes', 'required', 'integer', 'min:1', 'max:65535'],
            'starts_on' => ['sometimes', 'nullable', self::DATE],
            'ends_on' => ['sometimes', 'nullable', self::DATE],
        ]);

        $term = DB::transaction(function () use ($request, $term, $auditLogger, $validated): Term {
            $year = SchoolYear::query()->lockForUpdate()->findOrFail($term->school_year_id);
            $current = Term::query()->lockForUpdate()->findOrFail($term->id);
            $before = $this->termAudit($current);
            $startsOn = array_key_exists('starts_on', $validated) ? $validated['starts_on'] : $this->dateString($current->starts_on);
            $endsOn = array_key_exists('ends_on', $validated) ? $validated['ends_on'] : $this->dateString($current->ends_on);

            if ($this->datesLocked($year) && ($startsOn !== $this->dateString($current->starts_on) || $endsOn !== $this->dateString($current->ends_on))) {
                throw ValidationException::withMessages([
                    $startsOn !== $this->dateString($current->starts_on) ? 'starts_on' : 'ends_on' => 'Term dates are locked because billing accounts exist for this school year.',
                ]);
            }
            $this->ensureDateOrder($startsOn, $endsOn);
            if (isset($validated['sequence'])) {
                $this->ensureTermSequenceAvailable($year->id, (int) $validated['sequence'], $current->id);
                $current->sequence = (int) $validated['sequence'];
            }
            if (isset($validated['name'])) {
                $current->name = trim($validated['name']);
            }
            $current->forceFill(['starts_on' => $startsOn, 'ends_on' => $endsOn]);

            if ($current->isDirty()) {
                $current->save();
                $auditLogger->record($request, 'term.updated', $current, $before, $this->termAudit($current));
            }

            return $current;
        });

        return response()->json(['data' => $this->termData($term->load('examPeriods'))]);
    }

    public function storeExamPeriod(Request $request, Term $term, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'starts_on' => ['required', self::DATE],
            'ends_on' => ['nullable', self::DATE, 'after:starts_on'],
        ]);

        $examPeriod = DB::transaction(function () use ($request, $term, $auditLogger, $validated): ExamPeriod {
            $examPeriod = new ExamPeriod;
            $examPeriod->forceFill([
                'term_id' => $term->id,
                'name' => trim($validated['name']),
                'starts_on' => $validated['starts_on'],
                'ends_on' => $validated['ends_on'] ?? null,
            ])->save();
            $auditLogger->record($request, 'exam_period.created', $examPeriod, null, $this->examPeriodData($examPeriod));

            return $examPeriod;
        });

        return response()->json(['data' => $this->examPeriodData($examPeriod)], 201);
    }

    public function updateExamPeriod(Request $request, ExamPeriod $examPeriod, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'starts_on' => ['sometimes', 'required', self::DATE],
            'ends_on' => ['sometimes', 'nullable', self::DATE],
        ]);

        $examPeriod = DB::transaction(function () use ($request, $examPeriod, $auditLogger, $validated): ExamPeriod {
            $current = ExamPeriod::query()->lockForUpdate()->findOrFail($examPeriod->id);
            $before = $this->examPeriodData($current);
            $startsOn = $validated['starts_on'] ?? $this->dateString($current->starts_on);
            $endsOn = array_key_exists('ends_on', $validated) ? $validated['ends_on'] : $this->dateString($current->ends_on);
            $this->ensureDateOrder($startsOn, $endsOn);
            if (isset($validated['name'])) {
                $current->name = trim($validated['name']);
            }
            $current->forceFill(['starts_on' => $startsOn, 'ends_on' => $endsOn]);

            if ($current->isDirty()) {
                $current->save();
                $auditLogger->record($request, 'exam_period.updated', $current, $before, $this->examPeriodData($current));
            }

            return $current;
        });

        return response()->json(['data' => $this->examPeriodData($examPeriod)]);
    }

    public function gradeLevels(): JsonResponse
    {
        $grades = GradeLevel::query()->with('sections')->orderBy('sort_order')->orderBy('id')->get();

        return response()->json(['data' => $grades->map(fn (GradeLevel $grade): array => $this->gradeLevelData($grade))->values()]);
    }

    public function storeGradeLevel(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
        ]);

        $grade = DB::transaction(function () use ($request, $auditLogger, $validated): GradeLevel {
            $this->ensureGradeLevelAvailable(trim($validated['name']), (int) $validated['sort_order']);
            $grade = new GradeLevel;
            $grade->forceFill(['name' => trim($validated['name']), 'sort_order' => (int) $validated['sort_order'], 'active' => true])->save();
            $auditLogger->record($request, 'grade_level.created', $grade, null, $this->gradeLevelAudit($grade));

            return $grade;
        });

        return response()->json(['data' => $this->gradeLevelData($grade->load('sections'))], 201);
    }

    public function updateGradeLevel(Request $request, GradeLevel $gradeLevel, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'sort_order' => ['sometimes', 'required', 'integer', 'min:0', 'max:65535'],
            'active' => ['sometimes', 'required', 'boolean'],
        ]);

        $grade = DB::transaction(function () use ($request, $gradeLevel, $auditLogger, $validated): GradeLevel {
            $grade = GradeLevel::query()->lockForUpdate()->findOrFail($gradeLevel->id);
            $before = $this->gradeLevelAudit($grade);
            $this->ensureGradeLevelAvailable(
                isset($validated['name']) ? trim($validated['name']) : null,
                isset($validated['sort_order']) ? (int) $validated['sort_order'] : null,
                $grade->id,
            );
            $grade->forceFill(array_filter([
                'name' => isset($validated['name']) ? trim($validated['name']) : null,
                'sort_order' => isset($validated['sort_order']) ? (int) $validated['sort_order'] : null,
                'active' => array_key_exists('active', $validated) ? (bool) $validated['active'] : null,
            ], fn ($value): bool => $value !== null));

            if ($grade->isDirty()) {
                $grade->save();
                $auditLogger->record($request, 'grade_level.updated', $grade, $before, $this->gradeLevelAudit($grade));
            }

            return $grade;
        });

        return response()->json(['data' => $this->gradeLevelData($grade->load('sections'))]);
    }

    public function storeSection(Request $request, GradeLevel $gradeLevel, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        $section = DB::transaction(function () use ($request, $gradeLevel, $auditLogger, $validated): Section {
            $this->ensureSectionAvailable($gradeLevel->id, trim($validated['name']));
            $section = new Section;
            $section->forceFill(['grade_level_id' => $gradeLevel->id, 'name' => trim($validated['name']), 'active' => true])->save();
            $auditLogger->record($request, 'section.created', $section, null, $this->sectionAudit($section));

            return $section;
        });

        return response()->json(['data' => $this->sectionData($section)], 201);
    }

    public function updateSection(Request $request, Section $section, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'active' => ['sometimes', 'required', 'boolean'],
        ]);

        $section = DB::transaction(function () use ($request, $section, $auditLogger, $validated): Section {
            $current = Section::query()->lockForUpdate()->findOrFail($section->id);
            $before = $this->sectionAudit($current);
            if (isset($validated['name'])) {
                $this->ensureSectionAvailable($current->grade_level_id, trim($validated['name']), $current->id);
                $current->name = trim($validated['name']);
            }
            if (array_key_exists('active', $validated)) {
                $current->active = (bool) $validated['active'];
            }

            if ($current->isDirty()) {
                $current->save();
                $auditLogger->record($request, 'section.updated', $current, $before, $this->sectionAudit($current));
            }

            return $current;
        });

        return response()->json(['data' => $this->sectionData($section)]);
    }

    private function datesLocked(SchoolYear $year): bool
    {
        return BillingAccount::query()->where('school_year_id', $year->id)->exists();
    }

    private function ensureSchoolYearLabelAvailable(string $label, ?int $exceptId = null): void
    {
        $duplicate = SchoolYear::query()
            ->whereRaw('LOWER(label) = ?', [mb_strtolower($label)])
            ->when($exceptId !== null, fn ($years) => $years->whereKeyNot($exceptId))
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages(['label' => 'That school-year label is already configured.']);
        }
    }

    private function ensureNoOverlap(string $startsOn, string $endsOn, ?int $exceptId = null): void
    {
        $overlapping = SchoolYear::query()
            ->whereDate('starts_on', '<=', $endsOn)
            ->whereDate('ends_on', '>=', $startsOn)
            ->when($exceptId !== null, fn ($years) => $years->whereKeyNot($exceptId))
            ->exists();

        if ($overlapping) {
            throw ValidationException::withMessages(['starts_on' => 'School-year dates overlap an existing school year.']);
        }
    }

    private function ensureDateOrder(?string $startsOn, ?string $endsOn): void
    {
        if ($startsOn !== null && $endsOn !== null && $startsOn >= $endsOn) {
            throw ValidationException::withMessages(['ends_on' => 'The end date must be after the start date.']);
        }
    }

    private function ensureTermSequenceAvailable(int $schoolYearId, int $sequence, ?int $exceptId = null): void
    {
        $duplicate = Term::query()
            ->where('school_year_id', $schoolYearId)
            ->where('sequence', $sequence)
            ->when($exceptId !== null, fn ($terms) => $terms->whereKeyNot($exceptId))
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages(['sequence' => 'That term sequence is already used in this school year.']);
        }
    }

    private function ensureGradeLevelAvailable(?string $name, ?int $sortOrder, ?int $exceptId = null): void
    {
        $others = fn () => GradeLevel::query()->when($exceptId !== null, fn ($grades) => $grades->whereKeyNot($exceptId));

        if ($name !== null && $others()->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->exists()) {
            throw ValidationException::withMessages(['name' => 'That grade level is already configured.']);
        }
        if ($sortOrder !== null && $others()->where('sort_order', $sortOrder)->exists()) {
            throw ValidationException::withMessages(['sort_order' => 'That sort order is already used by another grade level.']);
        }
    }

    private function ensureSectionAvailable(int $gradeLevelId, string $name, ?int $exceptId = null): void
    {
        $duplicate = Section::query()
            ->where('grade_level_id', $gradeLevelId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->when($exceptId !== null, fn ($sections) => $sections->whereKeyNot($exceptId))
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages(['name' => 'That section is already configured for this grade level.']);
        }
    }

    private function dateString(mixed $value): ?string
    {
        return $value === null ? null : substr((string) $value, 0, 10);
    }

    /** @return array<string, mixed> */
    private function schoolYearData(SchoolYear $year, bool $datesLocked): array
    {
        return [
            'id' => (string) $year->id,
            'label' => $year->label,
            'current' => (bool) $year->is_current,
            'startsOn' => $this->dateString($year->starts_on),
            'endsOn' => $this->dateString($year->ends_on),
            'datesLocked' => $datesLocked,
            'terms' => $year->terms->map(fn (Term $term): array => $this->termData($term))->values()->all(),
        ];
    }

    /** @return array<string, mixed> */
    private function schoolYearAudit(SchoolYear $year): array
    {
        return [
            'label' => $year->label,
            'is_current' => (bool) $year->is_current,
            'starts_on' => $this->dateString($year->starts_on),
            'ends_on' => $this->dateString($year->ends_on),
        ];
    }

    /** @return array<string, mixed> */
    private function termData(Term $term): array
    {
        return [
            'id' => (string) $term->id,
            'schoolYearId' => (string) $term->school_year_id,
            'name' => $term->name,
            'sequence' => (int) $term->sequence,
            'startsOn' => $this->dateString($term->starts_on),
            'endsOn' => $this->dateString($term->ends_on),
            'examPeriods' => $term->relationLoaded('examPeriods')
                ? $term->examPeriods->map(fn (ExamPeriod $period): array => $this->examPeriodData($period))->values()->all()
                : [],
        ];
    }

    /** @return array<string, mixed> */
    private function termAudit(Term $term): array
    {
        return [
            'school_year_id' => (int) $term->school_year_id,
            'name' => $term->name,
            'sequence' => (int) $term->sequence,
            'starts_on' => $this->dateString($term->starts_on),
            'ends_on' => $this->dateString($term->ends_on),
        ];
    }

    /** @return array<string, mixed> */
    private function examPeriodData(ExamPeriod $period): array
    {
        return [
            'id' => (string) $period->id,
            'termId' => (string) $period->term_id,
            'name' => $period->name,
            'startsOn' => $this->dateString($period->starts_on),
            'endsOn' => $this->dateString($period->ends_on),
        ];
    }

    /** @return array<string, mixed> */
    private function gradeLevelData(GradeLevel $grade): array
    {
        return [
            'id' => (string) $grade->id,
            'name' => $grade->name,
            'sortOrder' => (int) $grade->sort_order,
            'active' => (bool) $grade->active,
            'sections' => $grade->relationLoaded('sections')
                ? $grade->sections->map(fn (Section $section): array => $this->sectionData($section))->values()->all()
                : [],
        ];
    }

    /** @return array<string, mixed> */
    private function gradeLevelAudit(GradeLevel $grade): array
    {
        return ['name' => $grade->name, 'sort_order' => (int) $grade->sort_order, 'active' => (bool) $grade->active];
    }

    /** @return array<string, mixed> */
    private function sectionData(Section $section): array
    {
        return [
            'id' => (string) $section->id,
            'gradeLevelId' => (string) $section->grade_level_id,
            'name' => $section->name,
            'active' => (bool) $section->active,
        ];
    }

    /** @return array<string, mixed> */
    private function sectionAudit(Section $section): array
    {
        return ['grade_level_id' => (int) $section->grade_level_id, 'name' => $section->name, 'active' => (bool) $section->active];
    }
}
