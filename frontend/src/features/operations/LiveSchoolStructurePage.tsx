import { useEffect, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { CashierApiError } from "@/api/cashierApi";
import {
  createExamPeriod,
  createSchoolYear,
  createSection,
  createTerm,
  listGradeLevels,
  listSchoolYears,
  makeSchoolYearCurrent,
  updateExamPeriod,
  updateSchoolYear,
  updateSection,
  updateTerm,
  type ExamPeriod,
  type GradeLevel,
  type SchoolYear,
  type Section,
  type StructurePayload,
  type Term,
} from "@/api/schoolStructureApi";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableActionButton, TableActionGroup } from "@/components/ui/TableActionButton";
import { SystemSettingsTabs } from "@/features/operations/LiveSystemSettingsPage";
import { formatDate } from "@/lib/dates";

const LOCKED_HINT = "Locked: billing accounts exist for this school year.";

interface FieldSpec {
  name: string;
  label: string;
  type: "text" | "date" | "number" | "checkbox" | "textarea" | "select";
  initial: string | boolean;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
}

interface FormDialogSpec {
  title: string;
  description: string;
  submitLabel: string;
  /** Create sends every enabled field; edit sends only the fields that changed. */
  mode: "create" | "edit";
  fields: FieldSpec[];
  submit: (body: StructurePayload) => Promise<void>;
}

function fieldValue(field: FieldSpec, raw: string | boolean): string | number | boolean | null {
  if (field.type === "checkbox") return raw as boolean;
  const text = (raw as string).trim();
  if (text === "") return null;
  return field.type === "number" ? Number(text) : text;
}

function buildBody(spec: FormDialogSpec, draft: Record<string, string | boolean>): StructurePayload {
  const body: StructurePayload = {};
  for (const field of spec.fields) {
    if (field.disabled) continue;
    const value = fieldValue(field, draft[field.name] ?? field.initial);
    if (spec.mode === "edit" && value === fieldValue(field, field.initial)) continue;
    if (spec.mode === "create" && value === null && !field.required) continue;
    body[field.name] = value;
  }
  return body;
}

