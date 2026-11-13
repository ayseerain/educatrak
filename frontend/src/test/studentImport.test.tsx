import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { StudentImportPage } from "@/features/students/StudentImportPage";

describe("StudentImportPage prototype", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DATA_SOURCE", "mock");
    vi.stubEnv("VITE_USE_LIVE_API", "");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("accepts a non-empty CSV selection and lets the Registrar remove it", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StudentImportPage /></MemoryRouter>);

    const input = screen.getByLabelText("Choose CSV or XLSX file");
    await user.upload(input, new File(["LRN,Name\n000000000001,Sample Student"], "students.csv", { type: "text/csv" }));

    expect(screen.getByRole("status")).toHaveTextContent("students.csv");
    expect(screen.getByRole("status")).toHaveTextContent("Selected");
    expect(screen.getByText("Column matching will appear after the file headers are checked.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm and apply import" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Remove selected file" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Choose a file to continue to column matching.")).toBeInTheDocument();
  });

  it("rejects unsupported and empty file selections without selecting a file", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<MemoryRouter><StudentImportPage /></MemoryRouter>);

    const input = screen.getByLabelText("Choose CSV or XLSX file");
    await user.upload(input, new File(["not a roster"], "students.pdf", { type: "application/pdf" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a CSV or XLSX file.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.upload(input, new File([], "students.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    expect(screen.getByRole("alert")).toHaveTextContent("This file is empty. Choose another file.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the unavailable notice instead of an upload control in live mode", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "live");
    render(<MemoryRouter><StudentImportPage /></MemoryRouter>);

    expect(screen.getByText("Student list import is available in the MockDB workspace only.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Choose CSV or XLSX file")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm and apply import" })).not.toBeInTheDocument();
  });
});
