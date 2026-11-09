import { Button } from "./Button";
import { DropdownSelect } from "./DropdownSelect";

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

const PER_PAGE_OPTIONS = ["10", "25", "50"].map((size) => ({ value: size, label: size }));

/** Compact pager in CLINIQ's style: a count, optional rows-per-page, and Previous / Next. */
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
    <div className="pagination-controls no-print mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-text-secondary" aria-live="polite">Showing {from}–{to} of {total} {label}</p>
        {onPerPageChange && <span className="flex items-center gap-2 text-text-secondary">Rows per page
          <DropdownSelect
            aria-label="Rows per page"
            value={String(perPage)}
            options={PER_PAGE_OPTIONS}
            disabled={busy}
            onChange={(value) => onPerPageChange(Number(value))}
            className="min-w-20"
          />
        </span>}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" aria-label="Previous page" disabled={currentPage <= 1 || busy} onClick={() => onPageChange(Math.max(1, currentPage - 1))}>
          Previous
        </Button>
        <span aria-label={`Page ${currentPage} of ${safeLastPage}`} className="whitespace-nowrap font-semibold tabular-nums text-text-primary">Page {currentPage} of {safeLastPage}</span>
        <Button variant="secondary" size="sm" aria-label="Next page" disabled={currentPage >= safeLastPage || busy} onClick={() => onPageChange(Math.min(safeLastPage, currentPage + 1))}>
          Next
        </Button>
      </div>
    </div>
  );
}
