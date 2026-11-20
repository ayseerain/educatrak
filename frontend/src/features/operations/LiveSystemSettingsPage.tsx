import { useEffect, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CashierApiError } from "@/api/cashierApi";
import { getSystemSettings, updateSystemSettings, type SystemSettings, type SystemSettingsPatch } from "@/api/systemSettingsApi";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ViewTabs } from "@/components/ui/ViewTabs";

type Section = "receipt" | "email";
type FieldName = keyof SystemSettingsPatch;

const NOT_SET = "Not set";

const sectionCopy: Record<Section, { title: string; description: string; action: string }> = {
  receipt: { title: "Receipts", description: "School header, receipt title, and paper size printed on receipts.", action: "Edit receipt settings" },
  email: { title: "Notifications", description: "Sender identity and daily limit for school email.", action: "Edit email settings" },
};

function displayRows(section: Section, settings: SystemSettings): [string, string][] {
  if (section === "receipt") {
    return [
      ["School name", settings.schoolName ?? NOT_SET],
      ["School address", settings.schoolAddress ?? NOT_SET],
      ["Receipt title", settings.receiptTitle ?? NOT_SET],
      ["Paper size", settings.paperSize ?? NOT_SET],
      ["Next receipt number", settings.nextReceiptNumber ?? NOT_SET],
    ];
  }
  return [
    ["Sender name", settings.emailSenderName ?? NOT_SET],
    ["Sender address", settings.emailSenderAddress ?? NOT_SET],
    ["Daily send limit", settings.emailDailySendLimit === null ? NOT_SET : `${settings.emailDailySendLimit} messages`],
  ];
}

/** Only fields whose value differs from the loaded settings are sent. Blank optional text clears the value. */
function changedFields(section: Section, settings: SystemSettings, draft: Record<FieldName, string>): SystemSettingsPatch {
  const patch: SystemSettingsPatch = {};
  const text = (field: "school_name" | "school_address" | "email_sender_name" | "email_sender_address", current: string | null) => {
    const next = draft[field].trim();
    if (next !== (current ?? "")) patch[field] = next === "" ? null : next;
  };
  if (section === "receipt") {
    text("school_name", settings.schoolName);
    text("school_address", settings.schoolAddress);
    if (draft.receipt_title !== "" && draft.receipt_title !== settings.receiptTitle) patch.receipt_title = draft.receipt_title as SystemSettingsPatch["receipt_title"];
    if (draft.paper_size !== "" && draft.paper_size !== settings.paperSize) patch.paper_size = draft.paper_size as SystemSettingsPatch["paper_size"];
  } else {
    text("email_sender_name", settings.emailSenderName);
    text("email_sender_address", settings.emailSenderAddress);
    if (draft.email_daily_send_limit !== "" && Number(draft.email_daily_send_limit) !== settings.emailDailySendLimit) {
      patch.email_daily_send_limit = Number(draft.email_daily_send_limit);
    }
  }
  return patch;
}

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return <p id={id} role="alert" className="mt-1 text-sm text-status-error">{messages[0]}</p>;
}

