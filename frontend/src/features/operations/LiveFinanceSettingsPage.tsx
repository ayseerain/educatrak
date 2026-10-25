import { useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFinanceFeeItem,
  deactivateFinanceFeeItem,
  listFinanceFeeSchedules,
  listFinancePaymentPlans,
  reviseFinanceFeeItem,
  type FeeItemInput,
  type FinanceFeeSchedule,
  type FinancePaymentPlan,
} from "@/api/financeSettingsApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useClientPagination } from "@/components/ui/useClientPagination";
import { centavos, format, parse } from "@/lib/money";

function FinanceSettingsHeader({ title, editable, section }: { title: string; editable: boolean; section: "fees" | "plans" }) {
  return <>
    <div className="mb-5">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-text-secondary">Persisted finance configuration for the school.</p>
    </div>
    <Card className="mb-4 border-l-4 border-l-brand-green">
      <p className="text-sm text-text-secondary">
        {section === "fees" && editable
          ? "Your role may manage fee items. Changes create a new version and apply to new accounts only."
          : section === "plans" && editable
            ? "Your role may manage finance settings, but payment plan changes are not available yet."
            : "These finance settings are read-only for your role."}
      </p>
    </Card>
  </>;
}

function FeeItemEditorDialog({
  schedule,
  item,
  isSaving,
  error,
  onSave,
  onOpenChange,
}: {
  schedule: FinanceFeeSchedule;
  item?: FinanceFeeSchedule["items"][number];
  isSaving: boolean;
  error?: string;
  onSave: (input: FeeItemInput) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<FeeItemInput["category"]>(
    item?.category === "tuition" || item?.category === "miscellaneous" || item?.category === "other"
      ? item.category
      : "tuition",
  );
  const [amount, setAmount] = useState(item ? (item.amountCents / 100).toFixed(2) : "");
  const [required, setRequired] = useState(item?.required ?? true);
  const [amountError, setAmountError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const amountCents = parse(amount);
      setAmountError("");
      onSave({ name: name.trim(), category, amountCents, required });
    } catch {
      setAmountError("Enter a valid non-negative amount.");
    }
  }

  return <Dialog.Root open onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-border bg-white p-6 shadow-card focus:outline-none">
        <Dialog.Title className="text-xl font-semibold">{item ? "Revise fee item" : "Add fee item"}</Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-text-secondary">
          {schedule.schoolYear} · {schedule.gradeLevel}. Revisions preserve the previous version for existing accounts.
        </Dialog.Description>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium" htmlFor="fee-item-name">Name
            <input id="fee-item-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark" />
          </label>
          <label className="block text-sm font-medium" htmlFor="fee-item-category">Category
            <select id="fee-item-category" value={category} onChange={(event) => setCategory(event.target.value as FeeItemInput["category"])} className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark">
              <option value="tuition">Tuition</option>
              <option value="miscellaneous">Miscellaneous</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-sm font-medium" htmlFor="fee-item-amount">Amount (PHP)
            <input id="fee-item-amount" type="number" min="0" step="0.01" required value={amount} onChange={(event) => { setAmount(event.target.value); setAmountError(""); }} className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark" />
          </label>
          {amountError && <p role="alert" className="text-sm text-status-error">{amountError}</p>}
          {error && <p role="alert" className="text-sm text-status-error">{error}</p>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />Required fee</label>
          <div className="flex justify-end gap-2 pt-2">
            <Dialog.Close asChild><Button type="button" variant="neutral">Cancel</Button></Dialog.Close>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : item ? "Save new version" : "Add fee item"}</Button>
          </div>
        </form>
        <Dialog.Close aria-label="Close fee item dialog" className="absolute right-4 top-4 rounded px-2 py-1 text-text-secondary hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark">×</Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function FeeSchedulesTable({
  schedules,
  editable,
  onAdd,
  onEdit,
  onDeactivate,
  isDeactivating,
}: {
  schedules: FinanceFeeSchedule[];
  editable: boolean;
  onAdd: (schedule: FinanceFeeSchedule) => void;
  onEdit: (schedule: FinanceFeeSchedule, item: FinanceFeeSchedule["items"][number]) => void;
  onDeactivate: (item: FinanceFeeSchedule["items"][number]) => void;
  isDeactivating: boolean;
}) {
  if (schedules.length === 0) return <EmptyState message="No fee schedules are configured." />;

  return <div className="grid gap-4">
    {schedules.map((schedule) => <FeeScheduleCard key={schedule.id} schedule={schedule} editable={editable} onAdd={onAdd} onEdit={onEdit} onDeactivate={onDeactivate} isDeactivating={isDeactivating} />)}
  </div>;
}

function FeeScheduleCard({ schedule, editable, onAdd, onEdit, onDeactivate, isDeactivating }: {
  schedule: FinanceFeeSchedule;
  editable: boolean;
  onAdd: (schedule: FinanceFeeSchedule) => void;
  onEdit: (schedule: FinanceFeeSchedule, item: FinanceFeeSchedule["items"][number]) => void;
  onDeactivate: (item: FinanceFeeSchedule["items"][number]) => void;
  isDeactivating: boolean;
}) {
  const pagination = useClientPagination(schedule.items, "fee items");
  return <Card className="overflow-x-auto">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{schedule.name}</h2>
          <p className="mt-1 text-sm text-text-secondary">{schedule.schoolYear} · {schedule.gradeLevel}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={schedule.active ? "active" : "inactive"} />
          {editable && schedule.active && <Button type="button" size="sm" onClick={() => onAdd(schedule)}>Add fee item</Button>}
        </div>
      </div>
      {schedule.items.length === 0
        ? <EmptyState message="No fee items are configured for this schedule." />
        : <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead><tr className="border-b bg-surface text-xs uppercase text-text-secondary">
              <th scope="col" className="px-3 py-3">Fee item</th>
              <th scope="col" className="px-3 py-3">Category</th>
              <th scope="col" className="px-3 py-3 text-right">Amount</th>
              <th scope="col" className="px-3 py-3">Required</th>
              <th scope="col" className="px-3 py-3">Version</th>
              <th scope="col" className="px-3 py-3">Status</th>
              {editable && <th scope="col" className="px-3 py-3">Actions</th>}
            </tr></thead>
            <tbody>{pagination.items.map((item) => <tr key={item.id} className="border-b last:border-0">
              <td className="px-3 py-3">{item.name}</td>
              <td className="px-3 py-3">{item.category}</td>
              <td className="px-3 py-3 text-right font-mono">{format(centavos(item.amountCents))}</td>
              <td className="px-3 py-3">{item.required ? "Yes" : "No"}</td>
              <td className="px-3 py-3 font-mono">{item.version}</td>
              <td className="px-3 py-3"><StatusBadge status={schedule.active && item.active ? "active" : "inactive"} /></td>
              {editable && <td className="px-3 py-3"><div className="flex gap-2">
                <Button type="button" size="sm" variant="secondary" disabled={!schedule.active || !item.active || isDeactivating} onClick={() => onEdit(schedule, item)}>Edit</Button>
                <Button type="button" size="sm" variant="secondary" disabled={!schedule.active || !item.active || isDeactivating} onClick={() => onDeactivate(item)}>Deactivate</Button>
              </div></td>}
            </tr>)}</tbody>
          </table>}
      {schedule.items.length > 0 && pagination.controls}
  </Card>;
}

function PaymentPlanCards({ plans }: { plans: FinancePaymentPlan[] }) {
  if (plans.length === 0) return <EmptyState message="No payment plans are configured." />;

  return <div className="grid gap-4">
    {plans.map((plan) => <PaymentPlanCard key={plan.id} plan={plan} />)}
  </div>;
}

function PaymentPlanCard({ plan }: { plan: FinancePaymentPlan }) {
  const pagination = useClientPagination(plan.installments, "installments");
  return <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{plan.name}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Down payment rule: {plan.downPaymentType} · configured value {plan.downPaymentValue}
          </p>
        </div>
        <StatusBadge status={plan.active ? "active" : "inactive"} />
      </div>
      {plan.installments.length === 0
        ? <p className="mt-4 text-sm text-text-secondary">No installment steps are configured.</p>
        : <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead><tr className="border-b text-xs uppercase text-text-secondary">
                <th scope="col" className="py-2 pr-4">Sequence</th>
                <th scope="col" className="py-2 pr-4">Installment</th>
                <th scope="col" className="py-2 pr-4">Due day offset</th>
                <th scope="col" className="py-2">Share of remaining balance</th>
              </tr></thead>
              <tbody>{pagination.items.map((installment) => <tr key={`${plan.id}-${installment.sequence}`} className="border-b last:border-0">
                <td className="py-2 pr-4 font-mono">{installment.sequence}</td>
                <td className="py-2 pr-4">{installment.label}</td>
                <td className="py-2 pr-4">{installment.dueDayOffset}</td>
                <td className="py-2">{installment.percentOfRemainingBasisPoints} bp</td>
              </tr>)}</tbody>
            </table>
            {pagination.controls}
          </div>}
  </Card>;
}

export function LiveFinanceSettingsPage({
  section,
  editable,
}: {
  section: "fees" | "plans";
  editable: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ schedule: FinanceFeeSchedule; item?: FinanceFeeSchedule["items"][number] } | null>(null);
  const fees = useQuery({
    queryKey: ["finance-settings", "fees"],
    queryFn: listFinanceFeeSchedules,
    enabled: section === "fees",
  });
  const plans = useQuery({
    queryKey: ["finance-settings", "plans"],
    queryFn: listFinancePaymentPlans,
    enabled: section === "plans",
  });
  const saveFeeItem = useMutation({
    mutationFn: ({ schedule, item, input }: { schedule: FinanceFeeSchedule; item?: FinanceFeeSchedule["items"][number]; input: FeeItemInput }) => item
      ? reviseFinanceFeeItem(item.id, input)
      : createFinanceFeeItem(schedule.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance-settings", "fees"] });
      setEditing(null);
    },
  });
  const deactivateFeeItem = useMutation({
    mutationFn: deactivateFinanceFeeItem,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["finance-settings", "fees"] }),
  });

  const title = section === "fees" ? "Fees" : "Plans";
  function handleDeactivate(item: FinanceFeeSchedule["items"][number]) {
    if (window.confirm(`Deactivate “${item.name}”? It will remain in history and stop being available to new accounts.`)) {
      deactivateFeeItem.mutate(item.id);
    }
  }

  return <>
    <FinanceSettingsHeader title={title} editable={editable} section={section} />
    {section === "fees" && <>
      {fees.isPending && <LoadingState message="Loading fee schedules…" />}
      {fees.isError && <ErrorState message={fees.error.message} onRetry={() => void fees.refetch()} />}
      {fees.data && <FeeSchedulesTable
        schedules={fees.data}
        editable={editable}
        onAdd={(schedule) => setEditing({ schedule })}
        onEdit={(schedule, item) => setEditing({ schedule, item })}
        onDeactivate={handleDeactivate}
        isDeactivating={deactivateFeeItem.isPending}
      />}
      {deactivateFeeItem.isError && <p role="alert" className="mt-3 text-sm text-status-error">{deactivateFeeItem.error.message}</p>}
      {editing && <FeeItemEditorDialog
        key={`${editing.schedule.id}-${editing.item?.id ?? "new"}`}
        schedule={editing.schedule}
        item={editing.item}
        isSaving={saveFeeItem.isPending}
        error={saveFeeItem.isError ? saveFeeItem.error.message : undefined}
        onSave={(input) => saveFeeItem.mutate({ ...editing, input })}
        onOpenChange={(open) => { if (!open && !saveFeeItem.isPending) { setEditing(null); saveFeeItem.reset(); } }}
      />}
    </>}
    {section === "plans" && <>
      {plans.isPending && <LoadingState message="Loading payment plans…" />}
      {plans.isError && <ErrorState message={plans.error.message} onRetry={() => void plans.refetch()} />}
      {plans.data && <PaymentPlanCards plans={plans.data} />}
    </>}
  </>;
}
