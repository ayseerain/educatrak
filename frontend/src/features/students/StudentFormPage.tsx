import { createStudent, getStudent, getStudentRecordOptions, updateStudent } from "@/api/cashierApi";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function StudentFormPage({ edit = false }: { edit?: boolean }) {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const options = useQuery({ queryKey: ["student-record-options"], queryFn: getStudentRecordOptions });
  const current = useQuery({ queryKey: ["student", id], queryFn: () => getStudent(id), enabled: edit && Boolean(id) });
  const [lrn, setStudentNo] = useState("");
  const [fullName, setFullName] = useState("");
  const [gradeLevelId, setGradeLevelId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [status, setStatus] = useState("enrolled");
  const [guardianId, setGuardianId] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianMobile, setGuardianMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!current.data || !options.data) return;
    const grade = options.data.grades.find((item) => item.name === current.data.gradeLevel);
    const guardian = current.data.guardians?.[0];
    setGuardianId(guardian?.id ?? "");
    setStudentNo(current.data.lrn);
    setFullName(current.data.fullName);
    setGradeLevelId(grade?.id ?? "");
    setSectionId(grade?.sections.find((item) => item.name === current.data.section)?.id ?? "");
    setStatus(current.data.status);
    setGuardianName(guardian?.fullName ?? "");
    setGuardianRelationship(guardian?.relationship ?? "");
    setGuardianEmail(guardian?.email ?? "");
    setGuardianMobile(guardian?.mobile ?? "");
  }, [current.data, options.data]);

  if (options.isPending || current.isPending) return <LoadingState message="Loading student record form…" layout="detail" />;
  if (options.isError || current.isError) return <ErrorState message={(options.error ?? current.error)?.message ?? "Student record form could not be loaded."} onRetry={() => { void options.refetch(); void current.refetch(); }} />;
  if (edit && !current.data) return <EmptyState message="The requested student record is not available." />;

  const grade = options.data.grades.find((item) => item.id === gradeLevelId);
  const gradeOptions = [{ value: "", label: "Select grade" }, ...options.data.grades.map((item) => ({ value: item.id, label: item.name }))];
  const sectionOptions = [{ value: "", label: grade ? "Select section" : "Select grade first" }, ...(grade?.sections.map((item) => ({ value: item.id, label: item.name })) ?? [])];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const input = { lrn, fullName, gradeLevelId, sectionId, status, guardianId: edit ? guardianId : undefined, guardianName, guardianRelationship, guardianEmail, guardianMobile };
      const saved = edit ? await updateStudent(id, input) : await createStudent(input);
      navigate(`/students/${saved.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The student record could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return <><BackButton to={edit ? `/students/${id}` : "/students"} label="Back to students" className="mb-2" /><div className="page-header-card mb-5"><h1 className="text-2xl font-bold tracking-tight text-text-primary">{edit ? "Edit student" : "Add student"}</h1><p className="mt-1 text-sm text-text-secondary">Maintain student identity and guardian contact details.</p></div><form className="space-y-5" onSubmit={submit}><Card className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">LRN<input required value={lrn} onChange={(event) => setStudentNo(event.target.value)} className="form-control mt-1 w-full" /></label><label className="text-sm font-medium">Student name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="form-control mt-1 w-full" /></label><label className="text-sm font-medium">Grade level<span className="mt-1 block"><DropdownSelect aria-label="Grade level" value={gradeLevelId} options={gradeOptions} onChange={(value) => { setGradeLevelId(value); setSectionId(""); }} className="w-full" /></span></label><label className="text-sm font-medium">Section<span className="mt-1 block"><DropdownSelect aria-label="Section" value={sectionId} options={sectionOptions} onChange={setSectionId} disabled={!grade} className="w-full" /></span></label></Card><Card><h2 className="text-base font-semibold text-text-primary">Guardian contact</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Guardian name<input value={guardianName} onChange={(event) => setGuardianName(event.target.value)} className="form-control mt-1 w-full" /></label><label className="text-sm font-medium">Relationship<input value={guardianRelationship} onChange={(event) => setGuardianRelationship(event.target.value)} className="form-control mt-1 w-full" /></label><label className="text-sm font-medium">Email<input type="email" value={guardianEmail} onChange={(event) => setGuardianEmail(event.target.value)} className="form-control mt-1 w-full" /></label><label className="text-sm font-medium">Mobile number<input type="tel" value={guardianMobile} onChange={(event) => setGuardianMobile(event.target.value)} className="form-control mt-1 w-full" /></label></div></Card>{error && <p role="alert" className="text-sm text-status-error">{error}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => navigate(edit ? `/students/${id}` : "/students")}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : edit ? "Save changes" : "Create student"}</Button></div></form></>;
}
