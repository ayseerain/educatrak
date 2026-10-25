import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export type TableFilterValues = Record<string, string>;

export interface TableFilterField<Key extends string> {
  key: Key;
  label: string;
  type?: "text" | "date" | "number" | "select" | "checkbox";
  options?: readonly { value: string; label: string }[];
  placeholder?: string;
  min?: string;
  step?: string;
}

/** Each table owns an instance; only the shared state transitions and controls live here. */
export function useTableFilters<Values extends TableFilterValues>(defaults: Values, initial: Values = defaults) {
  const [draft, setDraft] = useState<Values>(() => ({ ...initial }));
  const [applied, setApplied] = useState<Values>(() => ({ ...initial }));
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  function update(key: keyof Values & string, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function search(key: keyof Values & string, value: string) {
    update(key, value);
    setApplied((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function apply() {
    setApplied({ ...draft });
    setPage(1);
  }

  function reset() {
    setDraft({ ...applied });
  }

  function clear() {
    setDraft({ ...defaults });
    setApplied({ ...defaults });
    setPage(1);
  }

  function remove(key: keyof Values & string) {
    const value = defaults[key];
    setDraft((current) => ({ ...current, [key]: value }));
    setApplied((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function replace(values: Values) {
    setDraft({ ...values });
    setApplied({ ...values });
    setPage(1);
  }

  function changePerPage(size: number) {
    setPerPage(size);
    setPage(1);
  }

  return { draft, applied, page, perPage, update, search, apply, reset, clear, remove, replace, setPage, changePerPage };
}

interface TableFiltersProps<Values extends TableFilterValues> {
  scope: string;
  fields: readonly TableFilterField<keyof Values & string>[];
  draft: Values;
  applied: Values;
  defaults: Values;
  search?: { key: keyof Values & string; label: string; placeholder?: string };
  searchSlot?: ReactNode;
  onChange: (key: keyof Values & string, value: string) => void;
  onSearch?: (key: keyof Values & string, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onClear: () => void;
  onRemove: (key: keyof Values & string) => void;
  error?: string;
  validate?: (draft: Values) => string | undefined;
}

export function TableFilters<Values extends TableFilterValues>({
  scope, fields, draft, applied, defaults, search, searchSlot, onChange, onSearch, onApply, onReset, onClear, onRemove, error, validate,
}: TableFiltersProps<Values>) {
  const [open, setOpen] = useState(false);
  const [validationError, setValidationError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeFields = fields.filter((field) => applied[field.key] !== defaults[field.key]);
  const searchActive = search && applied[search.key] !== defaults[search.key];
  const activeCount = activeFields.length + (searchActive ? 1 : 0);
  const panelId = `${scope.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}-filters`;

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("input, select")?.focus();
    function dismissOnOutsideClick(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node) || triggerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", dismissOnOutsideClick);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsideClick);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextError = validate?.(draft) ?? "";
    setValidationError(nextError);
    if (nextError) return;
    onApply();
    setOpen(false);
  }

  return <Card className="no-print mb-4">
    <div className="flex flex-wrap items-end gap-3">
      {searchSlot ?? (search && <div className="min-w-[min(100%,16rem)] flex-1">
        <input type="search" aria-label={search.label} value={draft[search.key]} placeholder={search.placeholder ?? search.label} onChange={(event) => (onSearch ?? onChange)(search.key, event.target.value)} className={searchInputClass} />
      </div>)}
      <div className="relative">
        <Button ref={triggerRef} type="button" variant="secondary" aria-haspopup="dialog" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((current) => !current)}>
          <Filter aria-hidden="true" className="h-4 w-4" />Filter{activeCount ? ` (${activeCount})` : ""}
        </Button>
        {open && <div ref={menuRef} id={panelId} role="dialog" aria-label={`${scope} filters`} className="absolute left-0 z-50 mt-2 max-h-[min(70vh,36rem)] w-[min(90vw,28rem)] overflow-y-auto rounded-md border border-border bg-white p-4 shadow-xl sm:left-auto sm:right-0">
          {activeCount > 0 && <div aria-label="Active filters" className="mb-4 flex flex-wrap gap-2 border-b border-border pb-4">
            {searchActive && <Chip label={`${search.label}: ${applied[search.key]}`} onClick={() => { setValidationError(""); onRemove(search.key); }} />}
            {activeFields.map((field) => <Chip key={field.key} label={`${field.label}: ${field.type === "checkbox" ? "Yes" : field.options?.find((option) => option.value === applied[field.key])?.label ?? applied[field.key]}`} onClick={() => { setValidationError(""); onRemove(field.key); }} />)}
          </div>}
          <form aria-label={`${scope} filter fields`} onSubmit={submit}>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => <FilterInput key={field.key} field={field} value={draft[field.key] ?? ""} onChange={(value) => { setValidationError(""); onChange(field.key, value); }} />)}
            </div>
            {(error || validationError) && <p role="alert" className="mt-3 text-sm text-status-error">{error || validationError}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="submit">Apply filters</Button>
              <Button type="button" variant="secondary" onClick={() => { setValidationError(""); onReset(); }}>Reset</Button>
              <Button type="button" variant="ghost" onClick={() => { setValidationError(""); onClear(); }}>Clear all</Button>
            </div>
          </form>
        </div>}
      </div>
    </div>
  </Card>;
}

function FilterInput<Key extends string>({ field, value, onChange }: { field: TableFilterField<Key>; value: string; onChange: (value: string) => void }) {
  if (field.type === "checkbox") return <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium"><input type="checkbox" checked={value === "true"} onChange={(event) => onChange(event.target.checked ? "true" : "")} />{field.label}</label>;
  return <label className="block text-sm font-medium">{field.label}
    {field.type === "select"
      ? <select aria-label={field.label} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      : <input aria-label={field.label} type={field.type ?? "text"} value={value} placeholder={field.placeholder} min={field.min} step={field.step} onChange={(event) => onChange(event.target.value)} className={inputClass} />}
  </label>;
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" aria-label={`Remove ${label} filter`} onClick={onClick} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-surface px-3 text-xs text-text-primary hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark">{label}<X aria-hidden="true" className="h-3 w-3" /></button>;
}

const inputClass = "mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-green-dark";
const searchInputClass = "h-11 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-green-dark";

export function dateRangeError(from: string, to: string): string | undefined {
  return from && to && to < from ? "End date must be on or after start date." : undefined;
}

export function moneyRangeError(minimum: string, maximum: string): string | undefined {
  const valid = (value: string) => !value.trim() || /^\d+(\.\d{1,2})?$/.test(value.trim());
  if (!valid(minimum) || !valid(maximum)) return "Enter amounts with up to two decimal places.";
  return minimum && maximum && Number(maximum) < Number(minimum) ? "Maximum amount must be at least the minimum amount." : undefined;
}

/** Preserve each page's own keys while leaving unused fields out of API requests. */
export function activeTableFilters<Values extends TableFilterValues>(values: Values, defaults: Values): Partial<Values> {
  const active: Partial<Values> = {};
  for (const key of Object.keys(values) as (keyof Values & string)[]) {
    const value = values[key];
    if (typeof value === "string" && value !== defaults[key] && value.trim() !== "") active[key] = value;
  }
  return active;
}