function StructureFormDialog({ spec, onClose }: { spec: FormDialogSpec; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string | boolean>>(() => Object.fromEntries(spec.fields.map((field) => [field.name, field.initial])));
  const [noChanges, setNoChanges] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({});
  const save = useMutation({
    mutationFn: spec.submit,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["school-structure"] });
      onClose();
    },
  });
  const fieldErrors = save.error instanceof CashierApiError ? save.error.fieldErrors ?? {} : {};
  const generalError = save.isError && Object.keys(fieldErrors).length === 0 ? save.error.message : undefined;

  // Focus the first invalid field once per failed save.
  useEffect(() => {
    const errors = { ...fieldErrors, ...clientErrors };
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) document.getElementById(`structure-${firstInvalid}`)?.focus();
  }, [fieldErrors, clientErrors]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = buildBody(spec, draft);
    const missing = Object.fromEntries(spec.fields
      .filter((field) => field.required && fieldValue(field, draft[field.name] ?? field.initial) === null)
      .map((field) => [field.name, ["This field is required."]]));
    if (Object.keys(missing).length > 0) {
      setClientErrors(missing);
      return;
    }
    setClientErrors({});
    if (spec.mode === "edit" && Object.keys(body).length === 0) {
      setNoChanges(true);
      return;
    }
    save.mutate(body);
  }

  return <Dialog.Root open onOpenChange={(open) => { if (!open && !save.isPending) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-text-primary/40" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-6 shadow-raised focus:outline-none">
        <Dialog.Title className="text-lg font-semibold text-text-primary">{spec.title}</Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-text-secondary">{spec.description}</Dialog.Description>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          {spec.fields.map((field) => {
            const id = `structure-${field.name}`;
            const errors = clientErrors[field.name] ?? fieldErrors[field.name];
            const describedBy = [errors?.length ? `${id}-error` : "", field.hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
            const value = draft[field.name] ?? field.initial;
            const update = (next: string | boolean) => {
              setDraft((current) => ({ ...current, [field.name]: next }));
              setClientErrors((current) => { const { [field.name]: _removed, ...remaining } = current; return remaining; });
              setNoChanges(false);
            };
            return <div key={field.name}>
              {field.type === "checkbox"
                ? <label className="flex items-center gap-2 text-sm font-medium" htmlFor={id}>
                    <input id={id} type="checkbox" checked={value as boolean} disabled={field.disabled} onChange={(event) => update(event.target.checked)} aria-describedby={describedBy} />
                    {field.label}
                  </label>
                : <>
                    <label className="block text-sm font-medium" htmlFor={id}>{field.label}{field.required && <span className="text-status-error" aria-hidden="true"> *</span>}</label>
                    {field.type === "select"
                      ? <DropdownSelect id={id} aria-label={field.label} aria-required={field.required || undefined} aria-invalid={errors?.length ? true : undefined} aria-describedby={describedBy} value={value as string} options={field.options ?? []} onChange={update} className="mt-1 w-full" align="start" />
                      : field.type === "textarea"
                      ? <textarea id={id} rows={4} className="form-control mt-1" value={value as string} required={field.required} minLength={field.minLength} maxLength={field.maxLength} disabled={field.disabled}
                          aria-invalid={errors?.length ? true : undefined} aria-describedby={describedBy} onChange={(event) => update(event.target.value)} />
                      : <input id={id} type={field.type} className="form-control mt-1" value={value as string} required={field.required} maxLength={field.maxLength} min={field.min} max={field.max} disabled={field.disabled}
                          aria-invalid={errors?.length ? true : undefined} aria-describedby={describedBy} onChange={(event) => update(event.target.value)} />}
                    {field.type === "textarea" && field.maxLength && <p className="mt-1 text-xs text-text-secondary">{(value as string).length} / {field.maxLength} characters{field.minLength ? `, at least ${field.minLength}` : ""}</p>}
                  </>}
              {field.hint && <p id={`${id}-hint`} className="mt-1 text-xs text-text-secondary">{field.hint}</p>}
              {errors?.length ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-status-error">{errors[0]}</p> : null}
            </div>;
          })}
          {noChanges && <p role="status" className="text-sm text-text-secondary">No changes to save.</p>}
          {generalError && <p role="alert" className="text-sm text-status-error">{generalError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Dialog.Close asChild><Button type="button" variant="neutral" disabled={save.isPending}>Cancel</Button></Dialog.Close>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : spec.submitLabel}</Button>
          </div>
        </form>
        <Dialog.Close aria-label="Close dialog" className="absolute right-4 top-4 rounded px-2 py-1 text-text-secondary hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark">×</Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function dateRange(startsOn: string | null, endsOn: string | null): string {
  if (!startsOn && !endsOn) return "No dates set";
  if (!endsOn) return `From ${formatDate(startsOn as string)}`;
  if (!startsOn) return `Until ${formatDate(endsOn)}`;
  return `${formatDate(startsOn)} – ${formatDate(endsOn)}`;
}

const yearFields = (year?: SchoolYear): FieldSpec[] => [
  { name: "label", label: "Label", type: "text", initial: year?.label ?? "", required: true, maxLength: 40, hint: "For example, SY 2027-2028." },
  { name: "starts_on", label: "Start date", type: "date", initial: year?.startsOn ?? "", required: true, disabled: year?.datesLocked, hint: year?.datesLocked ? LOCKED_HINT : undefined },
  { name: "ends_on", label: "End date", type: "date", initial: year?.endsOn ?? "", required: true, disabled: year?.datesLocked, hint: year?.datesLocked ? LOCKED_HINT : undefined },
];

const termFields = (year: SchoolYear, term?: Term): FieldSpec[] => [
  { name: "name", label: "Term name", type: "text", initial: term?.name ?? "", required: true, maxLength: 120 },
  { name: "sequence", label: "Order in the school year", type: "number", initial: term ? String(term.sequence) : String(year.terms.length + 1), required: true, min: 1, max: 65535 },
  { name: "starts_on", label: "Start date (optional)", type: "date", initial: term?.startsOn ?? "", disabled: year.datesLocked, hint: year.datesLocked ? LOCKED_HINT : undefined },
  { name: "ends_on", label: "End date (optional)", type: "date", initial: term?.endsOn ?? "", disabled: year.datesLocked, hint: year.datesLocked ? LOCKED_HINT : undefined },
];

const examFields = (period?: ExamPeriod): FieldSpec[] => [
  { name: "name", label: "Exam period name", type: "text", initial: period?.name ?? "", required: true, maxLength: 120 },
  { name: "starts_on", label: "Start date", type: "date", initial: period?.startsOn ?? "", required: true },
  { name: "ends_on", label: "End date (optional)", type: "date", initial: period?.endsOn ?? "" },
];

const sectionFields = (section?: Section): FieldSpec[] => [
  { name: "name", label: "Section name", type: "text", initial: section?.name ?? "", required: true, maxLength: 100 },
  ...(section ? [{ name: "active", label: "Active (available for new records)", type: "checkbox" as const, initial: section.active }] : []),
];

function SchoolYearCard({ year, editable, open }: { year: SchoolYear; editable: boolean; open: (spec: FormDialogSpec) => void }) {
  const terms = [...year.terms].sort((left, right) => left.sequence - right.sequence);
  return <Card className="overflow-x-auto">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-text-primary">{year.label}</h3>
          {year.current && <StatusBadge status="current" />}
        </div>
        <p className="mt-1 text-sm text-text-secondary">{dateRange(year.startsOn, year.endsOn)}{year.datesLocked ? " · dates locked by billing accounts" : ""}</p>
      </div>
      {editable && <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => open({
          title: `Edit ${year.label}`, description: "Label changes are always allowed and audited.", submitLabel: "Save changes", mode: "edit",
          fields: yearFields(year), submit: (body) => updateSchoolYear(year.id, body),
        })}>Edit</Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => open({
          title: `Add term to ${year.label}`, description: "Terms are listed in the order you give them.", submitLabel: "Add term", mode: "create",
          fields: termFields(year), submit: (body) => createTerm(year.id, body),
        })}>Add term</Button>
        {!year.current && <Button type="button" size="sm" variant="secondary" onClick={() => open({
          title: `Make ${year.label} the current school year`,
          description: "Exactly one school year is current. New billing accounts and dashboards use it. The reason is recorded in the audit log.",
          submitLabel: "Make current", mode: "create",
          fields: [{ name: "reason", label: "Reason for the change", type: "textarea", initial: "", required: true, minLength: 10, maxLength: 1000 }],
          submit: (body) => makeSchoolYearCurrent(year.id, String(body.reason ?? "")),
        })}>Make current</Button>}
      </div>}
    </div>
    {terms.length === 0
      ? <p className="mt-4 text-sm text-text-secondary">No terms are configured for this school year.</p>
      : <table className="mt-4 w-full min-w-[640px] border-collapse text-left text-sm">
          <thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">
            <th scope="col" className="w-[8%] px-3 py-2">Order</th>
            <th scope="col" className="w-[22%] px-3 py-2">Term</th>
            <th scope="col" className="w-[25%] px-3 py-2">Dates</th>
            <th scope="col" className="px-3 py-2">Exam periods</th>
            {editable && <th scope="col" className="w-[30%] px-3 py-2">Actions</th>}
          </tr></thead>
          <tbody>{terms.map((term) => <tr key={term.id} className="border-b align-top last:border-0">
            <td className="px-3 py-2 font-mono">{term.sequence}</td>
            <td className="px-3 py-2">{term.name}</td>
            <td className="px-3 py-2">{dateRange(term.startsOn, term.endsOn)}</td>
            <td className="px-3 py-2">{term.examPeriods.length === 0
              ? <span className="text-text-secondary">None</span>
              : <ul className="space-y-1">{term.examPeriods.map((period) => <li key={period.id} className="flex flex-wrap items-center gap-2">
                  <span><span className="font-medium">{period.name}</span> · {dateRange(period.startsOn, period.endsOn)}</span>
                  {editable && <TableActionButton icon={Pencil} label="Edit" variant="neutral" aria-label={`Edit exam period ${period.name}`} onClick={() => open({
                    title: `Edit ${period.name}`, description: `${term.name}, ${year.label}.`, submitLabel: "Save changes", mode: "edit",
                    fields: examFields(period), submit: (body) => updateExamPeriod(period.id, body),
                  })} />}
                </li>)}</ul>}</td>
            {editable && <td className="px-3 py-2"><TableActionGroup>
              <TableActionButton icon={Pencil} label="Edit" variant="secondary" aria-label={`Edit term ${term.name}`} onClick={() => open({
                title: `Edit ${term.name}`, description: `${year.label}.`, submitLabel: "Save changes", mode: "edit",
                fields: termFields(year, term), submit: (body) => updateTerm(term.id, body),
              })} />
              <TableActionButton icon={Plus} label="Add exam period" variant="secondary" aria-label={`Add exam period to ${term.name}`} onClick={() => open({
                title: `Add exam period to ${term.name}`, description: `${year.label}.`, submitLabel: "Add exam period", mode: "create",
                fields: examFields(), submit: (body) => createExamPeriod(term.id, body),
              })} />
            </TableActionGroup></td>}
          </tr>)}</tbody>
        </table>}
  </Card>;
}

