import { useEffect, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus, RotateCcw } from "lucide-react";
import { CashierApiError } from "@/api/cashierApi";
import {
  createExamPeriod,
  createSchoolYear,
  createSection,
  createTerm,
  archiveSchoolYear,
  archiveSection,
  listGradeLevels,
  listSchoolYears,
  makeSchoolYearCurrent,
  restoreSchoolYear,
  restoreSection,
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
  type ArchiveView,
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
import { useClientPagination } from "@/components/ui/useClientPagination";
import { ViewTabs } from "@/components/ui/ViewTabs";
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
  { name: "starts_on", label: "Start date", type: "date", initial: year?.startsOn ?? "", required: true, disabled: Boolean(year?.datesLocked || year?.archivedAt), hint: year?.archivedAt ? "Restore this school year before editing dates." : year?.datesLocked ? LOCKED_HINT : undefined },
  { name: "ends_on", label: "End date", type: "date", initial: year?.endsOn ?? "", required: true, disabled: Boolean(year?.datesLocked || year?.archivedAt), hint: year?.archivedAt ? "Restore this school year before editing dates." : year?.datesLocked ? LOCKED_HINT : undefined },
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
  ...(section && !section.archivedAt ? [{ name: "active", label: "Active (available for new records)", type: "checkbox" as const, initial: section.active }] : []),
];

interface TransitionSpec {
  kind: "school year" | "section";
  name: string;
  action: "Archive" | "Restore";
  submit: () => Promise<void>;
}

