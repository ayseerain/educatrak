import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CashierApiError } from "@/api/cashierApi";
import {
  createFinancePaymentPlan,
  deactivateFinancePaymentPlan,
  previewFinancePaymentPlan,
  reviseFinancePaymentPlan,
  type FinancePaymentPlan,
  type PaymentPlanInput,
} from "@/api/financeSettingsApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/dates";
import { centavos, format, parse } from "@/lib/money";

const FULL_SHARE_BP = 10_000;

/** 2500 basis points → "25%"; 3333 → "33.33%". */
function percentLabel(basisPoints: number): string {
  return `${basisPoints / 100}%`;
}

/** "25" or "33.33" → basis points, or null when not a number. */
function toBasisPoints(input: string): number | null {
  if (input.trim() === "") return null;
  const value = Number(input);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

function downPaymentLabel(plan: FinancePaymentPlan): string {
  return plan.downPaymentType === "percent"
    ? `${percentLabel(plan.downPaymentValue)} of the total`
    : format(centavos(plan.downPaymentValue));
}

function DialogShell({ title, description, children, onClose, busy }: { title: string; description: string; children: ReactNode; onClose: () => void; busy: boolean }) {
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-text-primary/40" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-6 shadow-raised focus:outline-none">
        <Dialog.Title className="text-lg font-semibold text-text-primary">{title}</Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-text-secondary">{description}</Dialog.Description>
        {children}
        <Dialog.Close aria-label="Close dialog" className="absolute right-4 top-4 rounded px-2 py-1 text-text-secondary hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark">×</Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function ErrorText({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} role="alert" className="mt-1 text-sm text-status-error">{message}</p> : null;
}

interface RowDraft { label: string; offset: string; percent: string }

/** Field ids follow the API's error keys, so client and server errors land on the same field. */
const fieldId = (key: string) => `plan-${key.replace(/\./g, "-")}`;

function PlanFormDialog({ plan, onClose }: { plan?: FinancePaymentPlan; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(plan?.name ?? "");
  const [downType, setDownType] = useState<"amount" | "percent">(plan?.downPaymentType === "percent" ? "percent" : "amount");
  const [downValue, setDownValue] = useState(plan
    ? plan.downPaymentType === "percent" ? String(plan.downPaymentValue / 100) : (plan.downPaymentValue / 100).toFixed(2)
    : "0");
  const [rows, setRows] = useState<RowDraft[]>(plan?.installments.length
    ? [...plan.installments].sort((a, b) => a.sequence - b.sequence).map((row) => ({ label: row.label, offset: String(row.dueDayOffset), percent: String(row.percentOfRemainingBasisPoints / 100) }))
    : [{ label: "", offset: "30", percent: "100" }]);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: (input: PaymentPlanInput) => plan ? reviseFinancePaymentPlan(plan.id, input) : createFinancePaymentPlan(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance-settings", "plans"] });
      onClose();
    },
  });
  const serverErrors = save.error instanceof CashierApiError ? Object.fromEntries(Object.entries(save.error.fieldErrors ?? {}).map(([key, messages]) => [key, messages[0] ?? ""])) : {};
  const errors: Record<string, string> = { ...serverErrors, ...clientErrors };
  const generalError = save.isError && Object.keys(serverErrors).length === 0 ? save.error.message : undefined;
  const shareTotal = rows.reduce((sum, row) => sum + (toBasisPoints(row.percent) ?? 0), 0);

  useEffect(() => {
    const first = Object.keys(clientErrors)[0] ?? (save.error instanceof CashierApiError ? Object.keys(save.error.fieldErrors ?? {})[0] : undefined);
    if (first) document.getElementById(fieldId(first === "installments" ? "installments.0.percent_of_remaining_basis_points" : first))?.focus();
  }, [clientErrors, save.error]);

  function updateRow(index: number, patch: Partial<RowDraft>) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: Record<string, string> = {};
    let downPaymentValue = 0;
    if (downType === "amount") {
      try { downPaymentValue = parse(downValue); } catch { found.down_payment_value = "Enter a valid non-negative peso amount."; }
    } else {
      const basisPoints = toBasisPoints(downValue);
      if (basisPoints === null || basisPoints < 0 || basisPoints > FULL_SHARE_BP) found.down_payment_value = "Enter a percent from 0 to 100.";
      else downPaymentValue = basisPoints;
    }
    const installments = rows.map((row, index) => {
      const offset = Number(row.offset);
      const basisPoints = toBasisPoints(row.percent);
      if (row.label.trim() === "") found[`installments.${index}.label`] = "Enter a label.";
      if (row.offset.trim() === "" || !Number.isInteger(offset) || offset < 0 || offset > 65535) found[`installments.${index}.due_day_offset`] = "Enter whole days from 0 to 65535.";
      if (basisPoints === null || basisPoints < 1 || basisPoints > FULL_SHARE_BP) found[`installments.${index}.percent_of_remaining_basis_points`] = "Enter a share above 0% and up to 100%.";
      return { label: row.label.trim(), due_day_offset: offset, percent_of_remaining_basis_points: basisPoints ?? 0 };
    });
    if (Object.keys(found).length === 0 && shareTotal !== FULL_SHARE_BP) found.installments = `Installment shares must add up to exactly 100% (now ${percentLabel(shareTotal)}).`;
    setClientErrors(found);
    if (Object.keys(found).length > 0) return;
    save.mutate({ name: name.trim(), down_payment_type: downType, down_payment_value: downPaymentValue, installments });
  }

  const describedBy = (key: string) => errors[key] ? `${fieldId(key)}-error` : undefined;

  return <DialogShell
    title={plan ? `Revise ${plan.name}` : "Add payment plan"}
    description={plan
      ? `Saving creates version ${plan.version + 1} for new accounts only. Existing accounts keep version ${plan.version}, and version ${plan.version} becomes inactive.`
      : "New plans start as version 1 and are available to new accounts."}
    onClose={onClose}
    busy={save.isPending}
  >
    <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
      <div>
        <label className="block text-sm font-medium" htmlFor={fieldId("name")}>Plan name<span className="text-status-error" aria-hidden="true"> *</span></label>
        <input id={fieldId("name")} className="form-control mt-1" required maxLength={120} value={name} aria-invalid={errors.name ? true : undefined} aria-describedby={describedBy("name")} onChange={(event) => setName(event.target.value)} />
        <ErrorText id={`${fieldId("name")}-error`} message={errors.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="block text-sm font-medium">Down payment type</span>
          <span className="mt-1 block"><DropdownSelect aria-label="Down payment type" value={downType} align="start" className="w-full" options={[
            { value: "amount", label: "Fixed amount" },
            { value: "percent", label: "Percent of total" },
          ]} onChange={(value) => { setDownType(value); setDownValue("0"); }} /></span>
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor={fieldId("down_payment_value")}>{downType === "amount" ? "Down payment (PHP)" : "Down payment (%)"}</label>
          <input id={fieldId("down_payment_value")} type="number" min="0" max={downType === "percent" ? 100 : undefined} step="0.01" className="form-control mt-1" value={downValue}
            aria-invalid={errors.down_payment_value ? true : undefined} aria-describedby={describedBy("down_payment_value")} onChange={(event) => setDownValue(event.target.value)} />
          <ErrorText id={`${fieldId("down_payment_value")}-error`} message={errors.down_payment_value} />
        </div>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Installments after the down payment</legend>
        <p className="text-xs text-text-secondary">Each share is a percent of the balance left after the down payment. Due days count from the account creation date.</p>
        {rows.map((row, index) => {
          const key = (field: string) => `installments.${index}.${field}`;
          return <div key={index} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_7rem_7rem_auto] sm:items-start">
            <div>
              <label className="block text-xs font-medium" htmlFor={fieldId(key("label"))}>Label</label>
              <input id={fieldId(key("label"))} className="form-control mt-1" maxLength={120} value={row.label} aria-invalid={errors[key("label")] ? true : undefined} aria-describedby={describedBy(key("label"))} onChange={(event) => updateRow(index, { label: event.target.value })} />
              <ErrorText id={`${fieldId(key("label"))}-error`} message={errors[key("label")]} />
            </div>
            <div>
              <label className="block text-xs font-medium" htmlFor={fieldId(key("due_day_offset"))}>Due after (days)</label>
              <input id={fieldId(key("due_day_offset"))} type="number" min="0" max="65535" step="1" className="form-control mt-1" value={row.offset} aria-invalid={errors[key("due_day_offset")] ? true : undefined} aria-describedby={describedBy(key("due_day_offset"))} onChange={(event) => updateRow(index, { offset: event.target.value })} />
              <ErrorText id={`${fieldId(key("due_day_offset"))}-error`} message={errors[key("due_day_offset")]} />
            </div>
            <div>
              <label className="block text-xs font-medium" htmlFor={fieldId(key("percent_of_remaining_basis_points"))}>Share (%)</label>
              <input id={fieldId(key("percent_of_remaining_basis_points"))} type="number" min="0.01" max="100" step="0.01" className="form-control mt-1" value={row.percent} aria-invalid={errors[key("percent_of_remaining_basis_points")] ? true : undefined} aria-describedby={describedBy(key("percent_of_remaining_basis_points"))} onChange={(event) => updateRow(index, { percent: event.target.value })} />
              <ErrorText id={`${fieldId(key("percent_of_remaining_basis_points"))}-error`} message={errors[key("percent_of_remaining_basis_points")]} />
            </div>
            <Button type="button" size="sm" variant="neutral" className="sm:mt-6" disabled={rows.length === 1} aria-label={`Remove installment ${index + 1}`} onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>Remove</Button>
          </div>;
        })}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setRows((current) => [...current, { label: "", offset: "", percent: "" }])}>Add installment</Button>
          <p className={shareTotal === FULL_SHARE_BP ? "text-sm text-text-secondary" : "text-sm font-medium text-status-error"}>Shares total {percentLabel(shareTotal)} of 100%</p>
        </div>
        <ErrorText id={`${fieldId("installments")}-error`} message={errors.installments} />
      </fieldset>
      {generalError && <p role="alert" className="text-sm text-status-error">{generalError}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="neutral" disabled={save.isPending} onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : plan ? `Save as version ${plan.version + 1}` : "Add payment plan"}</Button>
      </div>
    </form>
  </DialogShell>;
}