function GradeLevelsCard({ grades, editable, open }: { grades: GradeLevel[]; editable: boolean; open: (spec: FormDialogSpec) => void }) {
  const addSection = () => open({
    title: "Add section",
    description: "Add a section to one of the school's predefined grade levels.",
    submitLabel: "Add section",
    mode: "create",
    fields: [
      ...sectionFields(),
      { name: "grade_level_id", label: "Grade level", type: "select", initial: "", required: true, options: [{ value: "", label: "Select grade level" }, ...grades.map((grade) => ({ value: grade.id, label: grade.name }))] },
    ],
    submit: (body) => {
      const { grade_level_id: gradeId, ...section } = body;
      return createSection(String(gradeId), section);
    },
  });
  return <Card className="overflow-x-auto">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Grade levels and sections</h2>
        <p className="mt-1 text-sm text-text-secondary">Grade levels are predefined. Administrators can manage their sections.</p>
      </div>
      {editable && <Button type="button" onClick={addSection}>Add section</Button>}
    </div>
    {grades.length === 0
      ? <div className="mt-4"><EmptyState message="No grade levels are configured." /></div>
      : <table className="mt-4 w-full min-w-[360px] table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">Grade levels and their sections</caption>
          <thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">
            <th scope="col" className="w-[28%] px-3 py-2">Grade level</th>
            <th scope="col" className="px-3 py-2">Sections</th>
            <th scope="col" className="w-[22%] px-3 py-2">Status</th>
          </tr></thead>
          <tbody>{grades.map((grade) => <tr key={grade.id} className="border-b align-top last:border-0">
            <th scope="row" className="px-3 py-2 text-left font-medium">{grade.name}</th>
            <td className="px-3 py-2">{grade.sections.length === 0
              ? <span className="text-text-secondary">No sections</span>
              : <ul className="space-y-1">{grade.sections.map((section) => <li key={section.id} className="flex flex-wrap items-center gap-2">
                  <span>{section.name}</span>
                  {!section.active && <StatusBadge status="inactive" />}
                  {editable && <TableActionButton icon={Pencil} label="Edit" variant="neutral" aria-label={`Edit section ${section.name} in ${grade.name}`} onClick={() => open({
                    title: `Edit section ${section.name}`, description: `${grade.name}.`, submitLabel: "Save changes", mode: "edit",
                    fields: sectionFields(section), submit: (body) => updateSection(section.id, body),
                  })} />}
                </li>)}</ul>}</td>
            <td className="px-3 py-2"><StatusBadge status={grade.active ? "active" : "inactive"} /></td>
          </tr>)}</tbody>
        </table>}
  </Card>;
}

