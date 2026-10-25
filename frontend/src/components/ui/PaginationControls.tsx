import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  label?: string;
  busy?: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
}

export function PaginationControls({
  currentPage,
  lastPage,
  perPage,
  total,
  label = "records",
  busy = false,
  onPageChange,
  onPerPageChange,
}: PaginationControlsProps) {
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = total === 0 ? 0 : Math.min(currentPage * perPage, total);
  const safeLastPage = Math.max(lastPage, 1);

  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
      <p className="text-text-secondary" aria-live="polite">Showing {from}–{to} of {total} {label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {onPerPageChange && <label className="flex items-center gap-2 text-text-secondary">Rows per page
          <select aria-label="Rows per page" value={perPage} disabled={busy} onChange={(event) => onPerPageChange(Number(event.target.value))} className="h-11 rounded-md border border-border bg-white px-2 text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark">
            {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>}
        <button type="button" aria-label="Previous page" disabled={currentPage <= 1 || busy} onClick={() => onPageChange(Math.max(1, currentPage - 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-white text-text-primary hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50">
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <span aria-label={`Page ${currentPage} of ${safeLastPage}`} className="min-w-14 text-center tabular-nums">{currentPage} / {safeLastPage}</span>
        <button type="button" aria-label="Next page" disabled={currentPage >= safeLastPage || busy} onClick={() => onPageChange(Math.min(safeLastPage, currentPage + 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-white text-text-primary hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50">
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
