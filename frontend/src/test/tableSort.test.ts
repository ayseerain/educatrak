import { describe, expect, it } from "vitest";
import { cellSortValue, sortTableRows, toggleTableSort } from "@/lib/tableSort";

describe("table sorting", () => {
  const amounts = ["₱1,200.00", "₱950.00", "—", "₱12,500.00"];
  const byAmount = (direction: "ascending" | "descending") => sortTableRows(amounts, { key: "amount", direction }, (row) => cellSortValue(row));

  it("sorts peso amounts as numbers and keeps blanks last in both directions", () => {
    expect(byAmount("ascending")).toEqual(["₱950.00", "₱1,200.00", "₱12,500.00", "—"]);
    expect(byAmount("descending")).toEqual(["₱12,500.00", "₱1,200.00", "₱950.00", "—"]);
  });

  it("sorts display dates by time and text with numeric runs", () => {
    expect(Number(cellSortValue("Oct 29, 2026"))).toBeGreaterThan(Number(cellSortValue("Sep 30, 2026")));
    expect(sortTableRows(["OR-10", "OR-9"], { key: "receipt", direction: "ascending" }, (row) => row)).toEqual(["OR-9", "OR-10"]);
  });

  it("toggles direction on the same column and restarts ascending on another", () => {
    const first = toggleTableSort({ key: null, direction: "ascending" }, "name");
    expect(first).toEqual({ key: "name", direction: "ascending" });
    expect(toggleTableSort(first, "name").direction).toBe("descending");
    expect(toggleTableSort({ key: "name", direction: "descending" }, "date")).toEqual({ key: "date", direction: "ascending" });
  });
});