export function LiveSchoolStructurePage({ editable }: { editable: boolean }) {
  const [dialog, setDialog] = useState<FormDialogSpec | null>(null);
  const years = useQuery({ queryKey: ["school-structure", "years"], queryFn: listSchoolYears });
  const grades = useQuery({ queryKey: ["school-structure", "grades"], queryFn: listGradeLevels });

  return <>
    <PageHeader
      title="School settings"
      description="School years, terms, exam periods, grade levels and sections."
      action={editable ? <Button type="button" onClick={() => setDialog({
        title: "Add school year",
        description: "Dates cannot overlap another school year. The first school year created becomes current.",
        submitLabel: "Add school year", mode: "create", fields: yearFields(), submit: createSchoolYear,
      })}>Add school year</Button> : undefined}
    />
    <SystemSettingsTabs active="school" />
    <p className="mb-4 text-sm text-text-secondary">{editable ? "Changes are saved and recorded in the audit log. Nothing here can be deleted." : "You have read-only access to these settings."}</p>
    <section aria-labelledby="school-years-heading" className="mb-6">
      <h2 id="school-years-heading" className="mb-3 text-lg font-semibold text-text-primary">School years</h2>
      {years.isPending && <LoadingState message="Loading school years…" layout="table" columns={4} />}
      {years.isError && <ErrorState message={years.error.message} onRetry={() => void years.refetch()} />}
      {years.data && (years.data.length === 0
        ? <EmptyState message="No school years are configured." />
        : <div className="grid gap-4">{years.data.map((year) => <SchoolYearCard key={year.id} year={year} editable={editable} open={setDialog} />)}</div>)}
    </section>
    {grades.isPending && <LoadingState message="Loading grade levels…" layout="table" columns={4} />}
    {grades.isError && <ErrorState message={grades.error.message} onRetry={() => void grades.refetch()} />}
    {grades.data && <GradeLevelsCard grades={grades.data} editable={editable} open={setDialog} />}
    {dialog && <StructureFormDialog key={dialog.title} spec={dialog} onClose={() => setDialog(null)} />}
  </>;
}
