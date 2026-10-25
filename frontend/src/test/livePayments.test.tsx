import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LivePaymentEntryPage } from "@/features/operations/LivePaymentEntryPage";
import { LivePaymentReceiptPage, LivePaymentsPage } from "@/features/operations/LivePaymentsPage";
import { centavos } from "@/lib/money";
import { downloadCsv } from "@/lib/csv";
import type { AuthenticatedUser } from "@/lib/types";

const { getPayment, getPaymentContext, listPayments, listVoidRequests, recordCashPaymentForStudent, reprintPayment, searchPaymentStudents } = vi.hoisted(() => ({
  getPayment: vi.fn(),
  getPaymentContext: vi.fn(),
  listPayments: vi.fn(),
  listVoidRequests: vi.fn(),
  recordCashPaymentForStudent: vi.fn(),
  reprintPayment: vi.fn(),
  searchPaymentStudents: vi.fn(),
}));

vi.mock("@/api/cashierApi", () => ({
  getPayment,
  getPaymentContext,
  listPayments,
  listVoidRequests,
  recordCashPaymentForStudent,
  reprintPayment,
  searchPaymentStudents,
}));
vi.mock("@/lib/csv", () => ({ downloadCsv: vi.fn() }));

const cashier: AuthenticatedUser = { id: "cashier-1", name: "Sample Cashier", role: "cashier" };
const administrator: AuthenticatedUser = { id: "admin-1", name: "Sample Administrator", role: "administrator" };

function renderPage(initialEntry = "/payments/new") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[initialEntry]}><LivePaymentEntryPage /></MemoryRouter></QueryClientProvider>);
}

