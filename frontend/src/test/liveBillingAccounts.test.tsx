import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LiveBillingAccountDetail, LiveBillingAccounts } from "@/features/billing/LiveBillingAccounts";
import type { AuthenticatedUser } from "@/lib/types";

const cashier: AuthenticatedUser = { id: "cashier-1", name: "Casey Cashier (sample)", role: "cashier" };

describe("live billing account pages", () => {
  beforeEach(() => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_USE_LIVE_API", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("loads server account summaries and supports school-year and grade filtering", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [summary], meta: { currentPage: 1, lastPage: 1, total: 1 } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    renderPage(<LiveBillingAccounts />);

    expect(await screen.findByText("Morgan Sample Student")).toBeInTheDocument();
    expect(screen.getByText("₱350.00")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/billing-accounts?page=1&per_page=10", expect.objectContaining({ credentials: "include" }));
  });

  it("sends the selected search, school-year, grade and status filters and resets pagination", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [summary], meta: { currentPage: 1, lastPage: 3, total: 51 } }),
    });
    const user = userEvent.setup();
    vi.stubGlobal("fetch", fetchMock);
    renderPage(<LiveBillingAccounts />);

    expect(await screen.findByText("Morgan Sample Student")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/billing-accounts?page=2&per_page=10",
      expect.objectContaining({ credentials: "include" }),
    ));

    await user.type(screen.getByRole("searchbox", { name: "Search billing accounts" }), "SAMPLE-4002");
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    await user.type(screen.getByRole("textbox", { name: "Filter by school year" }), "SY 2026-2027");
    await user.type(screen.getByRole("textbox", { name: "Filter by grade" }), "Grade 4");
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter by billing status" }), "due_soon");
    await user.type(screen.getByRole("spinbutton", { name: "Minimum balance" }), "100.00");
    await user.type(screen.getByRole("spinbutton", { name: "Maximum balance" }), "500.00");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/billing-accounts?query=SAMPLE-4002&school_year=SY+2026-2027&grade=Grade+4&status=due_soon&minimum_balance_cents=10000&maximum_balance_cents=50000&page=1&per_page=10",
      expect.objectContaining({ credentials: "include" }),
    ));
  });

  it("renders API-backed installment, fee, payment and adjustment sections", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: {
        ...summary,
        items: [{ name: "Tuition (sample)", category: "tuition", amountCents: 50000, required: true }],
        installments: [{ id: "installment-1", label: "First installment", dueDate: "2026-10-30", amountCents: 50000, paidCents: 15000, status: "current" }],
        payments: [{ id: "payment-1", receiptNo: "OR-2026-001050", amountCents: 15000, paidOn: "2026-10-24", status: "valid", recordedBy: "Casey Cashier (sample)", allocations: [{ installment: "First installment", amountCents: 15000 }] }],
        adjustments: [{ id: "adjustment-1", type: "scholarship", amountCents: -5000, reason: "Approved sample grant", effectiveAt: "2026-10-24T08:00:00Z", createdBy: "Casey Cashier (sample)" }],
        activity: [{ id: "audit-1", action: "receipt.reprinted", occurredAt: "2026-10-24T08:30:00Z", actor: "Casey Cashier (sample)", details: { receiptNo: "OR-2026-001050", reprintCount: 1 } }],
      } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    renderPage(<LiveBillingAccountDetail user={cashier} />, "/accounts/account-1");

    expect(await screen.findByRole("heading", { name: "Morgan Sample Student" })).toBeInTheDocument();
    expect(screen.getByText("Tuition (sample)")).toBeInTheDocument();
    expect(screen.getByText("First installment")).toBeInTheDocument();
    expect(screen.getByText("OR-2026-001050")).toBeInTheDocument();
    expect(screen.getByText("Approved sample grant")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account activity" })).toBeInTheDocument();
    expect(screen.getByText("Receipt reprinted")).toBeInTheDocument();
    expect(screen.getByText("Receipt OR-2026-001050 · Reprints 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute("href", "/payments/new?student=student-1");
  });
});

function renderPage(element: ReactNode, initialEntry = "/accounts") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[initialEntry]}><Routes><Route path="/accounts" element={<LiveBillingAccounts />} /><Route path="/accounts/:id" element={element} /></Routes></MemoryRouter></QueryClientProvider>);
}

const summary = {
  id: "account-1",
  studentId: "student-1",
  studentNo: "SAMPLE-4002",
  studentName: "Morgan Sample Student",
  gradeLevel: "Grade 4",
  section: null,
  schoolYearId: "year-1",
  schoolYear: "SY 2026-2027",
  status: "current",
  totalDueCents: 50000,
  totalPaidCents: 15000,
  balanceCents: 35000,
};
