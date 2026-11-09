import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { getPaymentContext, recordCashPaymentForStudent, searchPaymentStudents, type NotificationChannel, type PaymentStudent } from "@/api/cashierApi";
import { centavos, format } from "@/lib/money";
import { ReceiptPrintAction } from "@/components/printing/ReceiptPrintAction";

export function LivePaymentEntryPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedStudentId = searchParams.get("student")?.trim() || null;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<PaymentStudent | null>(null);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(() => manilaToday());
  const [backdateReason, setBackdateReason] = useState("");
  const [duplicateOverrideReason, setDuplicateOverrideReason] = useState("");
  const [notes, setNotes] = useState("");
  const [channels, setChannels] = useState<NotificationChannel[]>(["email"]);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ paymentId: string; receiptNo: string; amountCents: number; emailQueued: boolean } | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const normalizedSearch = search.trim();
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(normalizedSearch), 250);
    return () => window.clearTimeout(timeout);
  }, [normalizedSearch]);
  const searchQuery = useQuery({
    queryKey: ["payment-student-search", debouncedSearch],
    queryFn: () => searchPaymentStudents(debouncedSearch),
    enabled: !selectedStudent && !linkedStudentId && debouncedSearch.length >= 2,
  });
  const contextStudentId = selectedStudent?.id ?? linkedStudentId;
  const contextQuery = useQuery({
    queryKey: ["payment-context", contextStudentId],
    queryFn: () => getPaymentContext(contextStudentId!),
    enabled: contextStudentId !== null,
  });
  useEffect(() => {
    const contextStudent = contextQuery.data?.student;
    if (!selectedStudent && linkedStudentId && contextStudent?.id === linkedStudentId) {
      setSelectedStudent({ ...contextStudent, grade: null, section: null, balanceCents: contextQuery.data!.balanceCents });
    }
  }, [contextQuery.data, linkedStudentId, selectedStudent]);
  const saveMutation = useMutation({
    mutationFn: recordCashPaymentForStudent,
    onSuccess: async (result, variables) => {
      setSaved({ paymentId: result.id, receiptNo: result.receiptNo, amountCents: variables.amount, emailQueued: result.emailQueued });
      setReviewing(false);
      setError("");
      idempotencyKey.current = null;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payment-context", selectedStudent?.id] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
      ]);
    },
    onError: (saveError: Error) => setError(saveError.message),
  });

  const amountCents = useMemo(() => {
    if (!/^\d+(\.\d{0,2})?$/.test(amount)) return 0;
    return Math.round(Number(amount) * 100);
  }, [amount]);
  const context = contextQuery.data;
  const balanceAfter = Math.max(0, (context?.balanceCents ?? 0) - amountCents);

  function selectStudent(student: PaymentStudent) {
    setSelectedStudent(student);
    setSearch("");
    setAmount("");
    setPaidOn(manilaToday());
    setBackdateReason("");
    setDuplicateOverrideReason("");
    setNotes("");
    setSaved(null);
    setError("");
    setReviewing(false);
    idempotencyKey.current = null;
  }

  function resetDraft() {
    if (linkedStudentId) setSearchParams({}, { replace: true });
    setSelectedStudent(null);
    setSearch("");
    setAmount("");
    setPaidOn(manilaToday());
    setBackdateReason("");
    setDuplicateOverrideReason("");
    setNotes("");
    setChannels(["email"]);
    setSaved(null);
    setError("");
    setReviewing(false);
    idempotencyKey.current = null;
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!selectedStudent || !context) {
      setError("Select a student with an active billing account before continuing.");
      return;
    }
    if (amountCents <= 0) {
      setError("Enter an amount greater than zero, using no more than two decimal places.");
      return;
    }
    if (amountCents > context.balanceCents) {
      setError(`The amount exceeds the current balance of ${format(centavos(context.balanceCents))}.`);
      return;
    }
    if (!paidOn || paidOn > manilaToday()) {
      setError("Payment date cannot be in the future.");
      return;
    }
    if (paidOn < manilaToday() && backdateReason.trim().length < 10) {
      setError("Enter a reason of at least 10 characters for a back-dated payment.");
      return;
    }
    if (channels.length === 0) {
      setError("Select at least one receipt notification channel.");
      return;
    }
    setReviewing(true);
  }

  async function savePayment() {
    if (!selectedStudent || !context || saveMutation.isPending) return;
    idempotencyKey.current ??= makeIdempotencyKey();
    saveMutation.mutate({
      billingAccountId: context.billingAccountId,
      amount: centavos(amountCents),
      paidOn,
      backdateReason: backdateReason.trim() || undefined,
      duplicateOverrideReason: duplicateOverrideReason.trim() || undefined,
      notes: notes.trim() || undefined,
      notificationChannels: channels,
      idempotencyKey: idempotencyKey.current,
    });
  }

  return (
    <>
      <div className="page-header-card mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Record payment</h1>
        <p className="mt-1 text-sm text-text-secondary">Search the live student register, review the current account balance, then confirm the cash payment.</p>
      </div>
      {saved ? (
        <Card>
          <p role="status" className="font-medium text-status-success">Payment saved. Receipt {saved.receiptNo} was issued for {format(centavos(saved.amountCents))}.</p>
          <p className="mt-2 text-sm text-text-secondary">{saved.emailQueued ? "The email receipt was queued." : "The email receipt was not queued."} The server accepted the payment.</p>
          <div className="mt-4 flex flex-wrap items-start gap-3"><ReceiptPrintAction paymentId={saved.paymentId} label="Print Receipt" /><Button variant="secondary" onClick={resetDraft}>Done — record another payment</Button></div>
        </Card>
      ) : (
        <Card>
          {!selectedStudent && linkedStudentId ? (
            contextQuery.isPending ? <LoadingState message="Loading selected student and billing account…" layout="form" />
              : contextQuery.isError ? <ErrorState message={contextQuery.error.message} onRetry={() => void contextQuery.refetch()} />
                : null
          ) : !selectedStudent ? (
            <div>
              <label htmlFor="live-payment-student-search" className="block text-sm font-medium">Student name or number</label>
              <input id="live-payment-student-search" type="search" autoComplete="off" value={search} onChange={(event) => { setSearch(event.target.value); setError(""); }} className={inputClass} placeholder="Enter at least two characters" />
              {normalizedSearch.length > 0 && normalizedSearch.length < 2 && <p className="mt-2 text-sm text-text-secondary">Enter at least two characters to search.</p>}
              {searchQuery.isFetching && <LoadingState message="Searching live student records…" layout="list" />}
              {searchQuery.isError && <ErrorState message={searchQuery.error.message} onRetry={() => void searchQuery.refetch()} />}
              {searchQuery.data?.length === 0 && <EmptyState message="No matching students were found." />}
              {searchQuery.data && searchQuery.data.length > 0 && (
                <ul className="mt-3 divide-y divide-border rounded-md border border-border" aria-label="Matching students">
                  {searchQuery.data.map((student) => <li key={student.id}><button type="button" onClick={() => selectStudent(student)} className="flex min-h-control w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark"><span className="font-medium">{student.name}</span><span className="font-mono text-sm text-text-secondary">{student.number}</span></button></li>)}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-surface p-4">
                <div><p className="font-medium">{selectedStudent.name}</p><p className="text-sm text-text-secondary">{selectedStudent.number}{selectedStudent.grade ? ` · ${selectedStudent.grade}` : ""}{selectedStudent.section ? ` · ${selectedStudent.section}` : ""}</p></div>
                <Button type="button" variant="secondary" onClick={resetDraft}>Change student</Button>
              </div>
              {contextQuery.isPending ? <LoadingState message="Loading current billing account…" layout="list" /> : null}
              {contextQuery.isError ? <ErrorState message={contextQuery.error.message} onRetry={() => void contextQuery.refetch()} /> : null}
              {context && !contextQuery.isError && (
                <form className="mt-5 space-y-5" onSubmit={review}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Metric label="Current balance" value={format(centavos(context.balanceCents))} />
                    <Metric label="Next installment" value={context.nextInstallment ? `${context.nextInstallment.label} · ${format(centavos(context.nextInstallment.amountDueCents))}` : "No unpaid installment"} />
                  </div>
                  <label className="block text-sm font-medium">Cash received
                    <input type="number" min="0.01" step="0.01" max={(context.balanceCents / 100).toFixed(2)} inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setReviewing(false); setSaved(null); setError(""); idempotencyKey.current = null; }} className={inputClass} disabled={saveMutation.isPending} required />
                  </label>
                  {context.nextInstallment && <Button type="button" variant="secondary" disabled={saveMutation.isPending} onClick={() => { setAmount((context.nextInstallment!.amountDueCents / 100).toFixed(2)); setReviewing(false); setError(""); idempotencyKey.current = null; }}>Pay next installment ({format(centavos(context.nextInstallment.amountDueCents))})</Button>}
                  <label className="block text-sm font-medium">Date of payment (defaults to today)
                    <input type="date" value={paidOn} max={manilaToday()} onChange={(event) => { setPaidOn(event.target.value); setReviewing(false); setError(""); idempotencyKey.current = null; }} className={inputClass} disabled={saveMutation.isPending} required />
                  </label>
                  <label className="block text-sm font-medium">Reason for back-dated payment (if applicable)
                    <textarea value={backdateReason} onChange={(event) => { setBackdateReason(event.target.value); setReviewing(false); setError(""); idempotencyKey.current = null; }} minLength={paidOn < manilaToday() ? 10 : undefined} maxLength={1000} className={textAreaClass} disabled={saveMutation.isPending} required={paidOn < manilaToday()} />
                    {paidOn < manilaToday() && <span className="mt-1 block text-xs font-normal text-text-secondary">Enter at least 10 characters.</span>}
                  </label>
                  <label className="block text-sm font-medium">Duplicate payment confirmation reason (if requested)
                    <textarea value={duplicateOverrideReason} onChange={(event) => { setDuplicateOverrideReason(event.target.value); setReviewing(false); setError(""); idempotencyKey.current = null; }} minLength={duplicateOverrideReason ? 10 : undefined} maxLength={1000} className={textAreaClass} disabled={saveMutation.isPending} />
                    <span className="mt-1 block text-xs font-normal text-text-secondary">If a similar payment was recorded in the last 10 minutes, confirm it is a separate payment with a reason of at least 10 characters.</span>
                  </label>
                  <label className="block text-sm font-medium">Note (optional)
                    <textarea value={notes} onChange={(event) => { setNotes(event.target.value); setReviewing(false); setError(""); idempotencyKey.current = null; }} maxLength={1000} className={textAreaClass} disabled={saveMutation.isPending} />
                  </label>
                  <fieldset className="rounded-md border border-border p-4">
                    <legend className="px-1 text-sm font-medium">Receipt notifications</legend>
                    <div className="flex flex-wrap gap-5">
                      {(["email", "sms"] as const).map((channel) => <label key={channel} className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={channels.includes(channel)} disabled={saveMutation.isPending} onChange={(event) => { setChannels((current) => event.target.checked ? [...current, channel] : current.filter((item) => item !== channel)); setReviewing(false); setError(""); idempotencyKey.current = null; }} />{channel === "email" ? "Email" : "SMS"}</label>)}
                    </div>
                  </fieldset>
                  {error && <p role="alert" className="rounded-md border border-status-error p-3 text-sm text-status-error">{error}</p>}
                  {reviewing ? (
                    <div className="rounded-md border border-border p-4" aria-label="Payment confirmation">
                      <h2 className="text-base font-semibold text-text-primary">Confirm cash payment</h2>
                      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-text-secondary">Student</dt><dd>{context.student.name} · {context.student.number}</dd></div><div><dt className="text-text-secondary">Amount</dt><dd>{format(centavos(amountCents))}</dd></div><div><dt className="text-text-secondary">Date of payment</dt><dd>{paidOn}</dd></div><div><dt className="text-text-secondary">Balance after payment</dt><dd>{format(centavos(balanceAfter))}</dd></div><div><dt className="text-text-secondary">Method</dt><dd>Cash</dd></div>{notes.trim() && <div><dt className="text-text-secondary">Note</dt><dd>{notes.trim()}</dd></div>}</dl>
                      <div className="mt-4 flex flex-wrap justify-end gap-3"><Button type="button" variant="secondary" disabled={saveMutation.isPending} onClick={() => setReviewing(false)}>Edit</Button><Button type="button" disabled={saveMutation.isPending} onClick={() => void savePayment()}>{saveMutation.isPending ? "Saving…" : "Confirm and save"}</Button></div>
                    </div>
                  ) : <Button type="submit" disabled={saveMutation.isPending}>Review payment</Button>}
                </form>
              )}
            </>
          )}
        </Card>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border p-4"><p className="text-sm font-semibold text-text-secondary">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function makeIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function manilaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

const inputClass = "form-control mt-1";
const textAreaClass = "mt-1 min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-green-dark";
