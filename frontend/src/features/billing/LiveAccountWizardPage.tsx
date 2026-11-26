import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBillingAccount,
  getAccountCreationOptions,
  previewBillingAccount,
  type AccountCreationInput,
  type AccountCreationOptions,
} from "@/api/accountCreationApi";
import { searchPaymentStudents, type PaymentStudent } from "@/api/cashierApi";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatDate } from "@/lib/dates";
import { centavos, format } from "@/lib/money";

type Plan = AccountCreationOptions["paymentPlans"][number];

function planLabel(plan: Plan): string {
  const downPayment = plan.downPaymentType === "percent" ? `${plan.downPaymentValue / 100}% down` : `${format(centavos(plan.downPaymentValue))} down`;
  return `${plan.name} · version ${plan.version} · ${downPayment}, ${plan.installments.length} installment${plan.installments.length === 1 ? "" : "s"}`;
}

function StudentPicker({ selected, onSelect }: { selected: PaymentStudent | null; onSelect: (student: PaymentStudent | null) => void }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const trimmed = search.trim();
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(trimmed), 250);
    return () => window.clearTimeout(timeout);
  }, [trimmed]);
  const results = useQuery({
    queryKey: ["account-wizard-student-search", debounced],
    queryFn: () => searchPaymentStudents(debounced),
    enabled: !selected && debounced.length >= 2,
  });

  if (selected) {
    return <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand-green-light bg-status-success/5 p-4 text-sm">
      <p role="status"><span className="font-medium">{selected.name}</span> · LRN <span className="tabular-nums">{selected.number}</span>{selected.grade ? ` · ${selected.grade}` : " · no grade level"}{selected.section ? ` ${selected.section}` : ""}</p>
      <Button type="button" size="sm" variant="secondary" onClick={() => { onSelect(null); setSearch(""); }}>Change student</Button>
    </div>;
  }

  return <div className="mt-3">
    <label htmlFor="account-wizard-student" className="block text-sm font-medium">Student name or LRN</label>
    <input id="account-wizard-student" type="search" autoComplete="off" className="form-control mt-1" value={search} placeholder="Enter at least two characters" onChange={(event) => setSearch(event.target.value)} />
    {trimmed.length > 0 && trimmed.length < 2 && <p className="mt-2 text-sm text-text-secondary">Enter at least two characters to search.</p>}
    {results.isFetching && <LoadingState message="Searching students…" layout="list" />}
    {results.isError && <ErrorState message={results.error.message} onRetry={() => void results.refetch()} />}
    {results.data?.length === 0 && <p role="status" className="mt-2 text-sm text-text-secondary">No matching students were found.</p>}
    {results.data && results.data.length > 0 && <ul aria-label="Matching students" className="mt-2 divide-y divide-border overflow-hidden rounded-md border border-border bg-white shadow-raised">
      {results.data.map((student) => <li key={student.id}><button type="button" onClick={() => onSelect(student)} className="flex min-h-control w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark">
        <span className="font-medium">{student.name}</span>
        <span className="text-sm text-text-secondary"><span className="tabular-nums">{student.number}</span>{student.grade ? ` · ${student.grade}` : ""}{student.section ? ` ${student.section}` : ""}</span>
      </button></li>)}
    </ul>}
  </div>;
}

function SectionHeading({ step, title }: { step: number; title: string }) {
  return <h2 className="text-base font-semibold text-text-primary"><span className="mr-2 tabular-nums text-text-secondary">{step}.</span>{title}</h2>;
}

