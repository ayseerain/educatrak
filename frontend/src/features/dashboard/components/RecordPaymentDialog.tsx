import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { en } from "@/i18n/en";
import { formatDate } from "@/lib/dates";
import { format, parse } from "@/lib/money";
import type { PaymentMethod, RecordPaymentInput } from "@/api/dashboardTypes";

const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "check",
  "bank_transfer",
  "gcash",
];

interface RecordPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (payment: RecordPaymentInput) => Promise<void>;
}

interface RecordPaymentFormValues {
  studentName: string;
  amount: string;
  method: PaymentMethod;
  reference: string;
  paymentDate: string;
  backdateReason: string;
}

function dateInputForManila(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function defaultValues(): RecordPaymentFormValues {
  return {
    studentName: "",
    amount: "",
    method: "cash",
    reference: "",
    paymentDate: dateInputForManila(),
    backdateReason: "",
  };
}

function schemaFor(today: string) {
  return z
    .object({
      studentName: z.string().trim().min(1, en.recordPayment.studentRequired),
      amount: z.string().trim().min(1, en.recordPayment.amountRequired),
      method: z.enum(["cash", "check", "bank_transfer", "gcash"], {
        required_error: en.recordPayment.methodRequired,
      }),
      reference: z.string(),
      paymentDate: z.string().min(1, en.recordPayment.paymentDateRequired),
      backdateReason: z.string(),
    })
    .superRefine((values, ctx) => {
      try {
        const amount = parse(values.amount);
        if (amount <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["amount"],
            message: en.recordPayment.amountPositive,
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: en.recordPayment.amountInvalid,
        });
      }

      if (values.method !== "cash" && values.reference.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reference"],
          message: en.recordPayment.referenceRequired,
        });
      }

      if (values.paymentDate > today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentDate"],
          message: en.recordPayment.futureDateBlocked,
        });
      }

      if (
        values.paymentDate < today &&
        values.backdateReason.trim().length < 5
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["backdateReason"],
          message: en.recordPayment.backdateReasonRequired,
        });
      }
    });
}

