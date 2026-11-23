<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Student;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GuardianController extends Controller
{
    public function store(Request $request, Student $student, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate($this->guardianRules(true));

        $guardian = DB::transaction(function () use ($request, $student, $validated, $auditLogger): Guardian {
            $lockedStudent = Student::query()->lockForUpdate()->findOrFail($student->id);
            $guardian = Guardian::query()->create([
                ...$this->guardianAttributes($validated),
                'relationship' => trim($validated['relationship']),
            ]);
            $lockedStudent->guardians()->attach($guardian->id, [
                'is_primary' => $validated['is_primary'],
                'relationship' => $validated['relationship'],
            ]);
            $this->setPrimary($lockedStudent, $guardian, $validated['is_primary']);
            $auditLogger->record($request, 'guardian.created', $guardian, null, $this->auditLinkData($lockedStudent, $guardian, $validated['relationship']));

            return $guardian;
        });

        return response()->json(['data' => $this->guardianData($student, $guardian)], 201);
    }

    public function link(Request $request, Student $student, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'guardian_id' => ['required', 'integer', 'exists:guardians,id'],
            'relationship' => ['required', 'string', 'max:100'],
            'is_primary' => ['required', 'boolean'],
        ]);

        $guardian = DB::transaction(function () use ($request, $student, $validated, $auditLogger): Guardian {
            $lockedStudent = Student::query()->lockForUpdate()->findOrFail($student->id);
            $guardian = Guardian::query()->lockForUpdate()->findOrFail($validated['guardian_id']);
            if ($lockedStudent->guardians()->whereKey($guardian->id)->exists()) {
                throw ValidationException::withMessages(['guardian_id' => 'This guardian is already linked to the student.']);
            }

            $lockedStudent->guardians()->attach($guardian->id, [
                'is_primary' => $validated['is_primary'],
                'relationship' => $validated['relationship'],
            ]);
            $this->setPrimary($lockedStudent, $guardian, $validated['is_primary']);
            $auditLogger->record($request, 'guardian.linked', $guardian, null, $this->auditLinkData($lockedStudent, $guardian, $validated['relationship']));

            return $guardian;
        });

        return response()->json(['data' => $this->guardianData($student, $guardian)], 201);
    }

    public function update(Request $request, Student $student, Guardian $guardian, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate($this->guardianRules(false));
        if ($validated === []) {
            throw ValidationException::withMessages(['guardian' => 'Provide at least one guardian or relationship field to update.']);
        }

        $updated = DB::transaction(function () use ($request, $student, $guardian, $validated, $auditLogger): Guardian {
            $lockedStudent = Student::query()->lockForUpdate()->findOrFail($student->id);
            $lockedGuardian = Guardian::query()->lockForUpdate()->findOrFail($guardian->id);
            $pivot = $lockedStudent->guardians()->whereKey($lockedGuardian->id)->first()?->pivot;
            if ($pivot === null) {
                abort(404);
            }

            $contactFields = array_intersect(array_keys($validated), ['full_name', 'email', 'mobile']);
            if ($contactFields !== [] && $lockedGuardian->students()->count() > 1) {
                throw ValidationException::withMessages([
                    'guardian' => 'A shared guardian contact cannot be changed until the Academy defines shared-contact editing policy.',
                ]);
            }

            $before = $this->auditLinkData($lockedStudent, $lockedGuardian, $pivot->relationship);
            if ($contactFields !== []) {
                $lockedGuardian->fill($this->guardianAttributes($validated));
                if (array_key_exists('email', $validated)) {
                    $lockedGuardian->email_status = filled($validated['email']) ? 'unverified' : 'missing';
                }
                $lockedGuardian->save();
            }
            if (array_key_exists('relationship', $validated)) {
                $lockedStudent->guardians()->updateExistingPivot($lockedGuardian->id, ['relationship' => $validated['relationship']]);
            }
            if (($validated['is_primary'] ?? null) === true) {
                $this->setPrimary($lockedStudent, $lockedGuardian, true);
            }
            if (($validated['is_primary'] ?? null) === false && $pivot->is_primary) {
                throw ValidationException::withMessages(['is_primary' => 'Choose another linked guardian as primary before removing this status.']);
            }
            $afterRelationship = $validated['relationship'] ?? $pivot->relationship;
            $auditLogger->record($request, 'guardian.updated', $lockedGuardian, $before, $this->auditLinkData($lockedStudent, $lockedGuardian, $afterRelationship, $contactFields));

            return $lockedGuardian->refresh();
        });

        return response()->json(['data' => $this->guardianData($student, $updated)]);
    }

    public function makePrimary(Request $request, Student $student, Guardian $guardian, AuditLogger $auditLogger): JsonResponse
    {
        $updated = DB::transaction(function () use ($request, $student, $guardian, $auditLogger): Guardian {
            $lockedStudent = Student::query()->lockForUpdate()->findOrFail($student->id);
            $lockedGuardian = Guardian::query()->lockForUpdate()->findOrFail($guardian->id);
            $pivot = $lockedStudent->guardians()->whereKey($lockedGuardian->id)->first()?->pivot;
            if ($pivot === null) {
                abort(404);
            }
            $before = $this->auditLinkData($lockedStudent, $lockedGuardian, $pivot->relationship);
            $this->setPrimary($lockedStudent, $lockedGuardian, true);
            $auditLogger->record($request, 'guardian.primary_changed', $lockedGuardian, $before, $this->auditLinkData($lockedStudent, $lockedGuardian, $pivot->relationship));

            return $lockedGuardian;
        });

        return response()->json(['data' => $this->guardianData($student, $updated)]);
    }

    public function destroy(Request $request, Student $student, Guardian $guardian, AuditLogger $auditLogger): JsonResponse
    {
        DB::transaction(function () use ($request, $student, $guardian, $auditLogger): void {
            $lockedStudent = Student::query()->lockForUpdate()->findOrFail($student->id);
            $lockedGuardian = Guardian::query()->lockForUpdate()->findOrFail($guardian->id);
            $pivot = $lockedStudent->guardians()->whereKey($lockedGuardian->id)->first()?->pivot;
            if ($pivot === null) {
                abort(404);
            }
            if ($pivot->is_primary) {
                throw ValidationException::withMessages([
                    'guardian' => 'A primary guardian cannot be unlinked until the Academy defines the required replacement or primary-contact workflow.',
                ]);
            }

            $before = $this->auditLinkData($lockedStudent, $lockedGuardian, $pivot->relationship);
            $lockedStudent->guardians()->detach($lockedGuardian->id);
            $auditLogger->record($request, 'guardian.unlinked', $lockedGuardian, $before, null);
        });

        return response()->json(null, 204);
    }

    /** @return array<string, array<int, string>> */
    private function guardianRules(bool $creating): array
    {
        $required = $creating ? 'required' : 'sometimes';

        return [
            'full_name' => [$required, 'string', 'max:255'],
            'relationship' => [$required, 'string', 'max:100'],
            'is_primary' => [$required, 'boolean'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'mobile' => ['sometimes', 'nullable', 'string', 'max:32'],
        ];
    }

    /** @param array<string, mixed> $validated @return array<string, mixed> */
    private function guardianAttributes(array $validated): array
    {
        $attributes = [];
        foreach (['full_name', 'email', 'mobile'] as $field) {
            if (array_key_exists($field, $validated)) {
                $attributes[$field] = is_string($validated[$field]) ? trim($validated[$field]) : $validated[$field];
            }
        }
        if (array_key_exists('email', $validated)) {
            $attributes['email_status'] = filled($attributes['email']) ? 'unverified' : 'missing';
        }

        return $attributes;
    }

    /** @param list<string> $changedContactFields @return array<string, mixed> */
    private function auditLinkData(Student $student, Guardian $guardian, string $relationship, array $changedContactFields = []): array
    {
        return [
            'student_id' => (string) $student->id,
            'guardian_id' => (string) $guardian->id,
            'relationship' => $relationship,
            'changed_contact_fields' => $changedContactFields,
        ];
    }

    /** @return array<string, mixed> */
    private function guardianData(Student $student, Guardian $guardian): array
    {
        $pivot = $student->guardians()->whereKey($guardian->id)->firstOrFail()->pivot;

        return [
            'id' => (string) $guardian->id,
            'fullName' => $guardian->full_name,
            'relationship' => $pivot->relationship ?? $guardian->relationship,
            'isPrimary' => (bool) $pivot->is_primary,
            'email' => $guardian->email,
            'mobile' => $guardian->mobile,
            'emailStatus' => $guardian->email_status,
        ];
    }

    private function setPrimary(Student $student, Guardian $guardian, bool $isPrimary): void
    {
        $hasPrimary = $student->guardians()->wherePivot('is_primary', true)->exists();
        if (! $isPrimary && ! $hasPrimary) {
            throw ValidationException::withMessages(['is_primary' => 'The first guardian link must be primary.']);
        }
        if ($isPrimary) {
            $student->guardians()->newPivotStatement()->where('student_id', $student->id)->update(['is_primary' => false]);
            $student->guardians()->updateExistingPivot($guardian->id, ['is_primary' => true]);
        }
    }
}
