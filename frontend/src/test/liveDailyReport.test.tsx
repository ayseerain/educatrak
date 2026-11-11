import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDailyReport } from "@/api/reportApi";
import { LiveDailyReport } from "@/features/reports/LiveDailyReport";
import { downloadCsv } from "@/lib/csv";
import type { AuthenticatedUser } from "@/lib/types";

vi.mock("@/api/reportApi", () => ({ getDailyReport: vi.fn() }));
vi.mock("@/lib/csv", () => ({ downloadCsv: vi.fn() }));

const administrator: AuthenticatedUser = { id: "admin-1", name: "Alex Sample", role: "administrator" };
const accounting: AuthenticatedUser = { id: "accounting-1", name: "Morgan Sample", role: "accounting" };

describe("live daily collection report", () => {
  beforeEach(() => vi.mocked(getDailyReport).mockResolvedValue({
    date: "2026-10-24",
    totalCents: 12500,
    byMethod: [{ method: "cash", totalCents: 12500, transactionCount: 1 }],
    byCashier: [{ cashierId: "cashier-1", cashier: "Taylor Sample Cashier", totalCents: 12500, transactionCount: 1 }],
    payments: [{ id: "payment-1", lrn: "SAMPLE-9101", studentName: "Riley Sample Student", receiptNo: "OR-SAMPLE-9101", amountCents: 12500, method: "cash", status: "valid", cashier: "Taylor Sample Cashier", voidStatus: null }],
    voids: [],
    meta: { currentPage: 1, lastPage: 1, totalPayments: 1, perPage: 10 },
    voidMeta: { currentPage: 1, lastPage: 1, total: 0, perPage: 10 },
  }));

  it("shows persisted collection totals and requests the chosen date", async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><LiveDailyReport user={administrator} /></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByText("Riley Sample Student (SAMPLE-9101)")).toBeInTheDocument();
    expect(screen.getAllByText(/125\.00/)).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));
    fireEvent.change(screen.getByLabelText("Report date"), { target: { value: "2026-10-24" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(getDailyReport).toHaveBeenLastCalledWith("2026-10-24", 1, 10, 1));
  });

  it("exports all payment pages with void activity in an Excel-compatible CSV", async () => {
    vi.mocked(getDailyReport).mockImplementation(async (_date, page = 1) => ({
      date: "2026-10-24",
      totalCents: 12500,
      byMethod: [],
      byCashier: [],
      payments: page === 1
        ? [{ id: "payment-1", lrn: "SAMPLE-9101", studentName: "Riley Sample Student", receiptNo: "OR-SAMPLE-9101", amountCents: 12500, method: "cash", status: "valid", cashier: "Taylor Sample Cashier", voidStatus: null }]
        : [{ id: "payment-2", lrn: "SAMPLE-9102", studentName: "Casey Sample Student", receiptNo: "OR-SAMPLE-9102", amountCents: 7500, method: "cash", status: "valid", cashier: "Taylor Sample Cashier", voidStatus: null }],
      voids: page === 1 ? [{ id: "void-1", paymentId: "payment-1", receiptNo: "OR-SAMPLE-9101", lrn: "SAMPLE-9101", studentName: "Riley Sample Student", amountCents: 12500, status: "pending", reason: "Duplicate sample", requestedBy: "Taylor Sample Cashier", requestedAt: "2026-10-24T09:00:00+08:00", decidedAt: null }] : [],
      meta: { currentPage: page, lastPage: 2, totalPayments: 2, perPage: 10 },
      voidMeta: { currentPage: 1, lastPage: 1, total: page === 1 ? 1 : 0, perPage: 10 },
    }));
    const user = await import("@testing-library/user-event").then(({ default: userEvent }) => userEvent.setup());
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><LiveDailyReport user={administrator} /></MemoryRouter></QueryClientProvider>);

    await screen.findAllByText("Riley Sample Student (SAMPLE-9101)");
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    const reportDate = (screen.getByLabelText("Report date") as HTMLInputElement).value;
    await user.click(screen.getByRole("button", { name: "Export for Excel (.csv)" }));

    await waitFor(() => expect(downloadCsv).toHaveBeenCalledWith(
      `daily-collection-${reportDate}.csv`,
      expect.any(Array),
      expect.arrayContaining([
        expect.arrayContaining([reportDate, "Payment", "SAMPLE-9102"]),
        expect.arrayContaining([reportDate, "Void request", "SAMPLE-9101"]),
      ]),
    ));
    expect(getDailyReport).toHaveBeenCalledWith(reportDate, 2, 10, 1);
  });

  it("lets Accounting select the report date", async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><LiveDailyReport user={accounting} /></MemoryRouter></QueryClientProvider>);

    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));
    const dateInput = screen.getByLabelText("Report date") as HTMLInputElement;
    expect(dateInput).toBeEnabled();
    await screen.findByText("Riley Sample Student (SAMPLE-9101)");
    fireEvent.change(dateInput, { target: { value: "2026-10-23" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(getDailyReport).toHaveBeenLastCalledWith("2026-10-23", 1, 10, 1));
  });
});
