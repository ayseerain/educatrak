import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AccountsPage, PaymentsPage } from "@/features/operations/OperationalPages";
import type { AuthenticatedUser } from "@/lib/types";

const cashier: AuthenticatedUser = { id: "user-cashier", name: "Casey Cashier (sample)", role: "cashier" };

function columnValues(index: number) {
  return screen.getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[index]?.textContent ?? "");
}

describe("sortable list tables", () => {
  it("sorts a column ascending, then descending, with aria-sort on the header", async () => {
    render(<MemoryRouter><AccountsPage user={cashier} /></MemoryRouter>);
    const header = screen.getByRole("columnheader", { name: /balance/i });
    expect(header).not.toHaveAttribute("aria-sort");

    await userEvent.click(within(header).getByRole("button", { name: "Sort by Balance" }));
    expect(header).toHaveAttribute("aria-sort", "ascending");
    const ascending = columnValues(2).map((value) => Number(value.replace(/[₱,]/g, "")));
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));

    await userEvent.click(within(header).getByRole("button", { name: "Sort by Balance, currently ascending" }));
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(columnValues(2).map((value) => Number(value.replace(/[₱,]/g, "")))).toEqual([...ascending].reverse());
  });

  it("keeps the search and filter controls inside the table card", () => {
    render(<MemoryRouter><PaymentsPage user={cashier} /></MemoryRouter>);
    const table = screen.getByRole("table");
    const search = screen.getByRole("searchbox", { name: "Search receipt or student" });
    expect(table.closest(".shadow-card")).toContainElement(search);
  });

  it("sorts the whole paginated list and returns to page 1", async () => {
    render(<MemoryRouter><PaymentsPage user={cashier} /></MemoryRouter>);
    const next = screen.getByRole("button", { name: "Next page" });
    await userEvent.click(next);
    await userEvent.click(screen.getByRole("button", { name: "Sort by Receipt" }));
    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
  });
});