function PreviewDialog({ plan, onClose }: { plan: FinancePaymentPlan; onClose: () => void }) {
  const [total, setTotal] = useState("");
  const [inputError, setInputError] = useState("");
  const preview = useMutation({ mutationFn: (totalCents: number) => previewFinancePaymentPlan(plan.id, totalCents) });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const totalCents = parse(total);
      if (totalCents < 1) throw new Error("zero");
      setInputError("");
      preview.mutate(totalCents);
    } catch {
      setInputError("Enter a total above ₱0.00.");
    }
  }

  return <DialogShell title={`Preview ${plan.name} (version ${plan.version})`} description="Shows the schedule an account created today would get. Nothing is saved." onClose={onClose} busy={false}>
    <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={submit} noValidate>
      <div className="min-w-[12rem] flex-1">
        <label className="block text-sm font-medium" htmlFor="plan-preview-total">Total due (PHP)</label>
        <input id="plan-preview-total" type="number" min="0.01" step="0.01" className="form-control mt-1" value={total} aria-invalid={inputError ? true : undefined} aria-describedby={inputError ? "plan-preview-total-error" : undefined} onChange={(event) => setTotal(event.target.value)} />
      </div>
      <Button type="submit" disabled={preview.isPending}>{preview.isPending ? "Calculating…" : "Preview schedule"}</Button>
    </form>
    <ErrorText id="plan-preview-total-error" message={inputError} />
    {preview.isError && <p role="alert" className="mt-3 text-sm text-status-error">{preview.error.message}</p>}
    {preview.data && <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-left text-sm">
        <thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">
          <th scope="col" className="px-3 py-2">#</th>
          <th scope="col" className="px-3 py-2">Installment</th>
          <th scope="col" className="px-3 py-2">Due date</th>
          <th scope="col" className="px-3 py-2 text-right">Amount</th>
        </tr></thead>
        <tbody>{preview.data.installments.map((row) => <tr key={row.sequence} className="border-b last:border-0">
          <td className="px-3 py-2 font-mono">{row.sequence}</td>
          <td className="px-3 py-2">{row.label}</td>
          <td className="px-3 py-2">{formatDate(row.dueDate)}</td>
          <td className="px-3 py-2 text-right font-mono">{format(centavos(row.amountCents))}</td>
        </tr>)}</tbody>
        <tfoot><tr className="border-t border-border font-semibold">
          <td className="px-3 py-2" colSpan={3}>Total</td>
          <td className="px-3 py-2 text-right font-mono">{format(centavos(preview.data.installments.reduce((sum, row) => sum + row.amountCents, 0)))}</td>
        </tr></tfoot>
      </table>
    </div>}
  </DialogShell>;
}

