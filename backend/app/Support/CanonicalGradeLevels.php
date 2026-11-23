<?php

namespace App\Support;

use App\Models\GradeLevel;

/** The approved, immutable academic grade catalogue. */
final class CanonicalGradeLevels
{
    /** @var array<int, string> */
    public const NAMES = [
        'Kinder',
        'Grade 1',
        'Grade 2',
        'Grade 3',
        'Grade 4',
        'Grade 5',
        'Grade 6',
        'Grade 7',
        'Grade 8',
        'Grade 9',
        'Grade 10',
        'Grade 11',
        'Grade 12',
    ];

    /**
     * Creates only missing canonical records. Existing rows, including their
     * identifiers, active state, order, and relationships, are never changed.
     */
    public static function ensure(): void
    {
        $existing = GradeLevel::query()->get(['id', 'name', 'sort_order']);
        $canonicalByName = array_flip(array_map(mb_strtolower(...), self::NAMES));

        foreach ($existing as $grade) {
            $expectedOrder = $canonicalByName[mb_strtolower($grade->name)] ?? null;
            if ($expectedOrder !== null && $grade->sort_order !== $expectedOrder) {
                throw new \LogicException("Grade level {$grade->id} ({$grade->name}) has a noncanonical sort order and must be reconciled before initialization.");
            }
            if ($expectedOrder === null && in_array($grade->sort_order, array_keys(self::NAMES), true)) {
                throw new \LogicException("Grade level {$grade->id} ({$grade->name}) uses a canonical sort order and must be reconciled before initialization.");
            }
        }

        foreach (self::NAMES as $sortOrder => $name) {
            if (! GradeLevel::query()->where('name', $name)->exists()) {
                (new GradeLevel)->forceFill(['name' => $name, 'sort_order' => $sortOrder, 'active' => true])->save();
            }
        }
    }
}