export function LiveAccountWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [student, setStudent] = useState<PaymentStudent | null>(null);
  const [planId, setPlanId] = useState("");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const options = useQuery({ queryKey: ["account-creation-options"], queryFn: getAccountCreationOptions });
  const year = options.data?.currentSchoolYear ?? null;
  const plans = options.data?.paymentPlans ?? [];

  useEffect(() => {
    if (!planId && plans[0]) setPlanId(plans[0].id);
  }, [planId, plans]);

  const ready = student !== null && year !== null && planId !== "";
  const input = (excludedFeeItemIds: string[]): AccountCreationInput => ({ studentId: student?.id ?? "", schoolYearId: year?.id ?? "", paymentPlanId: planId, excludedFeeItemIds });
  // The unfiltered preview lists every active fee in the student's schedule, so removed optional fees can be re-added.
  const baseline = useQuery({
    queryKey: ["account-creation-preview", student?.id, year?.id, planId, []],
    queryFn: () => previewBillingAccount(input([])),
    enabled: ready,
  });
  const preview = useQuery({
    queryKey: ["account-creation-preview", student?.id, year?.id, planId, excluded],
    queryFn: () => previewBillingAccount(input(excluded)),
    enabled: ready && excluded.length > 0,
  });
  const current = excluded.length > 0 ? preview : baseline;
  const create = useMutation({
    mutationFn: () => createBillingAccount(input(excluded)),
    onSuccess: async (accountId) => {
      await queryClient.invalidateQueries({ queryKey: ["billing-accounts"] });
      navigate(`/accounts/${encodeURIComponent(accountId)}`);
    },
  });

  // Changing the student or plan starts the fee choices and confirmation over.
  const resetCreate = create.reset;
  useEffect(() => {
    setExcluded([]);
    setConfirmed(false);
    resetCreate();
  }, [student?.id, planId, resetCreate]);

  function toggleFee(feeItemId: string, include: boolean) {
    setExcluded((list) => include ? list.filter((id) => id !== feeItemId) : [...list, feeItemId]);
    setConfirmed(false);
  }

  const canCreate = ready && current.data !== undefined && !current.isFetching && confirmed && !create.isPending;

  return <>
    <PageHeader title="New account" description="Set up a billing account for one student in the current school year." backTo="/accounts" />
    {options.isPending && <LoadingState message="Loading school year and payment plans…" layout="list" />}
    {options.isError && <ErrorState message={options.error.message} onRetry={() => void options.refetch()} />}
    {options.data && <Card data-testid="account-wizard" className="mx-auto w-full max-w-5xl space-y-8">
      <section>
        <SectionHeading step={1} title="Student and school year" />
        {year === null
          ? <p role="alert" className="mt-3 rounded-md border border-status-warning bg-status-warning/5 p-4 text-sm text-text-primary">No current school year is configured. An Administrator must set exactly one current school year before accounts can be created.</p>
          : <p className="mt-2 text-sm text-text-secondary">School year: <span className="font-medium text-text-primary">{year.label}</span> (current). Accounts can only be created for the current school year.</p>}
        <StudentPicker selected={student} onSelect={setStudent} />
      </section>

      <section>
        <SectionHeading step={2} title="Payment plan" />
        {plans.length === 0
          ? <p role="alert" className="mt-3 rounded-md border border-status-warning bg-status-warning/5 p-4 text-sm text-text-primary">No active payment plans are configured. Accounting must add or reactivate a plan first.</p>
          : <div className="mt-3">
              <span className="block text-sm font-medium">Active plan</span>
              <span className="mt-1 block"><DropdownSelect aria-label="Payment plan" value={planId} align="start" className="w-full" options={plans.map((plan) => ({ value: plan.id, label: planLabel(plan) }))} onChange={setPlanId} /></span>
            </div>}
      </section>

      <section aria-live="polite">
        <SectionHeading step={3} title="Fees and schedule" />
        {!ready && <p className="mt-2 text-sm text-text-secondary">Select a student{plans.length > 0 ? "" : " and a plan"} to load the fee schedule for their grade level.</p>}
        {ready && baseline.isPending && <LoadingState message="Loading the fee schedule…" layout="table" columns={3} />}
        {ready && baseline.isError && <p role="alert" className="mt-3 rounded-md border border-status-error/40 bg-status-error/5 p-4 text-sm text-status-error">{baseline.error.message}</p>}
        {baseline.data && <>
          <p className="mt-2 text-sm text-text-secondary">Required fees cannot be removed. Untick an optional fee to leave it off this account.</p>
          <ul className="mt-3 divide-y divide-border rounded-md border border-border">
            {baseline.data.items.map((item) => {
              const included = !excluded.includes(item.feeItemId);
              return <li key={item.feeItemId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={included} disabled={item.required || create.isPending} onChange={(event) => toggleFee(item.feeItemId, event.target.checked)} />
                  <span>{item.name}</span>
                  <span className="text-text-secondary">{item.required ? "· required" : "· optional"}</span>
                </label>
                <span className={included ? "tabular-nums" : "tabular-nums text-text-secondary line-through"}>{format(centavos(item.amountCents))}</span>
              </li>;
            })}
          </ul>
          {excluded.length > 0 && preview.isPending && <LoadingState message="Recalculating the schedule…" layout="list" />}
          {excluded.length > 0 && preview.isError && <p role="alert" className="mt-3 text-sm text-status-error">{preview.error.message}</p>}
          {current.data && <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left text-sm">
              <caption className="mb-2 text-left text-sm text-text-secondary">Schedule from plan version {current.data.paymentPlanVersion}, starting today.</caption>
              <thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">
                <th scope="col" className="px-3 py-2">Installment</th>
                <th scope="col" className="px-3 py-2">Due date</th>
                <th scope="col" className="px-3 py-2 text-right">Amount</th>
              </tr></thead>
              <tbody>{current.data.installments.map((row) => <tr key={row.sequence} className="border-b last:border-0">
                <td className="px-3 py-2">{row.label}</td>
                <td className="px-3 py-2">{formatDate(row.dueDate)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{format(centavos(row.amountCents))}</td>
              </tr>)}</tbody>
              <tfoot><tr className="border-t border-border font-semibold">
                <td className="px-3 py-2" colSpan={2}>Total due</td>
                <td className="px-3 py-2 text-right tabular-nums">{format(centavos(current.data.totalDueCents))}</td>
              </tr></tfoot>
            </table>
          </div>}
        </>}
        {ready && baseline.data === undefined && !baseline.isPending && !baseline.isError && <EmptyState message="No fee schedule loaded." />}
      </section>

      {current.data && student && year && <section>
        <SectionHeading step={4} title="Review and create" />
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={confirmed} disabled={create.isPending} onChange={(event) => setConfirmed(event.target.checked)} />
          <span>Create a new billing account for <span className="font-medium">{student.name}</span> in <span className="font-medium">{year.label}</span> with a total due of <span className="tabular-nums font-medium">{format(centavos(current.data.totalDueCents))}</span>.</span>
        </label>
        {create.isError && <p role="alert" className="mt-3 text-sm text-status-error">{create.error.message}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="neutral" disabled={create.isPending} onClick={() => navigate("/accounts")}>Cancel</Button>
          <Button type="button" disabled={!canCreate} onClick={() => create.mutate()}>{create.isPending ? "Creating…" : "Create account"}</Button>
        </div>
      </section>}
    </Card>}
  </>;
}
