import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listNotificationLogs } from "@/api/notificationApi";
import { LiveNotificationLog } from "@/features/operations/LiveNotificationLog";

vi.mock("@/api/notificationApi", () => ({ listNotificationLogs: vi.fn(), retryNotification: vi.fn() }));

const cashier = { id: "cashier-1", name: "Casey Cashier", role: "cashier" as const };

function CurrentSearch() {
  return <output>{useLocation().search}</output>;
}

describe("live notification log", () => {
  beforeEach(() => vi.mocked(listNotificationLogs).mockResolvedValue({
    data: [{
      id: "notification-1",
      studentId: "student-1",
      studentNo: "SAMPLE-8001",
      studentName: "Casey Sample Student",
      paymentId: "payment-1",
      channel: "email",
      recipient: "guardian@example.test",
      type: "payment_confirmation",
      status: "queued",
      attempts: 1,
      failureReason: null,
      loadFeeCents: null,
      createdAt: "2026-10-24T10:00:00Z",
      sentAt: null,
    }],
    currentPage: 1,
    lastPage: 1,
    total: 1,
    perPage: 10,
  }));

  it("shows persisted attempts and applies delivery and student filters", async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><LiveNotificationLog user={cashier} /><CurrentSearch /></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByText("Casey Sample Student")).toBeInTheDocument();
    expect(screen.getByText(/does not confirm delivery/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "failed" } });
    fireEvent.change(screen.getByLabelText("Student name or number"), { target: { value: "SAMPLE-8001" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => expect(listNotificationLogs).toHaveBeenLastCalledWith({ status: "failed", student: "SAMPLE-8001", page: 1, perPage: 10 }));
    expect(screen.getByText("?status=failed&student=SAMPLE-8001")).toBeInTheDocument();
  });

  it("loads the failed filter from the consolidated notification workspace URL", async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={["/followup?view=notifications&status=failed"]}><LiveNotificationLog user={cashier} /></MemoryRouter></QueryClientProvider>);

    await waitFor(() => expect(listNotificationLogs).toHaveBeenCalledWith({ status: "failed", page: 1, perPage: 10 }));
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));
    expect(screen.getByLabelText("Status")).toHaveValue("failed");
  });
});
