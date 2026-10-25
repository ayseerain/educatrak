import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listNotificationLogs, retryNotification } from "@/api/notificationApi";
import { LiveNotificationLog } from "@/features/operations/LiveNotificationLog";

vi.mock("@/api/notificationApi", () => ({ listNotificationLogs: vi.fn(), retryNotification: vi.fn() }));

const cashier = { id: "cashier-1", name: "Casey Cashier", role: "cashier" as const };

function CurrentSearch() {
  return <output>{useLocation().search}</output>;
}

describe("live notification log", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_REMINDER_DELIVERY_ENABLED", "");
    vi.mocked(listNotificationLogs).mockResolvedValue({
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
    });
  });
  afterEach(() => vi.unstubAllEnvs());

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

  it("keeps retry unavailable while the delivery switch is off", async () => {
    vi.mocked(listNotificationLogs).mockResolvedValue({
      data: [{
        id: "notification-failed",
        studentId: "student-1",
        studentNo: "SAMPLE-8001",
        studentName: "Casey Sample Student",
        paymentId: null,
        channel: "email",
        recipient: "guardian@example.test",
        type: "reminder",
        status: "failed",
        attempts: 1,
        failureReason: "Provider unavailable.",
        loadFeeCents: null,
        createdAt: "2026-10-24T10:00:00Z",
        sentAt: null,
      }],
      currentPage: 1,
      lastPage: 1,
      total: 1,
      perPage: 10,
    });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><LiveNotificationLog user={cashier} /></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByRole("status")).toHaveTextContent("Reminder retry is unavailable until delivery policies are approved.");
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(retryNotification).not.toHaveBeenCalled();
  });

  it("shows retry only when delivery is enabled", async () => {
    vi.stubEnv("VITE_REMINDER_DELIVERY_ENABLED", "true");
    vi.mocked(listNotificationLogs).mockResolvedValue({
      data: [{
        id: "notification-failed",
        studentId: "student-1",
        studentNo: "SAMPLE-8001",
        studentName: "Casey Sample Student",
        paymentId: null,
        channel: "email",
        recipient: "guardian@example.test",
        type: "reminder",
        status: "failed",
        attempts: 1,
        failureReason: "Provider unavailable.",
        loadFeeCents: null,
        createdAt: "2026-10-24T10:00:00Z",
        sentAt: null,
      }],
      currentPage: 1,
      lastPage: 1,
      total: 1,
      perPage: 10,
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(retryNotification).mockResolvedValue({ data: {
      id: "notification-failed",
      studentId: "student-1",
      studentNo: "SAMPLE-8001",
      studentName: "Casey Sample Student",
      paymentId: null,
      channel: "email",
      recipient: "guardian@example.test",
      type: "reminder",
      status: "queued",
      attempts: 2,
      failureReason: null,
      loadFeeCents: null,
      createdAt: "2026-10-24T10:00:00Z",
      sentAt: null,
    } });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><LiveNotificationLog user={cashier} /></MemoryRouter></QueryClientProvider>);

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(vi.mocked(retryNotification).mock.calls[0]?.[0]).toBe("notification-failed"));
  });
});