function TransitionDialog({ spec, onClose, onSuccess }: { spec: TransitionSpec; onClose: () => void; onSuccess: (message: string) => void }) {
  const queryClient = useQueryClient();
  const transition = useMutation({
    mutationFn: spec.submit,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["school-structure"] });
      onSuccess(`${spec.name} ${spec.action === "Archive" ? "archived" : "restored"}.`);
      onClose();
    },
  });
  const isArchive = spec.action === "Archive";
  const detail = spec.kind === "school year"
    ? isArchive
      ? "Its terms, exam periods, payments and historical collection totals stay unchanged. You can restore this year later."
      : "Its terms and exam periods stay attached. The year remains non-current; make it current separately if needed."
    : isArchive
      ? "Students must be reassigned before this section can be archived. No student assignment changes automatically."
      : "The same section record returns with its previous active or inactive status. No student assignment changes automatically.";
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !transition.isPending) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className={`fixed inset-0 z-40 ${isArchive ? "bg-text-primary/55 backdrop-blur-sm" : "bg-text-primary/40"}`} />
      <Dialog.Content className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-6 shadow-raised ${isArchive ? "border border-status-error/40" : ""}`}>
        <Dialog.Title className="text-lg font-semibold text-text-primary">{spec.action} {spec.kind} {spec.name}?</Dialog.Title>
        <Dialog.Description className="mt-2 text-sm text-text-secondary">{detail}</Dialog.Description>
        {transition.isError && <p role="alert" className="mt-4 text-sm text-status-error">{transition.error.message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Dialog.Close asChild><Button type="button" variant="neutral" disabled={transition.isPending}>Cancel</Button></Dialog.Close>
          <Button type="button" disabled={transition.isPending} onClick={() => transition.mutate()}>{transition.isPending ? `${spec.action === "Archive" ? "Archiving" : "Restoring"}…` : `${spec.action} ${spec.kind}`}</Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function SchoolYearCard({ year, editable, open, confirm }: { year: SchoolYear; editable: boolean; open: (spec: FormDialogSpec) => void; confirm: (spec: TransitionSpec) => void }) {
  const terms = [...year.terms].sort((left, right) => left.sequence - right.sequence);
  return <Card className="overflow-x-auto">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-text-primary">{year.label}</h3>
          {year.current && <StatusBadge status="current" />}
          {year.archivedAt && <StatusBadge status="archived" />}
        </div>
        <p className="mt-1 text-sm text-text-secondary">{dateRange(year.startsOn, year.endsOn)}{year.datesLocked ? " · dates locked by billing accounts" : ""}</p>
        {year.current && editable && <p className="mt-1 text-xs text-text-secondary">Current school year cannot be archived.</p>}
      </div>
      {editable && <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => open({
          title: `Edit ${year.label}`, description: "Label changes are always allowed and audited.", submitLabel: "Save changes", mode: "edit",
          fields: yearFields(year), submit: (body) => updateSchoolYear(year.id, body),
        })}>Edit</Button>
        {!year.archivedAt && <Button type="button" size="sm" variant="secondary" onClick={() => open({
          title: `Add term to ${year.label}`, description: "Terms are listed in the order you give them.", submitLabel: "Add term", mode: "create",
          fields: termFields(year), submit: (body) => createTerm(year.id, body),
        })}>Add term</Button>}
        {!year.current && !year.archivedAt && <Button type="button" size="sm" variant="secondary" onClick={() => open({
          title: `Make ${year.label} the current school year`,
          description: "Exactly one school year is current. New billing accounts and dashboards use it. The reason is recorded in the audit log.",
          submitLabel: "Make current", mode: "create",
          fields: [{ name: "reason", label: "Reason for the change", type: "textarea", initial: "", required: true, minLength: 10, maxLength: 1000 }],
          submit: (body) => makeSchoolYearCurrent(year.id, String(body.reason ?? "")),
        })}>Make current</Button>}
        {!year.current && <Button type="button" size="sm" variant="secondary" aria-label={`${year.archivedAt ? "Restore" : "Archive"} school year ${year.label}`} onClick={() => confirm({
          kind: "school year", name: year.label, action: year.archivedAt ? "Restore" : "Archive",
          submit: () => year.archivedAt ? restoreSchoolYear(year.id) : archiveSchoolYear(year.id),
        })}>{year.archivedAt ? "Restore" : "Archive"}</Button>}
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
            {editable && !year.archivedAt && <th scope="col" className="w-[30%] px-3 py-2">Actions</th>}
          </tr></thead>
          <tbody>{terms.map((term) => <tr key={term.id} className="border-b align-top last:border-0">
            <td className="px-3 py-2 tabular-nums">{term.sequence}</td>
            <td className="px-3 py-2">{term.name}</td>
            <td className="px-3 py-2">{dateRange(term.startsOn, term.endsOn)}</td>
            <td className="px-3 py-2">{term.examPeriods.length === 0
              ? <span className="text-text-secondary">None</span>
              : <ul className="space-y-1">{term.examPeriods.map((period) => <li key={period.id} className="flex flex-wrap items-center gap-2">
                  <span><span className="font-medium">{period.name}</span> · {dateRange(period.startsOn, period.endsOn)}</span>
                  {editable && !year.archivedAt && <TableActionButton icon={Pencil} label="Edit" variant="neutral" aria-label={`Edit exam period ${period.name}`} onClick={() => open({
                    title: `Edit ${period.name}`, description: `${term.name}, ${year.label}.`, submitLabel: "Save changes", mode: "edit",
                    fields: examFields(period), submit: (body) => updateExamPeriod(period.id, body),
                  })} />}
                </li>)}</ul>}</td>
            {editable && !year.archivedAt && <td className="px-3 py-2"><TableActionGroup>
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

function GradeLevelsCard({ grades, editable, open, confirm, view, setView, selectedGradeId, setSelectedGradeId, loading }: { grades: GradeLevel[]; editable: boolean; open: (spec: FormDialogSpec) => void; confirm: (spec: TransitionSpec) => void; view: ArchiveView; setView: (view: ArchiveView) => void; selectedGradeId: string; setSelectedGradeId: (id: string) => void; loading: boolean }) {
  const selectedGrade = grades.find((grade) => grade.id === selectedGradeId) ?? grades[0];
  useEffect(() => {
    if (selectedGrade && selectedGrade.id !== selectedGradeId && !grades.some((grade) => grade.id === selectedGradeId)) setSelectedGradeId(selectedGrade.id);
  }, [grades, selectedGrade, selectedGradeId]);
  const sections = useClientPagination(selectedGrade?.sections ?? [], "sections");
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
    <div className="mt-4"><ViewTabs label="Section views" items={(["active", "archived"] as const).map((option) => ({ key: option, label: option === "active" ? "Active" : "Archived", selected: view === option, onSelect: () => { setView(option); sections.setPage(1); } }))} /></div>
    {grades.length === 0
      ? <div className="mt-4"><EmptyState message="No grade levels are configured." /></div>
      : <><div className="max-w-sm"><label className="block text-sm font-medium" htmlFor="school-grade-selector">Grade level</label><DropdownSelect id="school-grade-selector" aria-label="Grade level" value={selectedGrade?.id ?? ""} options={grades.map((grade) => ({ value: grade.id, label: grade.name }))} onChange={(id) => { setSelectedGradeId(id); sections.setPage(1); }} className="mt-1 w-full" align="start" /></div>
        {loading ? <LoadingState message={`Loading ${view} sections…`} layout="table" columns={3} />
        : selectedGrade?.sections.length === 0 ? <EmptyState message={`No ${view === "archived" ? "archived" : "active or inactive"} sections in ${selectedGrade.name}.`} />
        : <><div className="mt-4 overflow-x-auto pb-1"><table className="w-full min-w-[560px] table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">{view === "archived" ? "Archived" : "Active and inactive"} sections in {selectedGrade?.name}</caption>
          <thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">
            <th scope="col" className="w-[42%] px-3 py-2">Section</th>
            <th scope="col" className="w-[22%] px-3 py-2">Status</th>
            {editable && <th scope="col" className="w-[36%] px-3 py-2">Actions</th>}
          </tr></thead>
          <tbody>{sections.items.map((section) => <tr key={section.id} className="border-b align-top last:border-0">
            <th scope="row" className="px-3 py-2 text-left font-medium">{section.name}</th>
            <td className="px-3 py-2"><div className="flex flex-wrap gap-1"><StatusBadge status={section.archivedAt ? "archived" : section.active ? "active" : "inactive"} />{section.archivedAt && !section.active && <StatusBadge status="inactive" />}</div></td>
            {editable && <td className="px-3 py-2"><TableActionGroup>
              <TableActionButton icon={Pencil} label="Edit" variant="neutral" aria-label={`Edit section ${section.name} in ${selectedGrade?.name}`} onClick={() => open({
                title: `Edit section ${section.name}`, description: `${selectedGrade?.name}.`, submitLabel: "Save changes", mode: "edit",
                fields: sectionFields(section), submit: (body) => updateSection(section.id, body),
              })} />
              <TableActionButton icon={section.archivedAt ? RotateCcw : Archive} label={section.archivedAt ? "Restore" : "Archive"} variant="secondary" aria-label={`${section.archivedAt ? "Restore" : "Archive"} section ${section.name} in ${selectedGrade?.name}`} onClick={() => confirm({
                kind: "section", name: section.name, action: section.archivedAt ? "Restore" : "Archive",
                submit: () => section.archivedAt ? restoreSection(section.id) : archiveSection(section.id),
              })} />
            </TableActionGroup></td>}
          </tr>)}</tbody>
        </table></div>{sections.controls}</>}</>}
  </Card>;
}

export function LiveSchoolStructurePage({ editable }: { editable: boolean }) {
  const [dialog, setDialog] = useState<FormDialogSpec | null>(null);
  const [transition, setTransition] = useState<TransitionSpec | null>(null);
  const [feedback, setFeedback] = useState("");
  const [yearView, setYearView] = useState<ArchiveView>("active");
  const [sectionView, setSectionView] = useState<ArchiveView>("active");
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const years = useQuery({ queryKey: ["school-structure", "years", yearView], queryFn: () => listSchoolYears(yearView) });
  const grades = useQuery({ queryKey: ["school-structure", "grades", sectionView], queryFn: () => listGradeLevels(sectionView), placeholderData: (previous) => previous });
  const yearPagination = useClientPagination(years.data ?? [], "school years");

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
    {feedback && <p role="status" className="mb-4 text-sm text-brand-green-dark">{feedback}</p>}
    <section aria-labelledby="school-years-heading" className="mb-6">
      <h2 id="school-years-heading" className="mb-3 text-lg font-semibold text-text-primary">School years</h2>
      <ViewTabs label="School year views" items={(["active", "archived"] as const).map((option) => ({ key: option, label: option === "active" ? "Active" : "Archived", selected: yearView === option, onSelect: () => { setYearView(option); yearPagination.setPage(1); setFeedback(""); } }))} />
      {years.isPending && <LoadingState message="Loading school years…" layout="table" columns={4} />}
      {years.isError && <ErrorState message={years.error.message} onRetry={() => void years.refetch()} />}
      {years.data && (years.data.length === 0
        ? <EmptyState message={yearView === "archived" ? "No archived school years." : "No active school years are configured."} />
        : <><div className="grid gap-4">{yearPagination.items.map((year) => <SchoolYearCard key={year.id} year={year} editable={editable} open={setDialog} confirm={setTransition} />)}</div>{yearPagination.controls}</>)}
    </section>
    {grades.isPending && <LoadingState message="Loading grade levels…" layout="table" columns={4} />}
    {grades.isError && <ErrorState message={grades.error.message} onRetry={() => void grades.refetch()} />}
    {grades.data && !grades.isError && <GradeLevelsCard grades={grades.data} editable={editable} open={setDialog} confirm={setTransition} view={sectionView} setView={(view) => { setSectionView(view); setFeedback(""); }} selectedGradeId={selectedGradeId} setSelectedGradeId={setSelectedGradeId} loading={grades.isFetching} />}
    {dialog && <StructureFormDialog key={dialog.title} spec={dialog} onClose={() => setDialog(null)} />}
    {transition && <TransitionDialog spec={transition} onClose={() => setTransition(null)} onSuccess={setFeedback} />}
  </>;
}
