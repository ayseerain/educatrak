import { useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import { getBusinessDateSimulation, isLiveCashierApiEnabled, restoreBusinessDate, simulateBusinessDate, type BusinessDateSimulation } from "@/api/cashierApi";
import { getMockBusinessDateTime, getMockSimulatedDateTime, getMockToday, restoreMockBusinessDateTime, simulateMockBusinessDateTime } from "@/api/mock";

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function BusinessDateSimulator() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<BusinessDateSimulation | null>(null);
  const [dateTime, setDateTime] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usingLiveApi = isLiveCashierApiEnabled();
  async function load() { const next = usingLiveApi ? await getBusinessDateSimulation() : { businessDate: getMockToday(), businessDateTime: getMockBusinessDateTime(), simulatedAt: getMockSimulatedDateTime() }; setState(next); setDateTime(toDateTimeLocal(next.simulatedAt ?? next.businessDateTime)); }
  async function submit(event: FormEvent) { event.preventDefault(); setError(null); setPending(true); try { const next = usingLiveApi ? await simulateBusinessDate(dateTime) : (simulateMockBusinessDateTime(dateTime), { businessDate: getMockToday(), businessDateTime: getMockBusinessDateTime(), simulatedAt: getMockSimulatedDateTime() }); setState(next); window.dispatchEvent(new Event("educatrak:business-date-change")); } catch (cause) { setError(cause instanceof Error ? cause.message : "The test date and time could not be changed."); } finally { setPending(false); } }
  async function reset() { setError(null); setPending(true); try { const next = usingLiveApi ? await restoreBusinessDate() : (restoreMockBusinessDateTime(), { businessDate: getMockToday(), businessDateTime: getMockBusinessDateTime(), simulatedAt: getMockSimulatedDateTime() }); setState(next); window.dispatchEvent(new Event("educatrak:business-date-change")); } catch (cause) { setError(cause instanceof Error ? cause.message : "The actual date and time could not be restored."); } finally { setPending(false); } }

  return <Dialog.Root open={open} onOpenChange={(next) => { setOpen(next); if (next) void load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "The simulator could not be loaded.")); }}>
    <Dialog.Trigger asChild><Button type="button" variant="secondary">Test date &amp; time</Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-text-primary/40" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-5 shadow-raised">
      <Dialog.Title className="text-lg font-semibold text-text-primary">Test business date &amp; time</Dialog.Title>
      <Dialog.Description className="mt-2 text-sm text-text-secondary">Development and testing only. This session override affects close-out’s Manila business date; it never changes system time or payment records.</Dialog.Description>
      <form className="mt-4 space-y-4" onSubmit={submit}><label className="block text-sm font-medium text-text-primary">Test date and time<input required type="datetime-local" value={dateTime} onChange={(event) => setDateTime(event.target.value)} className="form-control mt-1" /></label>{state?.simulatedAt && <p role="status" className="text-sm font-medium text-brand-green-dark">A test date and time is active.</p>}{error && <p role="alert" className="text-sm text-status-error">{error}</p>}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" disabled={!state?.simulatedAt || pending} onClick={() => void reset()}>{pending ? "Restoring…" : "Reset actual date & time"}</Button><Button type="submit" disabled={!dateTime || pending}>{pending ? "Applying…" : "Apply test date & time"}</Button></div></form>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
