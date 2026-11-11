import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { getStudentStatement } from "@/api/reportApi";
import { LiveStudentStatement } from "@/features/reports/LiveStudentStatement";
import type { AuthenticatedUser } from "@/lib/types";

vi.mock("@/api/reportApi", () => ({ getStudentStatement: vi.fn() }));

const accounting: AuthenticatedUser = { id: "accounting-1", name: "Sample Accounting", role: "accounting" };
const auditor: AuthenticatedUser = { id: "auditor-1", name: "Sample Auditor", role: "auditor" };

describe("live student statement", () => {
  it("shows persisted fees, schedule, payment history, balance, and Accounting print action", async () => {
    vi.mocked(getStudentStatement).mockResolvedValue({
      studentId: "student-1",
      lrn: "SAMPLE-9101",
      studentName: "Riley Sample Student",
      schoolYear: "SY 2026-2027",
      totalDueCents: 20000,
      totalPaidCents: 15000,
      balanceCents: 5000,
      items: [{ name: "Sample tuition", category: "tuition", amountCents: 20000 }],
      installments: [{ label: "First installment", dueDate: "2026-10-01", amountCents: 20000, paidCents: 15000, status: "current" }],
      payments: [{ receiptNo: "OR-SAMPLE-9101", amountCents: 15000, paidOn: "2026-10-24", status: "valid" }],
    });

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><LiveStudentStatement user={accounting} studentId="student-1" /></MemoryRouter></QueryClientProvider>);

    expect(await screen.findAllByText("Sample tuition")).toHaveLength(2);
    expect(screen.getAllByText("First installment")).toHaveLength(2);
    expect(screen.getAllByText("OR-SAMPLE-9101")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Print Report" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export for Excel (.csv)" })).toBeInTheDocument();
  });

  it("does not expose standalone report actions to Auditor", async () => {
    vi.mocked(getStudentStatement).mockResolvedValue({
      studentId: "student-1", lrn: "SAMPLE-9101", studentName: "Riley Sample Student", schoolYear: "SY 2026-2027", totalDueCents: 20000, totalPaidCents: 15000, balanceCents: 5000,
      items: [{ name: "Sample tuition", category: "tuition", amountCents: 20000 }],
      installments: [{ label: "First installment", dueDate: "2026-10-01", amountCents: 20000, paidCents: 15000, status: "current" }],
      payments: [{ receiptNo: "OR-SAMPLE-9101", amountCents: 15000, paidOn: "2026-10-24", status: "valid" }],
    });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><LiveStudentStatement user={auditor} studentId="student-1" /></MemoryRouter></QueryClientProvider>);

    await screen.findAllByText("Sample tuition");
    expect(screen.queryByRole("button", { name: "Print Report" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export for Excel (.csv)" })).not.toBeInTheDocument();
  });

});
