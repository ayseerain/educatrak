import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { SelectAllCheckbox } from "@/components/ui/SelectAllCheckbox";
import { cn } from "@/lib/cn";
import { channelsFromValue, channelsValue, hasSelectedReminderContact, isRowControlClick, REMINDER_CHANNEL_OPTIONS, selectedReminderContacts } from "./reminderChannels";
import { useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFollowUpItems, sendReminders, type FollowUpFilters } from "@/api/followUpApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { TableFilters, useTableFilters } from "@/components/ui/TableFilters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { centavos, format } from "@/lib/money";
import { en } from "@/i18n/en";
import { formatDate, formatDateTime } from "@/lib/dates";
import type { AuthenticatedUser } from "@/lib/types";
import { can } from "@/lib/permissions";

const followUpFilterDefaults = { search: "", grade: "", section: "", status: "", sort: "days_overdue", direction: "asc" };

export function LiveFollowupPage({ user, workspaceSwitch }: { user: AuthenticatedUser; workspaceSwitch?: ReactNode }) {
  const canSendReminders = can(user, "followup.send") && import.meta.env.VITE_REMINDER_DELIVERY_ENABLED === "true";
  const queryClient = useQueryClient();
  const tableFilters = useTableFilters(followUpFilterDefaults);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [channels, setChannels] = useState<Array<"email" | "sms">>(["email", "sms"]);
  const [selectionNotice, setSelectionNotice] = useState("");
  const [deliveryNotice, setDeliveryNotice] = useState("");
  const batchKey = useRef<string | null>(null);
  const applied = tableFilters.applied;
  const filters: FollowUpFilters = { search: applied.search.trim() || undefined, grade: applied.grade.trim() || undefined, section: applied.section.trim() || undefined, status: (applied.status || undefined) as FollowUpFilters["status"], sort: applied.sort as FollowUpFilters["sort"], direction: applied.direction as FollowUpFilters["direction"] };
  const followUp = useQuery({
    queryKey: ["follow-up", filters, tableFilters.page, tableFilters.perPage],
    queryFn: () => getFollowUpItems({ ...filters, page: tableFilters.page, perPage: tableFilters.perPage }),
  });
  const sendMutation = useMutation({
    mutationFn: sendReminders,
    onSuccess: async (result) => {
      setDeliveryNotice(`${result.summary.queued} queued, ${result.summary.failed} failed, ${result.summary.notSent} not sent. Queued messages are awaiting provider delivery confirmation.`);
      setSelectedIds([]);
      batchKey.current = null;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notification-log"] }),
        queryClient.invalidateQueries({ queryKey: ["follow-up"] }),
      ]);
    },
    onError: (error: Error) => setDeliveryNotice(error.message),
  });

  const pageItems = followUp.data?.data ?? [];
  const visibleItems = canSendReminders
    ? pageItems.filter((item) => item.guardians.some((guardian) => hasSelectedReminderContact(channels, guardian)))
    : pageItems;
  const eligibleIds = visibleItems.map((item) => item.id);
  const selectedEligibleIds = selectedIds.filter((id) => eligibleIds.includes(id));

  function clearSelection(reason: string) {
    if (selectedIds.length) setSelectionNotice(`Selection cleared because ${reason} changed.`);
    setSelectedIds([]);
  }

  function applyFilters() {
    clearSelection("filters");
    tableFilters.apply();
  }

  const selectionAndDeliveryControls = canSendReminders ? (
    <div className="border-b border-border bg-surface/40 p-3">
      <div className="flex flex-wrap items-center gap-3">
        {followUp.data && <SelectAllCheckbox
          label="Select all eligible"
          ariaLabel="Select all eligible on current page"
          checked={eligibleIds.length > 0 && eligibleIds.every((id) => selectedIds.includes(id))}
          indeterminate={selectedEligibleIds.length > 0 && !eligibleIds.every((id) => selectedIds.includes(id))}
          disabled={!eligibleIds.length || sendMutation.isPending}
          onChange={(checked) => { setSelectionNotice(""); setSelectedIds(checked ? [...eligibleIds] : []); }}
        />}
        <span className="ml-auto flex items-center gap-2 text-sm font-medium text-text-secondary">Send by
          <DropdownSelect aria-label="Send reminders by" value={channelsValue(channels)} options={REMINDER_CHANNEL_OPTIONS} onChange={(value) => { clearSelection("delivery method"); setChannels(channelsFromValue(value)); }} className="min-w-40" />
        </span>
        <Button type="button" disabled={!selectedEligibleIds.length || !channels.length || sendMutation.isPending} onClick={() => { if (!window.confirm(`Queue reminders for ${selectedEligibleIds.length} selected installment(s) using ${channels.join(" and ")}?`)) return; setDeliveryNotice(""); batchKey.current ??= crypto.randomUUID(); sendMutation.mutate({ idempotencyKey: batchKey.current, installmentIds: selectedEligibleIds, channels }); }}>
          {sendMutation.isPending ? "Sending…" : `Send reminders (${selectedEligibleIds.length})`}
        </Button>
      </div>
      {followUp.data && <p aria-live="polite" className="mt-2 text-sm text-text-secondary">{selectedEligibleIds.length} selected</p>}
      {selectionNotice && <p role="status" className="mt-2 text-sm text-text-secondary">{selectionNotice}</p>}
      {deliveryNotice && <p role={sendMutation.isError ? "alert" : "status"} className="mt-2 text-sm text-text-secondary">{deliveryNotice}</p>}
    </div>
  ) : null;

  return <>
    <div className="page-header-card mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold tracking-tight text-text-primary">{en.followup.title}</h1><p className="mt-1 text-sm text-text-secondary">{en.followup.description}</p></div>
    </div>
    {workspaceSwitch}
    {can(user, "followup.send") && !canSendReminders && <p role="status" className="mb-3 text-sm text-text-secondary">Reminder sending is unavailable until delivery policies are approved.</p>}
    <Card className="p-0">
      <div className="border-b border-border px-5 py-3"><TableFilters embedded scope="Follow-up" defaults={followUpFilterDefaults} draft={tableFilters.draft} applied={tableFilters.applied} search={{ key: "search", label: en.followup.searchLabel, placeholder: en.followup.searchPlaceholder }} fields={[
      { key: "grade", label: en.followup.grade }, { key: "section", label: en.followup.section },
      { key: "status", label: en.followup.status, type: "select", options: [{ value: "", label: en.followup.dueSoonAndOverdue }, { value: "due_soon", label: en.followup.dueSoon }, { value: "overdue", label: en.followup.overdue }] },
      { key: "sort", label: en.followup.sortBy, type: "select", options: [{ value: "days_overdue", label: en.followup.overdueSort }, { value: "amount_due", label: en.followup.amountSort }, { value: "due_date", label: en.followup.dueDateSort }] },
      { key: "direction", label: en.followup.direction, type: "select", options: [{ value: "asc", label: en.followup.ascending }, { value: "desc", label: en.followup.descending }] },
    ]} onChange={tableFilters.update} onSearch={(key, value) => { clearSelection("filters"); tableFilters.search(key, value); }} onApply={applyFilters} onClear={() => { clearSelection("filters"); tableFilters.clear(); }} onRemove={(key) => { clearSelection("filters"); tableFilters.remove(key); }} /></div>
      {followUp.isPending && <LoadingState message={en.followup.loading} layout="table" bare columns={7} />}
      {followUp.isError && <ErrorState message={followUp.error.message} onRetry={() => void followUp.refetch()} />}
      {followUp.data && (visibleItems.length === 0 ? <div className="overflow-x-auto">{selectionAndDeliveryControls}<div className="p-4"><EmptyState message={pageItems.length ? "No students have the selected contact method." : en.followup.noMatches} /></div></div> : <div>{selectionAndDeliveryControls}<div className="overflow-x-auto"><table className="w-full min-w-[1150px] table-fixed border-collapse text-left text-sm"><colgroup>{canSendReminders && <col className="w-[4%]" />}<col className="w-[14%]" /><col className="w-[8%]" /><col className="w-[12%]" /><col className="w-[9%]" /><col className="w-[7%]" /><col className="w-[10%]" /><col className="w-[17%]" /><col className="w-[11%]" /><col className="w-[8%]" /></colgroup><thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">{canSendReminders && <th scope="col" className="px-3 py-2 text-center">Select</th>}{[en.followup.student, en.followup.gradeAndSection, en.followup.installment, en.followup.dueDate, en.followup.daysOverdue, en.followup.amountDue, en.followup.guardianContact, en.followup.lastReminder, en.table.status].map((heading) => <th key={heading} scope="col" className={`px-3 py-3 ${heading === en.followup.daysOverdue || heading === en.followup.amountDue ? "text-right" : heading === en.table.status ? "text-center" : "text-left"}`}>{heading}</th>)}</tr></thead><tbody>{visibleItems.map((item) => <tr key={item.id} className={cn("border-b align-top last:border-0", canSendReminders && "cursor-pointer hover:bg-surface/70", selectedIds.includes(item.id) && "bg-brand-green-light/15")} onClick={canSendReminders && !sendMutation.isPending ? (event) => { if (isRowControlClick(event.target)) return; setSelectionNotice(""); setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]); } : undefined}>{canSendReminders && <td className="px-3 py-2 text-center"><input type="checkbox" aria-label={`Select ${item.studentName} ${item.installment}`} checked={selectedIds.includes(item.id)} disabled={sendMutation.isPending} onChange={(event) => { setSelectionNotice(""); setSelectedIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id)); }} /></td>}<td className="break-words px-3 py-2"><span className="block font-medium">{item.studentName}</span><span className="break-all font-mono text-xs text-text-secondary">{item.studentNo ?? "—"}</span></td><td className="break-words px-3 py-2">{[item.grade, item.section].filter(Boolean).join(" / ") || en.followup.unassigned}</td><td className="break-words px-3 py-2">{item.installment}<span className="mt-1 block text-xs text-text-secondary">{item.schoolYear ?? en.followup.schoolYearUnavailable}</span></td><td className="whitespace-nowrap px-3 py-2">{formatDate(item.dueDate)}</td><td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{item.daysOverdue}</td><td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">{format(centavos(item.amountDueCents))}</td><td className="break-words px-3 py-2">{item.guardians.length ? item.guardians.map((guardian, index) => { const contacts = selectedReminderContacts(channels, guardian); return contacts.length ? <div key={`${guardian.name}-${index}`} className="mb-1 last:mb-0">{guardian.name}<span className="block break-all text-xs text-text-secondary">{contacts.join(" · ")}</span></div> : null; }) : en.followup.noGuardian}</td><td className="whitespace-nowrap px-3 py-2">{item.lastReminderAt ? formatDateTime(item.lastReminderAt) : en.followup.notRecorded}</td><td className="px-3 py-2 text-center"><StatusBadge status={item.status.replace(/_/g, " ")} /></td></tr>)}</tbody></table></div><PaginationControls currentPage={followUp.data.currentPage} lastPage={followUp.data.lastPage} perPage={followUp.data.perPage} total={followUp.data.total} label="installments" busy={followUp.isFetching} onPageChange={(next) => { clearSelection("page"); tableFilters.setPage(next); }} onPerPageChange={(size) => { clearSelection("page size"); tableFilters.changePerPage(size); }} /></div>)}
    </Card>
    <p className="mt-3 text-xs text-text-secondary">{en.followup.reminderAvailability}</p>
  </>;
}
