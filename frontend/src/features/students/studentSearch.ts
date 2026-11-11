import { students, type Student } from "@/api/mock";

export function normalizeStudentSearchQuery(query: string) {
  return query.trim().toLocaleLowerCase();
}

export function studentMatchesSearch(student: Student, query: string) {
  const normalizedQuery = normalizeStudentSearchQuery(query);

  return (
    !normalizedQuery ||
    student.name.toLocaleLowerCase().startsWith(normalizedQuery) ||
    student.lrn.toLocaleLowerCase().startsWith(normalizedQuery)
  );
}

export function getStudentSearchMatches(query: string) {
  const normalizedQuery = normalizeStudentSearchQuery(query);

  if (!normalizedQuery) return [];

  return students.filter((student) => studentMatchesSearch(student, normalizedQuery));
}
