import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Check, FileSpreadsheet, LockKeyhole, Upload, X } from "lucide-react";
import { isLiveCashierApiEnabled } from "@/api/cashierApi";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

const acceptedExtensions = /\.(csv|xlsx)$/i;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StepHeading({ number, title, state, id }: { number: number; title: string; state?: string; id: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-green-light/30 text-sm font-semibold text-brand-green-dark">
        {number}
      </span>
      <h2 id={id} className="text-base font-semibold text-text-primary">{title}</h2>
      {state && <span aria-current={state === "Current step" ? "step" : undefined} className="ml-auto text-xs font-medium text-text-secondary">{state}</span>}
    </div>
  );
}

export function StudentImportPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  function selectFile(candidate?: File) {
    setError("");
    if (!candidate) return;
    if (!acceptedExtensions.test(candidate.name)) {
      setError("Choose a CSV or XLSX file.");
      return;
    }
    if (candidate.size === 0) {
      setError("This file is empty. Choose another file.");
      return;
    }
    setFile(candidate);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  function removeFile() {
    setFile(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  if (isLiveCashierApiEnabled()) {
    return (
      <>
        <PageHeader title="Import Student List" description="Upload the Registrar’s complete student masterlist." backTo="/students" backLabel="Back to students" />
        <Card>
          <p className="text-sm text-text-secondary">Student list import is available in the MockDB workspace only.</p>
        </Card>
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Import Student List"
        description="Upload the complete current-enrollment masterlist. No student records change during file selection."
        backTo="/students"
        backLabel="Back to students"
      />

      <div className="space-y-4">
        <Card role="region" aria-labelledby="import-file-title" className="space-y-5 p-5">
          <StepHeading id="import-file-title" number={1} title="Choose the file" state="Current step" />
          <label
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
            onDrop={onDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center rounded-md border-2 border-dashed px-5 py-8 text-center transition-colors duration-150 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-green motion-reduce:transition-none",
              dragging ? "border-brand-green bg-brand-green/5" : "border-border hover:border-brand-green hover:bg-surface",
            )}
          >
            <input ref={fileInput} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFileChange} className="sr-only" aria-label="Choose CSV or XLSX file" />
            <Upload aria-hidden="true" className="size-7 text-brand-green-dark" />
            <span className="mt-3 text-sm font-semibold text-text-primary">Drag and drop your masterlist here</span>
            <span className="mt-1 text-xs text-text-secondary">or</span>
            <span className="mt-1 text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline">Browse files</span>
            <span className="mt-4 text-xs text-text-secondary">Supported formats: CSV and XLSX</span>
          </label>

          {error && <p role="alert" className="text-sm text-status-error">{error}</p>}

          {file && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-4 py-3" role="status">
              <FileSpreadsheet aria-hidden="true" className="size-5 shrink-0 text-brand-green-dark" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">{file.name}</p>
                <p className="mt-0.5 text-xs text-text-secondary">{formatFileSize(file.size)} · Selected</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={removeFile} aria-label="Remove selected file">
                <X aria-hidden="true" className="size-4" />
                Remove
              </Button>
            </div>
          )}
        </Card>

        <Card role="region" aria-labelledby="import-columns-title" className="space-y-5 p-5">
          <StepHeading id="import-columns-title" number={2} title="Match the columns" state="Waiting" />
          <div className="flex items-start gap-3 rounded-md bg-surface px-4 py-3">
            <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-text-secondary" />
            <p className="text-sm text-text-secondary">
              {file ? "Column matching will appear after the file headers are checked." : "Choose a file to continue to column matching."}
            </p>
          </div>
        </Card>

        <Card role="region" aria-labelledby="import-review-title" className="space-y-5 p-5">
          <StepHeading id="import-review-title" number={3} title="Review before applying" state="Waiting" />
          <div className="flex items-start gap-3 rounded-md bg-surface px-4 py-3">
            <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-text-secondary" />
            <p className="text-sm text-text-secondary">Review opens after columns are matched and the roster is compared.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Import summary preview">
            {["New students", "Existing students", "Missing students", "Rows with warnings"].map((label) => (
              <div key={label} className="rounded-md border border-border px-4 py-3">
                <p className="text-xs font-medium text-text-secondary">{label}</p>
                <p className="mt-1 text-lg font-semibold text-text-secondary">—</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t border-border pt-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Existing student changes</h3>
              <p className="mt-1 text-sm text-text-secondary">Field comparisons will appear after the roster is matched.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Rows with warnings</h3>
              <p className="mt-1 text-sm text-text-secondary">Invalid rows will be blocked with a warning; valid rows may proceed.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Students not found in the imported list</h3>
              <p className="mt-1 text-sm text-text-secondary">Missing students will remain unchanged unless you select them for an approved status change.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="max-w-xl text-xs text-text-secondary">No student records change during upload or review. Import requires final confirmation.</p>
            <Button type="button" disabled>
              <Check aria-hidden="true" className="size-4" />
              Confirm and apply import
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
