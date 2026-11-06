import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveFollowupPage } from "@/features/followup/LiveFollowupPage";

const cashier = { id: "cashier-1", name: "Cashier", role: "cashier" as const };

describe("live installment follow-up", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders server data and applies the selected status filter", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{
          id: "installment-1",
          studentId: "student-1",
          studentNo: "SAMPLE-5001",
          studentName: "Avery Sample Student",
          grade: "Grade 4",
          section: "Orchid",
          schoolYear: "SY 2026-2027",
          installment: "October sample installment",
          dueDate: "2026-10-20",
          amountDueCents: 7_500,
          daysOverdue: 4,
          status: "overdue",
          guardians: [{ name: "Casey Sample Guardian", email: "guardian@example.test", mobile: null, emailStatus: "ok" }],
          lastReminderAt: null,
        }],
        meta: { currentPage: 1, lastPage: 1, total: 1, perPage: 50, today: "2026-10-24" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><MemoryRouter><LiveFollowupPage user={cashier} /></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByText("Avery Sample Student")).toBeInTheDocument();
    expect(screen.queryByText("Follow-up list")).not.toBeInTheDocument();
    expect(screen.getByText("guardian@example.test")).toBeInTheDocument();
    expect(screen.getByText("Not recorded")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Print list" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Overdue" }));
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/follow-up?status=overdue&sort=days_overdue&direction=asc&page=1&per_page=10", expect.objectContaining({ credentials: "include" })));
  });

  it("sends only selected eligible installments from the current page", async () => {
    vi.stubEnv("VITE_REMINDER_DELIVERY_ENABLED", "true");
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return { ok: true, status: 202, json: async () => ({ data: [], summary: { queued: 1, failed: 0, notSent: 0 } }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: "eligible-1", studentId: "student-1", studentNo: "SAMPLE-5001", studentName: "Avery Sample Student", grade: "Grade 4", section: "Orchid", schoolYear: "SY 2026-2027", installment: "October sample installment", dueDate: "2026-10-20", amountDueCents: 7500, daysOverdue: 4, status: "overdue", guardians: [{ name: "Casey Sample Guardian", email: "guardian@example.test", mobile: "09990000000", emailStatus: "verified" }], lastReminderAt: null },
            { id: "no-contact-2", studentId: "student-2", studentNo: "SAMPLE-5002", studentName: "Jamie Sample Student", grade: "Grade 4", section: "Orchid", schoolYear: "SY 2026-2027", installment: "October sample installment", dueDate: "2026-10-20", amountDueCents: 7500, daysOverdue: 4, status: "overdue", guardians: [], lastReminderAt: null },
          ],
          meta: { currentPage: 1, lastPage: 1, total: 2, perPage: 10, today: "2026-10-24" },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><MemoryRouter><LiveFollowupPage user={cashier} /></MemoryRouter></QueryClientProvider>);

    await screen.findByText("Avery Sample Student");
    expect(screen.queryByText("Jamie Sample Student")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all eligible on current page" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send reminders (1)" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/follow-up/reminders", expect.objectContaining({ method: "POST" })));
    const sendCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(sendCall?.[1]?.body))).toEqual(expect.objectContaining({ installment_ids: ["eligible-1"], channels: ["email", "sms"] }));
    expect(await screen.findByText(/1 queued, 0 failed, 0 not sent/i)).toBeInTheDocument();
  });

  it("keeps reminder controls hidden until delivery is enabled", async () => {
    vi.stubEnv("VITE_REMINDER_DELIVERY_ENABLED", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], meta: { currentPage: 1, lastPage: 1, total: 0, perPage: 50, today: "2026-10-24" } }),
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><MemoryRouter><LiveFollowupPage user={cashier} /></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByRole("status")).toHaveTextContent("Reminder sending is unavailable until delivery policies are approved.");
    expect(screen.queryByRole("button", { name: /Send reminders/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Select all eligible on current page" })).not.toBeInTheDocument();
  });
});
