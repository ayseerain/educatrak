import { cn } from "@/lib/cn";
import { CARD_SURFACE } from "./Card";

/**
 * Loading placeholder block (CLINIQ style): border gray, visible on white and surface, pulses
 * subtly and stays still under reduced motion. Compose blocks into a skeleton shaped like the
 * loaded screen; never one generic block for a whole page.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-border motion-reduce:animate-none", className)} />;
}

/** A table card: header cells over `rows` rows of `columns` cells. */
export function TableSkeleton({ columns = 5, rows = 6, bare = false }: { columns?: number; rows?: number; bare?: boolean }) {
  const cells = Array.from({ length: columns });
  return (
    <div aria-hidden="true" className={cn(!bare && CARD_SURFACE, "overflow-hidden")}>
      <div className="grid gap-3 border-b border-border px-3 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {cells.map((_, index) => <Skeleton key={index} className="h-3 w-2/3" />)}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid gap-3 border-b border-border px-3 py-3.5 last:border-b-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {cells.map((_, index) => <Skeleton key={index} className={cn("h-3.5", index === 0 ? "w-4/5" : "w-1/2")} />)}
        </div>
      ))}
    </div>
  );
}

/** A row of metric cards (label, figure). */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn(CARD_SURFACE, "space-y-3 p-4")}>
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-7 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** A record header card: title and one line of context. */
export function HeaderSkeleton() {
  return (
    <div aria-hidden="true" className={cn(CARD_SURFACE, "space-y-2.5 p-5")}>
      <Skeleton className="h-7 w-56 max-w-full" />
      <Skeleton className="h-3.5 w-80 max-w-full" />
    </div>
  );
}

/** A form card: `fields` label + 44px input pairs. */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div aria-hidden="true" className={cn(CARD_SURFACE, "grid gap-4 p-5 sm:grid-cols-2")}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  );
}
