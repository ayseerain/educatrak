import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOutstandingReport } from "@/api/reportApi";
import { LiveOutstandingReport } from "@/features/reports/LiveOutstandingReport";
import { downloadCsv } from "@/lib/csv";

vi.mock("@/api/reportApi", () => ({ getOutstandingReport: vi.fn() }));
vi.mock("@/lib/csv", () => ({ downloadCsv: vi.fn() }));
vi.mock("@/lib/printing", () => ({ printDocumentWhenReady: vi.fn(() => Promise.resolve()) }));

describe("live outstanding report", () => {
  beforeEach(() => vi.mocked(getOutstandingReport).mockResolvedValue({
    data: [{ id: "account-1", studentId: "student-1", studentNo: "SAMPLE-9201", studentName: "Avery Sample Student", gradeLevel: "Grade 4", section: "Orchid", schoolYear: "SY 2026-2027", balanceCents: 15000, status: "overdue" }],
    currentPage: 1,
    lastPage: 1,
    total: 1,
    perPage: 10,
  }));

  it("renders current account balances and applies overdue and minimum filters", async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><LiveOutstandingReport /></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByText("Avery Sample Student")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));
    fireEvent.change(screen.getByLabelText("Grade"), { target: { value: "Grade 4" } });
    fireEvent.change(screen.getByLabelText("Minimum balance (PHP)"), { target: { value: "100.00" } });
    fireEvent.click(screen.getByLabelText("Overdue only"));
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => expect(getOutstandingReport).toHaveBeenLastCalledWith({ grade: "Grade 4", minimumBalanceCents: 10000, overdueOnly: true, page: 1, perPage: 10 }));
  });

  it("exports every page of outstanding accounts matching the active filters", async () => {
    vi.mocked(getOutstandingReport).mockImplementation(async ({ page = 1 } = {}) => ({
      data: [{ id: `account-${page}`, studentId: `student-${page}`, studentNo: `SAMPLE-920${page}`, studentName: `Sample Student ${page}`, gradeLevel: "Grade 4", section: "Orchid", schoolYear: "SY 2026-2027", balanceCents: 15000, status: "overdue" }],
      currentPage: page,
      lastPage: 2,
      total: 2,
      perPage: 10,
    }));
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><LiveOutstandingReport /></MemoryRouter></QueryClientProvider>);

    await screen.findByText("Sample Student 1");
    await user.click(screen.getByRole("button", { name: "Export for Excel (.csv)" }));

    await waitFor(() => expect(downloadCsv).toHaveBeenCalledWith(
      "outstanding-balances.csv",
      expect.any(Array),
      expect.arrayContaining([expect.arrayContaining(["SAMPLE-9201"]), expect.arrayContaining(["SAMPLE-9202"])]),
    ));
    expect(getOutstandingReport).toHaveBeenCalledWith({ page: 2, perPage: 10 });
  });

  it("prints every authorized outstanding-account page", async () => {
    vi.mocked(getOutstandingReport).mockImplementation(async ({ page = 1 } = {}) => ({
      data: [{ id: `account-${page}`, studentId: `student-${page}`, studentNo: `SAMPLE-920${page}`, studentName: `Sample Student ${page}`, gradeLevel: "Grade 4", section: "Orchid", schoolYear: "SY 2026-2027", balanceCents: 15000, status: "overdue" }],
      currentPage: page, lastPage: 2, total: 2, perPage: 50,
    }));
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><LiveOutstandingReport /></MemoryRouter></QueryClientProvider>);
    await screen.findByText("Sample Student 1");
    await user.click(screen.getByRole("button", { name: "Print Report" }));
    await waitFor(() => expect(document.body.querySelector(":scope > .print-root")?.textContent).toContain("Sample Student 2"));
    expect(getOutstandingReport).toHaveBeenCalledWith({ page: 2, perPage: 50 });
  });
});
