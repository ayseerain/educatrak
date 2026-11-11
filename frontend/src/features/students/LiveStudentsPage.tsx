import { BackButton } from "@/components/ui/BackButton";
import { cn } from "@/lib/cn";
import { Button, buttonVariants } from "@/components/ui/Button";
import { useQuery } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createStudent, getStudent, getStudentRecordOptions, listStudents, updateStudent } from "@/api/cashierApi";
import { Card, CARD_SURFACE } from "@/components/ui/Card";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
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
  const canSeeAmounts = can(user, "student.financial.view");

  return <>
    <div className="page-header-card mb-5 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-text-primary">Students</h1><p className="mt-1 text-sm text-text-secondary">Search enrollment records by student name or number.</p></div>{can(user, "student.edit") && <Link className={buttonVariants({ variant: "primary" })} to="/students/new">Add student</Link>}</div>
    <Card className="p-0">
      <div className="border-b border-border px-5 py-3"><TableFilters embedded scope="Students" defaults={studentFilterDefaults} draft={filters.draft} applied={filters.applied} search={{ key: "query", label: "Search students", placeholder: "Name or LRN" }} fields={[
      { key: "grade", label: "Filter by grade", placeholder: "Grade name" },
      { key: "section", label: "Filter by section", placeholder: "Section name" },
      { key: "status", label: "Filter by enrollment status", type: "select", options: [{ value: "", label: "All statuses" }, { value: "enrolled", label: "Enrolled" }, { value: "inactive", label: "Inactive" }] },
    ]} onChange={filters.update} onSearch={filters.search} onApply={filters.apply} onClear={filters.clear} onRemove={filters.remove} /></div>
      {result.isPending && <LoadingState message="Loading students…" layout="table" bare columns={5} />}
      {result.isError && <ErrorState message={result.error.message} onRetry={() => void result.refetch()} />}
      {result.data && (result.data.data.length === 0 ? <EmptyState message="No students match these filters." /> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead><tr className="border-b border-border text-xs font-semibold text-text-secondary"><th scope="col" className="px-3 py-2">Student</th><th scope="col" className="px-3 py-2">LRN</th><th scope="col" className="px-3 py-2">Grade & section</th>{canSeeAmounts && <th scope="col" className="px-3 py-2 text-right">Current school-year balance</th>}<th scope="col" className="px-3 py-2">Status</th></tr></thead><tbody>{result.data.data.map((student) => <tr key={student.id} className="border-b last:border-0"><td className="px-3 py-2 font-medium"><Link className="text-brand-green-dark underline decoration-brand-green-dark/40 underline-offset-2 transition-colors hover:text-brand-green hover:decoration-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark" to={`/students/${student.id}`}>{student.fullName}</Link></td><td className="px-3 py-2 font-mono">{student.lrn}</td><td className="px-3 py-2">{[student.gradeLevel, student.section].filter(Boolean).join(" · ") || "Unassigned"}</td>{canSeeAmounts && <td className="px-3 py-2 text-right font-mono">{student.balanceCents === undefined ? "Unavailable" : format(centavos(student.balanceCents))}</td>}<td className="px-3 py-2 capitalize">{student.status.replace(/_/g, " ")}</td></tr>)}</tbody></table><PaginationControls currentPage={result.data.currentPage} lastPage={result.data.lastPage} perPage={result.data.perPage} total={result.data.total} label="students" busy={result.isFetching} onPageChange={filters.setPage} onPerPageChange={filters.changePerPage} /></div>)}
    </Card>
  </>;
}

