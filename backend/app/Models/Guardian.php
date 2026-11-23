<?php

namespace App\Models;

use Database\Factories\GuardianFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Http\Exceptions\HttpResponseException;

class Guardian extends Model
{
    /** @use HasFactory<GuardianFactory> */
    use HasFactory;

    protected $fillable = [
        'full_name',
        'relationship',
        'email',
        'email_status',
        'mobile',
    ];

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class)->withPivot('is_primary', 'relationship')->withTimestamps();
    }

    /**
     * A guardian is one shared identity: a contact edit reaches every linked student, so the
     * Registrar must confirm after seeing them (SRS v3.0 guardian policy, 2026-11-23).
     *
     * @return list<string> IDs of the linked students
     */
    public function assertSharedContactChangeConfirmed(bool $confirmed): array
    {
        $students = $this->students()->orderBy('students.full_name')->get(['students.id', 'students.lrn', 'students.full_name']);

        if ($students->count() > 1 && ! $confirmed) {
            throw new HttpResponseException(response()->json([
                'message' => 'This guardian is linked to more than one student. Confirm the contact change for every linked student.',
                'code' => 'shared_guardian_confirmation_required',
                'affectedStudents' => $students->map(fn (Student $student): array => [
                    'id' => (string) $student->id,
                    'lrn' => $student->lrn,
                    'fullName' => $student->full_name,
                ])->values(),
            ], 409));
        }

        return $students->map(fn (Student $student): string => (string) $student->id)->values()->all();
    }
}