describe("live cashier payment entry", () => {
  beforeEach(() => {
    getPayment.mockReset();
    reprintPayment.mockReset();
    searchPaymentStudents.mockResolvedValue([{
      id: "student-1",
      number: "S-TEST-1001",
      name: "Talia Test Student (sample)",
      grade: "Grade 2",
      section: "Test Section",
      balanceCents: 20_000,
    }]);
    getPaymentContext.mockResolvedValue({
      student: { id: "student-1", number: "S-TEST-1001", name: "Talia Test Student (sample)" },
      billingAccountId: "billing-account-1",
      balanceCents: 20_000,
      nextInstallment: { id: "installment-1", label: "Installment 1", dueDate: "2026-10-01", amountDueCents: 5_000 },
    });
    recordCashPaymentForStudent.mockReset();
    recordCashPaymentForStudent
      .mockRejectedValueOnce(new Error("The network response was lost."))
      .mockResolvedValueOnce({ id: "payment-1", receiptNo: "OR-2026-000001", balanceAfter: centavos(15_000), emailQueued: true, smsQueued: false, smsLoadFeeCents: null });
  });

  afterEach(() => vi.clearAllMocks());

  it("uses live student context and reuses the idempotency key when retrying a failed response", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByRole("searchbox", { name: "Student name or number" }), "Talia");
    await user.click(await screen.findByRole("button", { name: /Talia Test Student/ }));
    expect(await screen.findByText("Current balance")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Cash received"), "50.00");
    await user.click(screen.getByRole("button", { name: "Review payment" }));
    await user.click(screen.getByRole("button", { name: "Confirm and save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The network response was lost.");

    await user.click(screen.getByRole("button", { name: "Confirm and save" }));
    expect(await screen.findByRole("status")).toHaveTextContent("OR-2026-000001");
    expect(searchPaymentStudents).toHaveBeenCalledWith("Talia");
    expect(getPaymentContext).toHaveBeenCalledWith("student-1");
    expect(recordCashPaymentForStudent).toHaveBeenCalledTimes(2);
    const firstCall = recordCashPaymentForStudent.mock.calls[0]?.[0];
    const secondCall = recordCashPaymentForStudent.mock.calls[1]?.[0];
    if (!firstCall || !secondCall) throw new Error("Expected both payment attempts to be recorded.");
    expect(firstCall).toMatchObject({
      billingAccountId: "billing-account-1",
      amount: centavos(5_000),
      notificationChannels: ["email"],
    });
    expect(firstCall.idempotencyKey).toBeTruthy();
    expect(secondCall.idempotencyKey).toBe(firstCall.idempotencyKey);
  });

  it("loads the student selected from the cashier profile shortcut", async () => {
    renderPage("/payments/new?student=student-1");

    expect(await screen.findByText("Talia Test Student (sample)")).toBeInTheDocument();
    expect(screen.getByText("S-TEST-1001")).toBeInTheDocument();
    expect(screen.getByText("Current balance")).toBeInTheDocument();
    expect(getPaymentContext).toHaveBeenCalledWith("student-1");
    expect(searchPaymentStudents).not.toHaveBeenCalled();
  });

  it("supports the next-installment shortcut, back-dating controls, duplicate reasons, and notes", async () => {
    const user = userEvent.setup();
    recordCashPaymentForStudent.mockReset();
    recordCashPaymentForStudent.mockResolvedValue({ id: "payment-2", receiptNo: "OR-2026-000002", balanceAfter: centavos(15_000), emailQueued: true, smsQueued: false, smsLoadFeeCents: null });
    renderPage();

    await user.type(screen.getByRole("searchbox", { name: "Student name or number" }), "Talia");
    await user.click(await screen.findByRole("button", { name: /Talia Test Student/ }));
    await user.click(await screen.findByRole("button", { name: /Pay next installment/ }));
    expect(screen.getByLabelText("Cash received")).toHaveValue(50);

    const today = formatManilaDate(new Date());
    const previousDay = new Date(`${today}T12:00:00+08:00`);
    previousDay.setDate(previousDay.getDate() - 1);
    const backdated = formatManilaDate(previousDay);
    expect(backdated < today).toBe(true);
    fireEvent.change(screen.getByLabelText("Date of payment (defaults to today)"), { target: { value: backdated } });
    expect(screen.getByLabelText("Date of payment (defaults to today)")).toHaveValue(backdated);
    await user.type(screen.getByLabelText(/^Reason for back-dated payment/), "Bank counter was closed yesterday");
    await user.type(screen.getByLabelText(/^Duplicate payment confirmation reason/), "This is a separate installment payment");
    await user.type(screen.getByLabelText("Note (optional)"), "Received at the school office");
    await user.click(screen.getByRole("button", { name: "Review payment" }));
    await user.click(screen.getByRole("button", { name: "Confirm and save" }));

    await waitFor(() => expect(recordCashPaymentForStudent).toHaveBeenCalled());
    expect(await screen.findByRole("status")).toHaveTextContent("OR-2026-000002");
    expect(recordCashPaymentForStudent).toHaveBeenCalledWith(expect.objectContaining({
      amount: centavos(5_000),
      paidOn: backdated,
      backdateReason: "Bank counter was closed yesterday",
      duplicateOverrideReason: "This is a separate installment payment",
      notes: "Received at the school office",
    }), expect.anything());
  });

  it("shows server notification status and account-scoped payment audit events on detail", async () => {
    getPayment.mockResolvedValue({
      id: "payment-1", studentId: "student-1", studentName: "Talia Test Student", studentNo: "S-TEST-1001",
      billingAccountId: "billing-account-1", amountCents: 5000, method: "cash", paidOn: "2026-10-24", status: "valid",
      receiptNo: "OR-2026-000001", recordedAt: "2026-10-24T08:00:00Z", recordedBy: "Casey Cashier",
      reprintCount: 0, balanceAfterCents: 15000, allocations: [{ installmentLabel: "Installment 1", amountCents: 5000 }],
      notifications: [{ channel: "email", status: "queued", loggedAt: "2026-10-24T08:00:00Z" }],
      auditTrail: [{ action: "payment.recorded", actorName: "Casey Cashier", occurredAt: "2026-10-24T08:00:00Z" }],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/payments/payment-1"]}><Routes><Route path="/payments/:id" element={<LivePaymentsPage user={administrator} detail />} /></Routes></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByRole("heading", { name: "Receipt notification status" })).toBeInTheDocument();
    expect(screen.getByText("queued")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Audit trail" })).toBeInTheDocument();
    expect(screen.getByText("payment recorded")).toBeInTheDocument();
    expect(getPayment).toHaveBeenCalledWith("payment-1");
  });

  it("distinguishes the first receipt print from later reprints", async () => {
    const user = userEvent.setup();
    const payment = {
      id: "payment-1", studentId: "student-1", studentName: "Talia Test Student", studentNo: "S-TEST-1001",
      billingAccountId: "billing-account-1", amountCents: 5000, method: "cash", paidOn: "2026-10-24", status: "valid",
      receiptNo: "OR-2026-000001", firstPrintedAt: null, recordedAt: "2026-10-24T08:00:00Z", recordedBy: "Casey Cashier",
      reprintCount: 0, balanceAfterCents: 15000,
      allocations: [{ installmentLabel: "Installment 1", amountCents: 5000 }],
    };
    getPayment.mockResolvedValue(payment);
    reprintPayment.mockResolvedValueOnce({ ...payment, firstPrintedAt: "2026-10-24T08:30:00Z" })
      .mockResolvedValueOnce({ ...payment, firstPrintedAt: "2026-10-24T08:30:00Z", reprintCount: 1 });
    const print = vi.fn();
    vi.stubGlobal("print", print);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/receipts/payment-1/print"]}><Routes><Route path="/receipts/:id/print" element={<LivePaymentReceiptPage user={cashier} />} /></Routes></MemoryRouter></QueryClientProvider>);

    const printButton = await screen.findByRole("button", { name: "Print receipt" });
    await user.click(printButton);
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(reprintPayment).toHaveBeenNthCalledWith(1, "payment-1", expect.anything());
    await user.click(screen.getByRole("button", { name: "Reprint receipt" }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(2));
    expect(reprintPayment).toHaveBeenNthCalledWith(2, "payment-1", expect.anything());
  });
});

function formatManilaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

describe("live payment history export", () => {
  afterEach(() => vi.clearAllMocks());

  it("exports all payment pages matching the active search, date, cashier, method, and status filters", async () => {
    listPayments.mockImplementation(async ({ page = 1 } = {}) => ({
      data: [{ id: `payment-${page}`, studentId: `student-${page}`, studentName: `Sample Student ${page}`, studentNo: `SAMPLE-910${page}`, billingAccountId: "account-1", amountCents: 12500, method: "cash", paidOn: "2026-10-24", status: "valid", receiptNo: `OR-SAMPLE-910${page}`, recordedAt: "2026-10-24T10:00:00+08:00", recordedBy: "Taylor Sample Cashier", reprintCount: 0, balanceAfterCents: 0 }],
      currentPage: page,
      lastPage: 2,
      total: 2,
    }));
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><LivePaymentsPage user={administrator} /></MemoryRouter></QueryClientProvider>);

    await screen.findByText("Sample Student 1");
    await user.type(screen.getByRole("searchbox", { name: "Search receipt or student" }), "SAMPLE");
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    await user.selectOptions(screen.getByLabelText("Status"), "valid");
    await user.type(screen.getByLabelText("Date of payment from"), "2026-10-01");
    await user.type(screen.getByLabelText("Date of payment through"), "2026-10-24");
    await user.type(screen.getByLabelText("Cashier"), "Taylor");
    await user.type(screen.getByLabelText("Payment method"), "cash");
    await user.type(screen.getByLabelText("Minimum amount (PHP)"), "10.00");
    await user.type(screen.getByLabelText("Maximum amount (PHP)"), "100.00");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    await user.click(screen.getByRole("button", { name: "Export for Excel (.csv)" }));

    await waitFor(() => expect(downloadCsv).toHaveBeenCalledWith(
      "payment-history.csv",
      expect.any(Array),
      expect.arrayContaining([expect.arrayContaining(["OR-SAMPLE-9102", "Sample Student 2", "SAMPLE-9102"])]),
    ));
    expect(listPayments).toHaveBeenCalledWith({ query: "SAMPLE", status: "valid", dateFrom: "2026-10-01", dateTo: "2026-10-24", cashier: "Taylor", method: "cash", amountMinCents: 1000, amountMaxCents: 10000, page: 2, perPage: 10 });
  });

  it("does not offer a cashier selector to Cashier and filters to the authenticated account", async () => {
    listPayments.mockResolvedValue({ data: [], currentPage: 1, lastPage: 1, total: 0 });
    listVoidRequests.mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><LivePaymentsPage user={cashier} /></MemoryRouter></QueryClientProvider>);

    await screen.findByText("No payments match the selected filters.");
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));
    expect(screen.queryByLabelText("Cashier")).not.toBeInTheDocument();
    expect(listPayments).toHaveBeenCalledWith(expect.objectContaining({ cashier: "" }));
  });

  it("shows only the Cashier's own void-request status inside transaction history", async () => {
    listPayments.mockResolvedValue({ data: [], currentPage: 1, lastPage: 1, total: 0 });
    listVoidRequests.mockResolvedValue([{
      id: "void-1", paymentId: "payment-1", receiptNo: "OR-2026-000001", amountCents: 5000,
      reason: "Duplicate counter entry", status: "pending", requestedBy: "Sample Cashier",
      requestedAt: "2026-10-24T08:00:00Z", decisionNote: null,
    }]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><LivePaymentsPage user={cashier} /></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByRole("heading", { name: "My void requests" })).toBeInTheDocument();
    expect(await screen.findByText("OR-2026-000001")).toBeInTheDocument();
    expect(screen.getByText("Duplicate counter entry")).toBeInTheDocument();
    expect(screen.getByText("Pending Accounting review")).toBeInTheDocument();
    expect(listVoidRequests).toHaveBeenCalledTimes(1);
  });
});
