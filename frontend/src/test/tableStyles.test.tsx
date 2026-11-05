import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable, TABLE_BODY_CELL_CLASS, TABLE_CLASS, TABLE_HEADER_CELL_CLASS, TABLE_SCROLL_CLASS } from "@/components/ui/Table";

describe("DataTable", () => {
  it("uses the centralized table spacing and scroll tokens", () => {
    render(
      <DataTable
        caption="Sample payments"
        columns={[{ accessorKey: "receipt", header: "Receipt" }]}
        data={[{ receipt: "OR-2026-001001" }]}
      />,
    );

    expect(screen.getByRole("table", { name: "Sample payments" })).toHaveClass(...TABLE_CLASS.split(" "));
    expect(screen.getByRole("table").parentElement).toHaveClass(...TABLE_SCROLL_CLASS.split(" "));
    expect(screen.getByRole("columnheader", { name: "Receipt" })).toHaveClass(...TABLE_HEADER_CELL_CLASS.split(" "));
    expect(screen.getByRole("cell", { name: "OR-2026-001001" })).toHaveClass(...TABLE_BODY_CELL_CLASS.split(" "));
  });
});
