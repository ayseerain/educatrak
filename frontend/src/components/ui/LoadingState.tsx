import { cn } from "@/lib/cn";
import { CARD_SURFACE } from "./Card";
import { FormSkeleton, HeaderSkeleton, Skeleton, StatCardsSkeleton, TableSkeleton } from "./Skeleton";

type LoadingLayout = "table" | "detail" | "dashboard" | "form" | "list" | "page";

interface LoadingStateProps {
  message: string;
  /** The shape of the screen being loaded, so the skeleton mirrors it. */
  layout?: LoadingLayout;
  /** Table layouts: the real table's column count. */
  columns?: number;
  rows?: number;
  /** Table layout inside an existing card (under its search and filter toolbar): rows only, no second card. */
  bare?: boolean;
}

/**
 * Page-load state (CLINIQ pattern): a skeleton shaped like the screen about to appear, never a
 * spinner or a blank screen. The message stays available to screen readers.
 */
export function LoadingState({ message, layout = "table", columns, rows, bare }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className={cn(layout === "page" ? "fixed inset-0 flex bg-surface" : "space-y-4")}>
      <span className="sr-only">{message}</span>
      {layout === "table" && <TableSkeleton columns={columns} rows={rows} bare={bare} />}
      {layout === "detail" && <>
        <HeaderSkeleton />
        <StatCardsSkeleton />
        <TableSkeleton columns={columns ?? 4} rows={rows ?? 4} />
      </>}
      {layout === "dashboard" && <>
        <StatCardsSkeleton />
        <div className="grid gap-4 xl:grid-cols-2">
          <TableSkeleton columns={3} rows={4} />
          <TableSkeleton columns={3} rows={4} />
        </div>
      </>}
      {layout === "form" && <FormSkeleton fields={rows} />}
      {layout === "list" && (
        <div aria-hidden="true" className={cn(CARD_SURFACE, "space-y-3 p-4")}>
          {Array.from({ length: rows ?? 3 }).map((_, index) => <Skeleton key={index} className="h-4 w-full" />)}
        </div>
      )}
      {layout === "page" && <>
        <div aria-hidden="true" className="hidden w-[17rem] shrink-0 space-y-6 border-r border-border bg-white p-4 md:block">
          <div className="flex items-center gap-2.5"><Skeleton className="h-11 w-11 rounded-full" /><Skeleton className="h-5 w-28" /></div>
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-9 w-full" />)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div aria-hidden="true" className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <div className="space-y-4 p-4 md:p-6">
            <HeaderSkeleton />
            <TableSkeleton />
          </div>
        </div>
      </>}
    </div>
  );
}
