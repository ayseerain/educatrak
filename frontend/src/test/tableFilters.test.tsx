import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TableFilters, useTableFilters } from "@/components/ui/TableFilters";

function SeparateTables() {
  const students = useTableFilters({ query: "", grade: "" });
  const payments = useTableFilters({ query: "", status: "" });
  return <>
    <TableFilters scope="Students" defaults={{ query: "", grade: "" }} draft={students.draft} applied={students.applied} search={{ key: "query", label: "Search students" }} fields={[{ key: "grade", label: "Grade" }]} onChange={students.update} onSearch={students.search} onApply={students.apply} onReset={students.reset} onClear={students.clear} onRemove={students.remove} />
    <button onClick={() => students.setPage(3)}>Go to student page 3</button>
    <output aria-label="Student result state">{students.applied.grade || "all grades"} / page {students.page}</output>
    <TableFilters scope="Payments" defaults={{ query: "", status: "" }} draft={payments.draft} applied={payments.applied} search={{ key: "query", label: "Search payments" }} fields={[{ key: "status", label: "Payment status", type: "select", options: [{ value: "", label: "All statuses" }, { value: "valid", label: "Valid" }] }]} onChange={payments.update} onSearch={payments.search} onApply={payments.apply} onReset={payments.reset} onClear={payments.clear} onRemove={payments.remove} />
    <output aria-label="Payment result state">{payments.applied.status || "all statuses"} / page {payments.page}</output>
  </>;
}

describe("page scoped table filters", () => {
  it("applies, resets, and clears one table without changing another table's filters", async () => {
    const user = userEvent.setup();
    render(<SeparateTables />);

    await user.click(screen.getByRole("button", { name: "Go to student page 3" }));
    await user.click(screen.getAllByRole("button", { name: "Filter" })[0]!);
    await user.type(screen.getByRole("textbox", { name: "Grade" }), "Grade 4");
    expect(screen.getByLabelText("Student result state")).toHaveTextContent("all grades / page 3");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(screen.getByLabelText("Student result state")).toHaveTextContent("Grade 4 / page 1");
    expect(screen.getByLabelText("Payment result state")).toHaveTextContent("all statuses / page 1");
    expect(screen.queryByRole("dialog", { name: "Students filters" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filter (1)" }));
    await user.clear(screen.getByRole("textbox", { name: "Grade" }));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("textbox", { name: "Grade" })).toHaveValue("Grade 4");
    await user.click(screen.getByRole("button", { name: "Remove Grade: Grade 4 filter" }));
    expect(screen.getByLabelText("Student result state")).toHaveTextContent("all grades / page 1");
  });

  it("dismisses the dropdown on Escape and outside click without applying a draft", async () => {
    const user = userEvent.setup();
    render(<SeparateTables />);

    await user.click(screen.getAllByRole("button", { name: "Filter" })[0]!);
    expect(screen.getByRole("dialog", { name: "Students filters" })).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Grade" }), "Grade 4");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Students filters" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Student result state")).toHaveTextContent("all grades / page 1");

    await user.click(screen.getAllByRole("button", { name: "Filter" })[0]!);
    expect(screen.getByRole("textbox", { name: "Grade" })).toHaveValue("Grade 4");
    await user.click(screen.getByRole("button", { name: "Go to student page 3" }));
    expect(screen.queryByRole("dialog", { name: "Students filters" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Student result state")).toHaveTextContent("all grades / page 3");
  });
});
