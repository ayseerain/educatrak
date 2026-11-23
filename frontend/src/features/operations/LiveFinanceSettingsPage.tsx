import { useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleOff, Pencil } from "lucide-react";
import {
  createFinanceFeeItem,
  deactivateFinanceFeeItem,
  listFinanceFeeSchedules,
  listFinancePaymentPlans,
  reviseFinanceFeeItem,
  type FeeItemInput,
  type FinanceFeeSchedule,
} from "@/api/financeSettingsApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableActionButton, TableActionGroup } from "@/components/ui/TableActionButton";
import { useClientPagination } from "@/components/ui/useClientPagination";
import { LivePaymentPlans } from "@/features/operations/LivePaymentPlans";
import { centavos, format, parse } from "@/lib/money";

function FinanceSettingsHeader({ title, editable, section }: { title: string; editable: boolean; section: "fees" | "plans" }) {
  return <>
    <div className="page-header-card mb-5">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
      <p className="mt-1 text-sm text-text-secondary">Persisted finance configuration for the school.</p>
    </div>
    <Card className="mb-4 p-5">
      <p className="text-sm text-text-secondary">
        {section === "fees" && editable
          ? "New fee items update existing accounts in the selected grade. Revisions create a new version for future accounts."
          : section === "plans" && editable
            ? "Revising a plan creates a new version for new accounts only. Existing accounts keep their version."
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
  const [applyToAll, setApplyToAll] = useState(false);
  const [amountError, setAmountError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const amountCents = parse(amount);
      setAmountError("");
      onSave({ name: name.trim(), category, amountCents, required, applyToAll });
    } catch {
      setAmountError("Enter a valid non-negative amount.");
    }
  }

  return <Dialog.Root open onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-text-primary/40" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-6 shadow-raised focus:outline-none">
        <Dialog.Title className="text-xl font-semibold">{item ? "Revise fee item" : "Add fee item"}</Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-text-secondary">
          {schedule.schoolYear} · {schedule.gradeLevel}. New fee items update existing accounts; revisions preserve existing account terms.
        </Dialog.Description>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium" htmlFor="fee-item-name">Name
            <input id="fee-item-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="form-control mt-1" />
          </label>
          <label className="block text-sm font-medium">Apply to
            <span className="mt-1 block"><DropdownSelect aria-label="Apply to" value={applyToAll ? "all" : "selected"} options={[
              { value: "selected", label: schedule.gradeLevel },
              { value: "all", label: "All grades" },
            ]} onChange={(value) => setApplyToAll(value === "all")} className="w-full" align="start" /></span>
          </label>
          <label className="block text-sm font-medium">Category
            <span className="mt-1 block"><DropdownSelect aria-label="Category" value={category} options={[
              { value: "tuition", label: "Tuition" },
              { value: "miscellaneous", label: "Miscellaneous" },
              { value: "other", label: "Other" },
            ]} onChange={setCategory} className="w-full" align="start" /></span>
          </label>
          <label className="block text-sm font-medium" htmlFor="fee-item-amount">Amount (PHP)
            <input id="fee-item-amount" type="number" min="0" step="0.01" required value={amount} onChange={(event) => { setAmount(event.target.value); setAmountError(""); }} className="form-control mt-1" />
          </label>
          {amountError && <p role="alert" className="text-sm text-status-error">{amountError}</p>}
          {error && <p role="alert" className="text-sm text-status-error">{error}</p>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />Required fee</label>
          <div className="flex justify-end gap-2 pt-2">
            <Dialog.Close asChild><Button type="button" variant="neutral">Cancel</Button></Dialog.Close>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : item ? "Save changes" : "Add fee item"}</Button>
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
          <h2 className="text-base font-semibold text-text-primary">{schedule.name}</h2>
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
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              {editable && <col className="w-[12%]" />}
            </colgroup>
            <thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">
              <th scope="col" className="px-3 py-2">Fee item</th>
              <th scope="col" className="px-3 py-2">Category</th>
              <th scope="col" className="px-3 py-2 text-right">Amount</th>
              <th scope="col" className="px-3 py-2">Required</th>
              <th scope="col" className="px-3 py-2">Version</th>
              <th scope="col" className="px-3 py-2">Status</th>
              {editable && <th scope="col" className="w-[25%] px-3 py-2">Actions</th>}
            </tr></thead>
            <tbody>{pagination.items.map((item) => <tr key={item.id} className="border-b last:border-0">
              <td className="px-3 py-2">{item.name}</td>
              <td className="px-3 py-2">{item.category}</td>
              <td className="px-3 py-2 text-right font-mono">{format(centavos(item.amountCents))}</td>
              <td className="px-3 py-2">{item.required ? "Yes" : "No"}</td>
              <td className="px-3 py-2 font-mono">{item.version}</td>
              <td className="px-3 py-2"><StatusBadge status={schedule.active && item.active ? "active" : "inactive"} /></td>
              {editable && <td className="px-3 py-2"><TableActionGroup>
                <TableActionButton icon={Pencil} label="Edit" variant="secondary" disabled={!schedule.active || !item.active || isDeactivating} onClick={() => onEdit(schedule, item)} />
                <TableActionButton icon={CircleOff} label="Deactivate" variant="secondary" disabled={!schedule.active || !item.active || isDeactivating} onClick={() => onDeactivate(item)} />
              </TableActionGroup></td>}
            </tr>)}</tbody>
          </table>}
      {schedule.items.length > 0 && pagination.controls}
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
      {fees.isPending && <LoadingState message="Loading fee schedules…" layout="table" columns={4} />}
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
      {plans.isPending && <LoadingState message="Loading payment plans…" layout="table" columns={4} />}
      {plans.isError && <ErrorState message={plans.error.message} onRetry={() => void plans.refetch()} />}
      {plans.data && <LivePaymentPlans plans={plans.data} editable={editable} />}
    </>}
  </>;
}
