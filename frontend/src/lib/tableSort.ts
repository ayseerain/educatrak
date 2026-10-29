import { isValidElement, type ReactNode } from "react";

export type SortDirection = "ascending" | "descending";

/** No key yet means the list keeps its own (data) order until a header is clicked. */
export interface TableSortState {
  key: string | null;
  direction: SortDirection;
}

export type SortValue = string | number | null;

/** First click sorts ascending, a second click reverses it, another column starts ascending. */
export function toggleTableSort(current: TableSortState, key: string): TableSortState {
  return current.key === key
    ? { key, direction: current.direction === "ascending" ? "descending" : "ascending" }
    : { key, direction: "ascending" };
}

/** Stable sort; empty values stay at the bottom in both directions. Strings compare locale-aware with numeric runs (OR-10 after OR-9). */
export function sortTableRows<Row>(rows: readonly Row[], sort: TableSortState, valueFor: (row: Row, key: string) => SortValue): Row[] {
  const { key } = sort;
  if (key === null) return [...rows];
  return rows
    .map((row, index) => ({ row, index, value: valueFor(row, key) }))
    .sort((a, b) => {
      if (a.value === null || b.value === null) {
        if (a.value === b.value) return a.index - b.index;
        return a.value === null ? 1 : -1;
      }
      const comparison = typeof a.value === "number" && typeof b.value === "number"
        ? a.value - b.value
        : String(a.value).localeCompare(String(b.value), "en", { numeric: true, sensitivity: "base" });
      if (comparison !== 0) return sort.direction === "ascending" ? comparison : -comparison;
      return a.index - b.index;
    })
    .map(({ row }) => row);
}

/** The visible text of a rendered cell (a string, a link, a badge), for sorting generic table rows. */
export function cellText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(cellText).join(" ");
  if (isValidElement<Record<string, unknown>>(node)) {
    const { children, label, status } = node.props;
    return cellText((children ?? label ?? status) as ReactNode);
  }
  return "";
}

const DISPLAY_DATE = /^[A-Z][a-z]{2,8}\.? \d{1,2}, \d{4}/;

/** Peso amounts and counts sort as numbers, display dates ("Oct 29, 2026") by time, everything else as text. */
export function cellSortValue(node: ReactNode): SortValue {
  const text = cellText(node).replace(/\s+/g, " ").trim();
  if (!text || text === "—") return null;
  const amount = text.replace(/[₱,]/g, "").replace(/^PHP\s?/, "");
  if (/^-?\d+(\.\d+)?$/.test(amount)) return Number(amount);
  if (DISPLAY_DATE.test(text)) {
    const time = Date.parse(text.replace(/ at /, " ").replace(/·/g, " "));
    if (!Number.isNaN(time)) return time;
  }
  return text;
}
