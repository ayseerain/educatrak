import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { toggleTableSort, type TableSortState } from "@/lib/tableSort";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  caption: string;
}

export function DataTable<TData>({
  columns,
  data,
  caption,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-text-secondary"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border last:border-b-0 focus-within:bg-surface hover:bg-surface"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 align-middle tabular-nums">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Sort state for one table: no column sorted until a header is clicked. `onChange` lets a paginated list return to page 1. */
export function useTableSort(onChange?: () => void) {
  const [sort, setSort] = useState<TableSortState>({ key: null, direction: "ascending" });
  return {
    sort,
    toggle(key: string) {
      setSort((current) => toggleTableSort(current, key));
      onChange?.();
    },
  };
}

interface SortableHeaderProps {
  sortKey: string;
  sort: TableSortState;
  onSort: (key: string) => void;
  /** The column name used in the accessible label; defaults to the header text. */
  label?: string;
  className?: string;
  children: ReactNode;
}

/** A column header with CLINIQ's accessible sort control: a real button, `aria-sort`, and an aria-hidden direction icon. */
export function SortableHeader({ sortKey, sort, onSort, label, className, children }: SortableHeaderProps) {
  const direction = sort.key === sortKey ? sort.direction : undefined;
  const name = label ?? (typeof children === "string" ? children : sortKey);
  const Icon = direction === "ascending" ? ArrowUp : direction === "descending" ? ArrowDown : ArrowUpDown;
  return (
    <th scope="col" aria-sort={direction} className={cn("whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-text-secondary", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${name}${direction ? `, currently ${direction}` : ""}`}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 rounded-sm transition-colors duration-150 hover:text-brand-green-dark motion-reduce:transition-none",
          direction && "text-brand-green-dark",
        )}
      >
        {children}
        <Icon aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0", !direction && "opacity-60")} />
      </button>
    </th>
  );
}