export function LiveStudentProfilePage({ user }: { user: AuthenticatedUser }) {
  const { id = "" } = useParams();
  const result = useQuery({ queryKey: ["student", id], queryFn: () => getStudent(id), enabled: Boolean(id) });
  if (result.isPending) return <LoadingState message="Loading student record…" layout="detail" />;
  if (result.isError) return <ErrorState message={result.error.message} onRetry={() => void result.refetch()} />;
  const student = result.data;
  return <>
    <BackButton to="/students" label="Back to students" className="mb-2" /><div className={cn(CARD_SURFACE, "mb-5 flex flex-wrap items-start justify-between gap-3 p-5")}><div><h1 className="text-2xl font-bold tracking-tight">{student.fullName}</h1><p className="mt-1 text-sm text-text-secondary">LRN {student.lrn}</p></div><div className="flex flex-wrap gap-2">{can(user, "student.edit") && <Link className={buttonVariants({ variant: "secondary" })} to={`/students/${encodeURIComponent(student.id)}/edit`}>Edit student</Link>}{can(user, "payment.record") && <Link className={buttonVariants({ variant: "secondary" })} to={`/payments/new?student=${encodeURIComponent(student.id)}`}>Record payment</Link>}{canViewReport(user, "statement") && <Link className={buttonVariants({ variant: "primary" })} to={`/reports/student/${encodeURIComponent(student.id)}`}>View statement</Link>}</div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card><p className="text-sm font-semibold text-text-secondary">Grade</p><p className="mt-2 font-semibold">{student.gradeLevel ?? "Unassigned"}</p></Card><Card><p className="text-sm font-semibold text-text-secondary">Section</p><p className="mt-2 font-semibold">{student.section ?? "Unassigned"}</p></Card><Card><p className="text-sm font-semibold text-text-secondary">Enrollment status</p><p className="mt-2 font-semibold capitalize">{student.status.replace(/_/g, " ")}</p></Card>{can(user, "student.financial.view") && <Card><p className="text-sm font-semibold text-text-secondary">Current school-year balance</p><p className="mt-2 font-semibold">{student.balanceCents === undefined ? "Unavailable" : format(centavos(student.balanceCents))}</p></Card>}</div>
    <Card className="mt-5"><h2 className="text-base font-semibold text-text-primary">Student overview</h2><p className="mt-2 text-sm text-text-secondary">Additional student record sections are not available in this view yet.</p></Card>
    {can(user, "guardianContact.view") && student.guardians && <Card className="mt-5"><h2 className="text-base font-semibold text-text-primary">Guardian contacts</h2>{student.guardians.length === 0 ? <p className="mt-2 text-sm text-text-secondary">No guardian contacts are recorded.</p> : <ul className="mt-3 divide-y divide-border">{student.guardians.map((guardian, index) => <li key={`${guardian.fullName}-${index}`} className="py-3 first:pt-0 last:pb-0"><p className="font-medium">{guardian.fullName} <span className="font-normal text-text-secondary">({guardian.relationship})</span></p><div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-secondary"><span>{guardian.email ?? "No email recorded"}</span><span>{guardian.mobile ?? "No mobile recorded"}</span><span>Email status: {guardian.emailStatus}</span></div></li>)}</ul>}</Card>}
  </>;
}

export function LiveStudentFormPage({ edit = false }: { edit?: boolean }) {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const options = useQuery({ queryKey: ["student-record-options"], queryFn: getStudentRecordOptions });
  const current = useQuery({ queryKey: ["student", id], queryFn: () => getStudent(id), enabled: edit && Boolean(id) });
  const [lrn, setLrn] = useState("");
  const [fullName, setFullName] = useState("");
  const [gradeLevelId, setGradeLevelId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [status, setStatus] = useState("enrolled");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianMobile, setGuardianMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const grade = options.data?.grades.find((item) => item.id === gradeLevelId);

  useEffect(() => {
    if (!current.data || !options.data) return;
    setLrn(current.data.lrn);
    setFullName(current.data.fullName);
    setStatus(current.data.status);
    const matchedGrade = options.data.grades.find((item) => item.name === current.data.gradeLevel);
    setGradeLevelId(matchedGrade?.id ?? "");
    setSectionId(matchedGrade?.sections.find((item) => item.name === current.data.section)?.id ?? "");
    const guardian = current.data.guardians?.[0];
    setGuardianName(guardian?.fullName ?? "");
    setGuardianRelationship(guardian?.relationship ?? "");
    setGuardianEmail(guardian?.email ?? "");
    setGuardianMobile(guardian?.mobile ?? "");
  }, [current.data, options.data]);

  if (options.isPending || current.isPending) return <LoadingState message="Loading student record form…" layout="detail" />;
  if (options.isError || current.isError) return <ErrorState message={(options.error ?? current.error)?.message ?? "Student record form could not be loaded."} onRetry={() => { void options.refetch(); void current.refetch(); }} />;
  if (edit && !current.data) return <EmptyState message="The requested student record is not available." />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const input = { lrn, fullName, gradeLevelId, sectionId, status: edit ? status : "enrolled", guardianName, guardianRelationship, guardianEmail, guardianMobile };
      const saved = edit ? await updateStudent(id, input) : await createStudent(input);
      navigate(`/students/${saved.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The student record could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const gradeOptions = [{ value: "", label: "Select grade" }, ...(options.data?.grades.map((item) => ({ value: item.id, label: item.name })) ?? [])];
  const sectionOptions = [{ value: "", label: grade ? "Select section" : "Select grade first" }, ...(grade?.sections.map((item) => ({ value: item.id, label: item.name })) ?? [])];
  const statusOptions = options.data?.statuses.map((item) => ({ value: item, label: item.replace(/_/g, " ") })) ?? [];

  return <><BackButton to={edit ? `/students/${id}` : "/students"} label="Back to students" className="mb-2" /><div className="page-header-card mb-5"><h1 className="text-2xl font-bold tracking-tight text-text-primary">{edit ? "Edit student" : "Add student"}</h1><p className="mt-1 text-sm text-text-secondary">Maintain student identity, grade level, section, and enrollment status.</p></div><form className="space-y-5" onSubmit={submit}><Card className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">LRN<input required inputMode="numeric" pattern="[0-9]{12}" readOnly={edit} value={lrn} onChange={(event) => setLrn(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-border px-3" /></label><label className="text-sm font-medium">Student name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-border px-3" /></label><label className="text-sm font-medium">Grade level<span className="mt-1 block"><DropdownSelect aria-label="Grade level" value={gradeLevelId} options={gradeOptions} onChange={(value) => { setGradeLevelId(value); setSectionId(""); }} className="w-full" align="start" /></span></label><label className="text-sm font-medium">Section<span className="mt-1 block"><DropdownSelect aria-label="Section" value={sectionId} options={sectionOptions} onChange={setSectionId} disabled={!grade} className="w-full" align="start" /></span></label><label className="text-sm font-medium">Enrollment status<span className="mt-1 block"><DropdownSelect aria-label="Enrollment status" value={status} options={statusOptions} onChange={setStatus} disabled className="w-full" align="start" /></span></label></Card>{error && <p role="alert" className="text-sm text-status-error">{error}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => navigate(edit ? `/students/${id}` : "/students")}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : edit ? "Save changes" : "Create student"}</Button></div></form></>;
}