export function RecordPaymentDialog({
  open,
  onClose,
  onSave,
}: RecordPaymentDialogProps) {
  const today = useMemo(() => dateInputForManila(), [open]);
  const [preview, setPreview] = useState<RecordPaymentInput>();
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const {
    clearErrors,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
    watch,
  } = useForm<RecordPaymentFormValues>({
    defaultValues: defaultValues(),
  });
  const watchedMethod = watch("method");
  const watchedPaymentDate = watch("paymentDate");
  const watchedValues = watch();
  const isBackdated = Boolean(watchedPaymentDate && watchedPaymentDate < today);

  useEffect(() => {
    if (!open) return;
    reset(defaultValues());
    setPreview(undefined);
    setSaveError("");
  }, [open, reset]);

  useEffect(() => {
    setPreview(undefined);
    setSaveError("");
  }, [
    watchedValues.amount,
    watchedValues.backdateReason,
    watchedValues.method,
    watchedValues.paymentDate,
    watchedValues.reference,
    watchedValues.studentName,
  ]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSaving, onClose, open]);

  if (!open) return null;

  function buildPayment(values: RecordPaymentFormValues) {
    clearErrors();
    const parsed = schemaFor(today).safeParse(values);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (
          path === "studentName" ||
          path === "amount" ||
          path === "method" ||
          path === "reference" ||
          path === "paymentDate" ||
          path === "backdateReason"
        ) {
          setError(path, { message: issue.message });
        }
      }
      return undefined;
    }

    return {
      studentName: parsed.data.studentName.trim(),
      amount: parse(parsed.data.amount),
      method: parsed.data.method,
      reference: parsed.data.reference.trim() || undefined,
      paymentDate: parsed.data.paymentDate,
      backdateReason: parsed.data.backdateReason.trim() || undefined,
    } satisfies RecordPaymentInput;
  }

  function review(values: RecordPaymentFormValues) {
    const payment = buildPayment(values);
    if (!payment) return;
    setPreview(payment);
  }

  async function confirmSave() {
    if (!preview) return;
    setIsSaving(true);
    setSaveError("");
    try {
      await onSave(preview);
      reset(defaultValues());
      setPreview(undefined);
      onClose();
    } catch {
      setSaveError(en.recordPayment.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-8">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-payment-title"
        aria-describedby="record-payment-description"
        className="max-h-full w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div>
            <h2
              id="record-payment-title"
              className="text-xl font-semibold text-text-primary"
            >
              {en.recordPayment.title}
            </h2>
            <p
              id="record-payment-description"
              className="mt-1 text-sm text-text-secondary"
            >
              {en.recordPayment.description}
            </p>
          </div>
          <button
            type="button"
            aria-label={en.recordPayment.close}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text-primary"
            disabled={isSaving}
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-5 p-6" onSubmit={handleSubmit(review)} noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="payment-student"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                {en.recordPayment.studentName}
              </label>
              <input
                id="payment-student"
                autoFocus
                placeholder={en.recordPayment.studentPlaceholder}
                aria-invalid={Boolean(errors.studentName)}
                aria-describedby={
                  errors.studentName ? "payment-student-error" : undefined
                }
                className="h-11 w-full rounded-md border border-border bg-white px-3 text-base focus-visible:border-brand-green-dark"
                disabled={isSaving}
                {...register("studentName")}
              />
              {errors.studentName?.message && (
                <p id="payment-student-error" className="mt-2 text-sm text-status-error">
                  {errors.studentName.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="payment-amount"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                {en.recordPayment.amount}
              </label>
              <input
                id="payment-amount"
                inputMode="decimal"
                placeholder={en.recordPayment.amountPlaceholder}
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? "payment-amount-error" : undefined}
                className="h-11 w-full rounded-md border border-border bg-white px-3 text-base focus-visible:border-brand-green-dark"
                disabled={isSaving}
                {...register("amount")}
              />
              {errors.amount?.message && (
                <p id="payment-amount-error" className="mt-2 text-sm text-status-error">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="payment-method"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                {en.recordPayment.method}
              </label>
              <select
                id="payment-method"
                className="h-11 w-full rounded-md border border-border bg-white px-3 text-base focus-visible:border-brand-green-dark"
                disabled={isSaving}
                {...register("method")}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {en.recordPayment.methods[method]}
                  </option>
                ))}
              </select>
            </div>

            {watchedMethod !== "cash" && (
              <div>
                <label
                  htmlFor="payment-reference"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  {en.recordPayment.reference}
                </label>
                <input
                  id="payment-reference"
                  placeholder={en.recordPayment.referencePlaceholder}
                  aria-invalid={Boolean(errors.reference)}
                  aria-describedby={
                    errors.reference ? "payment-reference-error" : undefined
                  }
                  className="h-11 w-full rounded-md border border-border bg-white px-3 text-base focus-visible:border-brand-green-dark"
                  disabled={isSaving}
                  {...register("reference")}
                />
                {errors.reference?.message && (
                  <p id="payment-reference-error" className="mt-2 text-sm text-status-error">
                    {errors.reference.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="payment-date"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                {en.recordPayment.paymentDate}
              </label>
              <input
                id="payment-date"
                type="date"
                max={today}
                aria-invalid={Boolean(errors.paymentDate)}
                aria-describedby={
                  errors.paymentDate ? "payment-date-error" : undefined
                }
                className="h-11 w-full rounded-md border border-border bg-white px-3 text-base focus-visible:border-brand-green-dark"
                disabled={isSaving}
                {...register("paymentDate")}
              />
              {errors.paymentDate?.message && (
                <p id="payment-date-error" className="mt-2 text-sm text-status-error">
                  {errors.paymentDate.message}
                </p>
              )}
            </div>

            {isBackdated && (
              <div className="md:col-span-2">
                <label
                  htmlFor="payment-backdate-reason"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  {en.recordPayment.backdateReason}
                </label>
                <textarea
                  id="payment-backdate-reason"
                  rows={3}
                  placeholder={en.recordPayment.backdateReasonPlaceholder}
                  aria-invalid={Boolean(errors.backdateReason)}
                  aria-describedby={
                    errors.backdateReason
                      ? "payment-backdate-reason-error"
                      : undefined
                  }
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-base focus-visible:border-brand-green-dark"
                  disabled={isSaving}
                  {...register("backdateReason")}
                />
                {errors.backdateReason?.message && (
                  <p
                    id="payment-backdate-reason-error"
                    className="mt-2 text-sm text-status-error"
                  >
                    {errors.backdateReason.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {preview && (
            <div className="rounded-md border border-brand-green-light bg-[#F4FAF5] p-4">
              <h3 className="text-base font-semibold text-text-primary">
                {en.recordPayment.confirmationTitle}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {en.recordPayment.confirmationHelp}
              </p>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="font-medium text-text-secondary">
                    {en.recordPayment.confirmationStudent}
                  </dt>
                  <dd className="mt-1 text-text-primary">{preview.studentName}</dd>
                </div>
                <div>
                  <dt className="font-medium text-text-secondary">
                    {en.recordPayment.confirmationAmount}
                  </dt>
                  <dd className="mt-1 text-text-primary">{format(preview.amount)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-text-secondary">
                    {en.recordPayment.confirmationMethod}
                  </dt>
                  <dd className="mt-1 text-text-primary">
                    {en.recordPayment.methods[preview.method]}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-text-secondary">
                    {en.recordPayment.confirmationDate}
                  </dt>
                  <dd className="mt-1 text-text-primary">
                    {formatDate(`${preview.paymentDate}T12:00:00+08:00`)}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {saveError && (
            <p role="alert" className="rounded-md border border-[#F3C2C2] bg-[#FBEAEA] p-3 text-sm text-status-error">
              {saveError}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="secondary"
              disabled={isSaving}
              onClick={onClose}
            >
              {en.recordPayment.cancel}
            </Button>
            <Button type="submit" variant="secondary" disabled={isSaving}>
              {en.recordPayment.review}
            </Button>
            <Button type="button" disabled={!preview || isSaving} onClick={confirmSave}>
              {isSaving ? en.recordPayment.saving : en.recordPayment.confirm}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
