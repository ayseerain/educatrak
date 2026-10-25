import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getStudent, listStudents } from "@/api/cashierApi";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { TableFilters, useTableFilters } from "@/components/ui/TableFilters";
import { centavos, format } from "@/lib/money";
import { can, canViewReport } from "@/lib/permissions";
import type { AuthenticatedUser } from "@/lib/types";

const studentFilterDefaults = { query: "", grade: "", section: "", status: "" };

export function LiveStudentsPage({ user }: { user: AuthenticatedUser }) {
  const filters = useTableFilters(studentFilterDefaults);
  const result = useQuery({ queryKey: ["students", filters.applied, filters.page, filters.perPage], queryFn: () => listStudents({ ...filters.applied, page: filters.page, perPage: filters.perPage }) });
  const canSeeAmounts = can(user, "account.view");

  return <>
    <div className="mb-5"><h1 className="text-2xl font-semibold">Students</h1><p className="mt-1 text-sm text-text-secondary">Search enrollment records by student name or number.</p></div>
    <TableFilters scope="Students" defaults={studentFilterDefaults} draft={filters.draft} applied={filters.applied} search={{ key: "query", label: "Search students", placeholder: "Name or student number" }} fields={[
      { key: "grade", label: "Filter by grade", placeholder: "Grade name" },
      { key: "section", label: "Filter by section", placeholder: "Section name" },
      { key: "status", label: "Filter by enrollment status", type: "select", options: [{ value: "", label: "All statuses" }, { value: "enrolled", label: "Enrolled" }, { value: "inactive", label: "Inactive" }] },
    ]} onChange={filters.update} onSearch={filters.search} onApply={filters.apply} onReset={filters.reset} onClear={filters.clear} onRemove={filters.remove} />
    {result.isPending && <LoadingState message="Loading students…" />}
    {result.isError && <ErrorState message={result.error.message} onRetry={() => void result.refetch()} />}
    {result.data && (result.data.data.length === 0 ? <Card><EmptyState message="No students match these filters." /></Card> : <Card className="overflow-x-auto p-0"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead><tr className="border-b bg-surface text-xs uppercase text-text-secondary"><th scope="col" className="px-4 py-3">Student</th><th scope="col" className="px-4 py-3">Student no.</th><th scope="col" className="px-4 py-3">Grade & section</th>{canSeeAmounts && <th scope="col" className="px-4 py-3 text-right">Current school-year balance</th>}<th scope="col" className="px-4 py-3">Status</th></tr></thead><tbody>{result.data.data.map((student) => <tr key={student.id} className="border-b last:border-0"><td className="px-4 py-3 font-medium"><Link className="text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark" to={`/students/${student.id}`}>{student.fullName}</Link></td><td className="px-4 py-3 font-mono">{student.studentNo}</td><td className="px-4 py-3">{[student.gradeLevel, student.section].filter(Boolean).join(" · ") || "Unassigned"}</td>{canSeeAmounts && <td className="px-4 py-3 text-right font-mono">{student.balanceCents === undefined ? "Unavailable" : format(centavos(student.balanceCents))}</td>}<td className="px-4 py-3 capitalize">{student.status.replace(/_/g, " ")}</td></tr>)}</tbody></table><PaginationControls currentPage={result.data.currentPage} lastPage={result.data.lastPage} perPage={result.data.perPage} total={result.data.total} label="students" busy={result.isFetching} onPageChange={filters.setPage} onPerPageChange={filters.changePerPage} /></Card>)}
  </>;
}

export function LiveStudentProfilePage({ user }: { user: AuthenticatedUser }) {
  const { id = "" } = useParams();
  const result = useQuery({ queryKey: ["student", id], queryFn: () => getStudent(id), enabled: Boolean(id) });
  if (result.isPending) return <LoadingState message="Loading student record…" />;
  if (result.isError) return <ErrorState message={result.error.message} onRetry={() => void result.refetch()} />;
  const student = result.data;
  return <>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><Link className="text-sm text-brand-green-dark underline" to="/students">Back to students</Link><h1 className="mt-2 text-2xl font-semibold">{student.fullName}</h1><p className="mt-1 text-sm text-text-secondary">Student no. {student.studentNo}</p></div><div className="flex flex-wrap gap-2">{can(user, "payment.record") && <Link className="inline-flex min-h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-text-primary hover:bg-surface" to={`/payments/new?student=${encodeURIComponent(student.id)}`}>Record payment</Link>}{canViewReport(user, "statement") && <Link className="inline-flex min-h-10 items-center justify-center rounded-md bg-brand-green-dark px-4 text-sm font-medium text-white hover:bg-[#023d12]" to={`/reports/student/${encodeURIComponent(student.id)}`}>View statement</Link>}</div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card><p className="text-xs font-medium uppercase text-text-secondary">Grade</p><p className="mt-2 font-semibold">{student.gradeLevel ?? "Unassigned"}</p></Card><Card><p className="text-xs font-medium uppercase text-text-secondary">Section</p><p className="mt-2 font-semibold">{student.section ?? "Unassigned"}</p></Card><Card><p className="text-xs font-medium uppercase text-text-secondary">Enrollment status</p><p className="mt-2 font-semibold capitalize">{student.status.replace(/_/g, " ")}</p></Card>{can(user, "account.view") && <Card><p className="text-xs font-medium uppercase text-text-secondary">Current school-year balance</p><p className="mt-2 font-semibold">{student.balanceCents === undefined ? "Unavailable" : format(centavos(student.balanceCents))}</p></Card>}</div>
    <Card className="mt-5"><h2 className="font-semibold">Student overview</h2><p className="mt-2 text-sm text-text-secondary">{user.role === "registrar" ? "This view contains enrollment details only." : "Additional student record sections are not available in this view yet."}</p></Card>
    {can(user, "guardianContact.view") && student.guardians && <Card className="mt-5"><h2 className="font-semibold">Guardian contacts</h2>{student.guardians.length === 0 ? <p className="mt-2 text-sm text-text-secondary">No guardian contacts are recorded.</p> : <ul className="mt-3 divide-y divide-border">{student.guardians.map((guardian, index) => <li key={`${guardian.fullName}-${index}`} className="py-3 first:pt-0 last:pb-0"><p className="font-medium">{guardian.fullName} <span className="font-normal text-text-secondary">({guardian.relationship})</span></p><div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-secondary"><span>{guardian.email ?? "No email recorded"}</span><span>{guardian.mobile ?? "No mobile recorded"}</span><span>Email status: {guardian.emailStatus}</span></div></li>)}</ul>}</Card>}
  </>;
}
