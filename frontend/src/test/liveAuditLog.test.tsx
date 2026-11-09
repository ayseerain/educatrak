import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAuditEntries } from "@/api/auditApi";
import { LiveAuditLog } from "@/features/operations/LiveAuditLog";

vi.mock("@/api/auditApi", () => ({ listAuditEntries: vi.fn() }));

describe("live audit log", () => {
  beforeEach(() => vi.mocked(listAuditEntries).mockResolvedValue({
    data: [{
      id: "event-1",
      actor: "Taylor Sample Cashier",
      actorId: "user-1",
      action: "payment.recorded",
      entityType: "payment",
      entityId: "payment-1",
      before: null,
      after: { amount_cents: 12500, receipt_no: "OR-SAMPLE-001" },
      occurredAt: "2026-10-24T10:00:00Z",
    }],
    currentPage: 1,
    lastPage: 1,
    total: 1,
    perPage: 10,
  }));

  it("shows recorded before/after details and submits audit filters", async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><LiveAuditLog /></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByText("payment.recorded")).toBeInTheDocument();
    expect(screen.getByText(/amount_cents/)).toHaveTextContent('"amount_cents":12500');
    fireEvent.change(screen.getByLabelText("User"), { target: { value: "Taylor" } });
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-24" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => expect(listAuditEntries).toHaveBeenLastCalledWith({ user: "Taylor", dateFrom: "2026-10-24", page: 1, perPage: 10 }));
  });
});