function SystemSettingsDialog({ section, settings, onOpenChange }: { section: Section; settings: SystemSettings; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<FieldName, string>>({
    school_name: settings.schoolName ?? "",
    school_address: settings.schoolAddress ?? "",
    receipt_title: settings.receiptTitle ?? "",
    paper_size: settings.paperSize ?? "",
    email_sender_name: settings.emailSenderName ?? "",
    email_sender_address: settings.emailSenderAddress ?? "",
    email_daily_send_limit: settings.emailDailySendLimit === null ? "" : String(settings.emailDailySendLimit),
  });
  const [noChanges, setNoChanges] = useState(false);
  const save = useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(["system-settings"], updated);
      onOpenChange(false);
    },
  });
  const fieldErrors = save.error instanceof CashierApiError ? save.error.fieldErrors ?? {} : {};
  const generalError = save.isError && Object.keys(fieldErrors).length === 0 ? save.error.message : undefined;

  // Focus the first invalid field once per failed save.
  useEffect(() => {
    const errors = save.error instanceof CashierApiError ? save.error.fieldErrors : undefined;
    const firstInvalid = errors ? Object.keys(errors)[0] : undefined;
    if (firstInvalid) document.getElementById(`system-${firstInvalid}`)?.focus();
  }, [save.error]);

  function update(field: FieldName, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setNoChanges(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const patch = changedFields(section, settings, draft);
    if (Object.keys(patch).length === 0) {
      setNoChanges(true);
      return;
    }
    save.mutate(patch);
  }

  const textField = (field: FieldName, label: string, props: { type?: string; maxLength?: number; multiline?: boolean; min?: number } = {}) => {
    const id = `system-${field}`;
    const errorId = `${id}-error`;
    const invalid = Boolean(fieldErrors[field]?.length);
    const shared = {
      id,
      value: draft[field],
      maxLength: props.maxLength,
      "aria-invalid": invalid || undefined,
      "aria-describedby": invalid ? errorId : undefined,
      className: "form-control mt-1",
    };
    return <div>
      <label className="block text-sm font-medium" htmlFor={id}>{label}</label>
      {props.multiline
        ? <textarea {...shared} rows={3} onChange={(event) => update(field, event.target.value)} />
        : <input {...shared} type={props.type ?? "text"} min={props.min} onChange={(event) => update(field, event.target.value)} />}
      <FieldError id={errorId} messages={fieldErrors[field]} />
    </div>;
  };

  return <Dialog.Root open onOpenChange={(open) => { if (!save.isPending) onOpenChange(open); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-text-primary/40" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-6 shadow-raised focus:outline-none">
        <Dialog.Title className="text-lg font-semibold text-text-primary">{sectionCopy[section].action}</Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-text-secondary">Only changed fields are saved. Every change is recorded in the audit log.</Dialog.Description>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          {section === "receipt" ? <>
            {textField("school_name", "School name", { maxLength: 160 })}
            {textField("school_address", "School address", { maxLength: 500, multiline: true })}
            <div>
              <span className="block text-sm font-medium">Receipt title</span>
              <span className="mt-1 block"><DropdownSelect aria-label="Receipt title" value={draft.receipt_title} align="start" className="w-full" options={[
                ...(settings.receiptTitle === null ? [{ value: "", label: NOT_SET }] : []),
                { value: "Official Receipt", label: "Official Receipt" },
                { value: "Acknowledgment Receipt", label: "Acknowledgment Receipt" },
              ]} onChange={(value) => update("receipt_title", value)} /></span>
              <FieldError id="system-receipt_title-error" messages={fieldErrors.receipt_title} />
            </div>
            <div>
              <span className="block text-sm font-medium">Paper size</span>
              <span className="mt-1 block"><DropdownSelect aria-label="Paper size" value={draft.paper_size} align="start" className="w-full" options={[
                ...(settings.paperSize === null ? [{ value: "", label: NOT_SET }] : []),
                { value: "Letter", label: "Letter" },
                { value: "A4", label: "A4" },
              ]} onChange={(value) => update("paper_size", value)} /></span>
              <FieldError id="system-paper_size-error" messages={fieldErrors.paper_size} />
            </div>
            <p className="text-sm text-text-secondary">Next receipt number: <span className="font-mono">{settings.nextReceiptNumber ?? NOT_SET}</span> (assigned by the system, read-only).</p>
          </> : <>
            {textField("email_sender_name", "Sender name", { maxLength: 120 })}
            {textField("email_sender_address", "Sender address", { type: "email", maxLength: 255 })}
            {textField("email_daily_send_limit", "Daily send limit (messages)", { type: "number", min: 0 })}
          </>}
          {noChanges && <p role="status" className="text-sm text-text-secondary">No changes to save.</p>}
          {generalError && <p role="alert" className="text-sm text-status-error">{generalError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Dialog.Close asChild><Button type="button" variant="neutral" disabled={save.isPending}>Cancel</Button></Dialog.Close>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
        <Dialog.Close aria-label="Close settings dialog" className="absolute right-4 top-4 rounded px-2 py-1 text-text-secondary hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark">×</Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function LiveSystemSettingsPage({ section, editable }: { section: Section; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const settings = useQuery({ queryKey: ["system-settings"], queryFn: getSystemSettings });
  const copy = sectionCopy[section];

  return <>
    <PageHeader
      title={copy.title}
      description={copy.description}
      action={editable && settings.data ? <Button type="button" onClick={() => setEditing(true)}>{copy.action}</Button> : undefined}
    />
    <ViewTabs label="System settings views" className="mb-4" items={[
      { key: "/settings/school", label: "School", selected: false, to: "/settings/school" },
      { key: "/settings/receipt", label: "Receipt", selected: section === "receipt", to: "/settings/receipt" },
      { key: "/settings/email", label: "Email", selected: section === "email", to: "/settings/email" },
    ]} />
    {settings.isPending && <LoadingState message="Loading settings…" layout="table" columns={2} />}
    {settings.isError && <ErrorState message={settings.error.message} onRetry={() => void settings.refetch()} />}
    {settings.data && <Card className="overflow-x-auto">
      <p className="text-sm text-text-secondary">
        {editable ? "Changes are saved to the school's settings and recorded in the audit log." : "You have read-only access to these settings."}
      </p>
      <table className="mt-4 w-full min-w-[420px] border-collapse text-left text-sm">
        <thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">
          <th scope="col" className="w-[40%] px-3 py-2">Setting</th>
          <th scope="col" className="px-3 py-2">Current value</th>
        </tr></thead>
        <tbody>{displayRows(section, settings.data).map(([label, value]) => <tr key={label} className="border-b last:border-0">
          <th scope="row" className="px-3 py-2 font-medium text-text-primary">{label}</th>
          <td className={value === NOT_SET ? "px-3 py-2 text-text-secondary" : label === "Next receipt number" ? "px-3 py-2 font-mono" : "px-3 py-2 whitespace-pre-line"}>{value}</td>
        </tr>)}</tbody>
      </table>
    </Card>}
    {editing && settings.data && <SystemSettingsDialog section={section} settings={settings.data} onOpenChange={setEditing} />}
  </>;
}