function DeactivateDialog({ plan, onClose }: { plan: FinancePaymentPlan; onClose: () => void }) {
  const queryClient = useQueryClient();
  const deactivate = useMutation({
    mutationFn: () => deactivateFinancePaymentPlan(plan.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance-settings", "plans"] });
      onClose();
    },
  });
  return <DialogShell title={`Deactivate ${plan.name}?`} description={`Version ${plan.version} will stop being offered to new accounts. Accounts already on it keep it. Plans are never deleted.`} onClose={onClose} busy={deactivate.isPending}>
    {deactivate.isError && <p role="alert" className="mt-4 text-sm text-status-error">{deactivate.error.message}</p>}
    <div className="mt-5 flex justify-end gap-2">
      <Button type="button" variant="neutral" disabled={deactivate.isPending} onClick={onClose}>Keep active</Button>
      <Button type="button" variant="destructive" disabled={deactivate.isPending} onClick={() => deactivate.mutate()}>{deactivate.isPending ? "Deactivating…" : "Deactivate plan"}</Button>
    </div>
  </DialogShell>;
}

type OpenDialog = { kind: "create" } | { kind: "revise" | "preview" | "deactivate"; plan: FinancePaymentPlan };

function PlanCard({ plan, supersededBy, editable, open }: { plan: FinancePaymentPlan; supersededBy?: FinancePaymentPlan; editable: boolean; open: (dialog: OpenDialog) => void }) {
  const installments = [...plan.installments].sort((a, b) => a.sequence - b.sequence);
  const revisable = editable && plan.active && !supersededBy;
  return <Card>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-text-primary">{plan.name} <span className="font-normal text-text-secondary">· version {plan.version}</span></h2>
        <p className="mt-1 text-sm text-text-secondary">
          Down payment: {downPaymentLabel(plan)}
          {plan.previousVersionId && ` · replaces version ${plan.version - 1}`}
          {supersededBy && ` · superseded by version ${supersededBy.version}`}
        </p>
      </div>
      <StatusBadge status={plan.active ? "active" : "inactive"} />
    </div>
    {installments.length === 0
      ? <p className="mt-4 text-sm text-text-secondary">No installment steps are configured.</p>
      : <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">
              <th scope="col" className="py-2 pr-4">Sequence</th>
              <th scope="col" className="py-2 pr-4">Installment</th>
              <th scope="col" className="py-2 pr-4">Due after</th>
              <th scope="col" className="py-2">Share of remaining balance</th>
            </tr></thead>
            <tbody>{installments.map((installment) => <tr key={installment.sequence} className="border-b last:border-0">
              <td className="py-2 pr-4 font-mono">{installment.sequence}</td>
              <td className="py-2 pr-4">{installment.label}</td>
              <td className="py-2 pr-4">{installment.dueDayOffset} days</td>
              <td className="py-2">{percentLabel(installment.percentOfRemainingBasisPoints)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
    <div className="mt-4 flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="secondary" aria-label={`Preview ${plan.name} version ${plan.version}`} onClick={() => open({ kind: "preview", plan })}>Preview schedule</Button>
      {revisable && <Button type="button" size="sm" variant="secondary" aria-label={`Revise ${plan.name}`} onClick={() => open({ kind: "revise", plan })}>Revise</Button>}
      {revisable && <Button type="button" size="sm" variant="secondary" aria-label={`Deactivate ${plan.name}`} onClick={() => open({ kind: "deactivate", plan })}>Deactivate</Button>}
    </div>
  </Card>;
}

export function LivePaymentPlans({ plans, editable }: { plans: FinancePaymentPlan[]; editable: boolean }) {
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const supersededBy = new Map(plans.filter((plan) => plan.previousVersionId).map((plan) => [plan.previousVersionId as string, plan]));
  // Latest versions first within each name, active plans before inactive ones.
  const ordered = [...plans].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name) || b.version - a.version);
  const close = () => setDialog(null);

  return <>
    {editable && <div className="mb-4 flex justify-end"><Button type="button" onClick={() => setDialog({ kind: "create" })}>Add payment plan</Button></div>}
    {ordered.length === 0
      ? <EmptyState message="No payment plans are configured." />
      : <div className="grid gap-4">{ordered.map((plan) => <PlanCard key={plan.id} plan={plan} supersededBy={supersededBy.get(plan.id)} editable={editable} open={setDialog} />)}</div>}
    {dialog?.kind === "create" && <PlanFormDialog onClose={close} />}
    {dialog?.kind === "revise" && <PlanFormDialog plan={dialog.plan} onClose={close} />}
    {dialog?.kind === "preview" && <PreviewDialog plan={dialog.plan} onClose={close} />}
    {dialog?.kind === "deactivate" && <DeactivateDialog plan={dialog.plan} onClose={close} />}
  </>;
}
