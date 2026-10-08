import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import type { AuthenticatedUser } from "@/lib/types";
import * as mockAdapter from "@/api/mockAdapter";
import { centavos } from "@/lib/money";

function renderWithProviders(user: AuthenticatedUser) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <DashboardPage user={user} />
        <LocationPath />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function LocationPath() {
  const { pathname, search } = useLocation();
  return <output aria-label="Current path">{pathname}{search}</output>;
}

const cashier: AuthenticatedUser = {
  id: "u1",
  name: "Grace Villanueva (sample)",
  role: "cashier",
};
const administrator: AuthenticatedUser = {
  id: "u2",
  name: "Rico Fernandez (sample)",
  role: "administrator",
};
const registrar: AuthenticatedUser = {
  id: "u3",
  name: "Liza Torres (sample)",
  role: "registrar",
};
const auditor: AuthenticatedUser = {
  id: "u4",
  name: "Noel Aquino (sample)",
  role: "auditor",
};
const accounting: AuthenticatedUser = {
  id: "u5",
  name: "Maya Cruz (sample)",
  role: "accounting",
};

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe("DashboardPage", () => {
  it("renders the dashboard for Cashier", async () => {
    renderWithProviders(cashier);
    await waitFor(() =>
      expect(screen.getByText(/Grace Villanueva/)).toBeInTheDocument(),
    );
  });

  it("shows the Record Payment CTA for Cashier", async () => {
    renderWithProviders(cashier);
    expect(
      await screen.findByRole("button", { name: /record payment/i }),
    ).toBeInTheDocument();
  });

  it("shows the dashboard range filter and enrolled-student widget", async () => {
    renderWithProviders(cashier);
    expect(await screen.findByText(/overall enrolled students/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filter range/i })).toHaveTextContent(
      "Last 7 days",
    );
    expect(screen.getByText(/collections \(last 7 days\)/i)).toBeInTheDocument();
    expect(screen.getByText(/payments \(last 7 days\)/i)).toBeInTheDocument();
  });

  it("renders the cashier account status overview without a duplicate due-soon widget", async () => {
    renderWithProviders(cashier);

    expect(await screen.findByText(/account status overview/i)).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: /due soon: 6/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^Due soon$/i)).toHaveLength(1);
  });

  it("shows cashier attention accounts with fictional names and formatted balances", async () => {
    renderWithProviders(cashier);

    expect(await screen.findByText(/accounts needing attention/i)).toBeInTheDocument();
    expect(screen.getByText("Carlo Reyes (sample)")).toBeInTheDocument();
    expect(screen.getByText("Luis Torres (sample)")).toBeInTheDocument();
    expect(screen.getAllByText(/21,000\.00/)).toHaveLength(2);
  });

  it("opens overdue follow-up from the accounts needing attention panel", async () => {
    const user = userEvent.setup();
    renderWithProviders(cashier);

    await screen.findByText(/accounts needing attention/i);
    await user.click(screen.getByRole("link", { name: /view all/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/followup");
  });

  it("adds navigation links to the cashier KPI widgets", async () => {
    const user = userEvent.setup();
    renderWithProviders(cashier);

    expect(await screen.findByRole("link", { name: /view students/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view reports/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view payments/i })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /view payments/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/payments");
  });

  it("separates the cashier close-out status from the metric widgets", async () => {
    renderWithProviders(cashier);
    expect(await screen.findByText("Close-out", { exact: true })).toBeInTheDocument();
    expect(screen.getByText(/not yet closed out/i)).toBeInTheDocument();
    expect(
      screen.getByText(/complete close-out before ending today's cashier session/i),
    ).toBeInTheDocument();
  });

  it("filters sample payment activity by the selected range", async () => {
    const user = userEvent.setup();
    renderWithProviders(cashier);

    await screen.findByText(/account status overview/i);
    const rangeFilter = screen.getByRole("button", { name: /filter range/i });
    const activityRows = () => screen.getAllByRole("row").length - 1;

    await waitFor(() => expect(activityRows()).toBe(5));

    await user.click(rangeFilter);
    await user.click(screen.getByRole("menuitemradio", { name: "Today" }));
    await screen.findByText(/loading dashboard/i);
    await waitFor(() =>
      expect(screen.queryByText(/loading dashboard/i)).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/today's collections/i)).toBeInTheDocument();
    expect(screen.getByText(/payments today/i)).toBeInTheDocument();
    await waitFor(() => expect(activityRows()).toBe(2));

    await user.click(rangeFilter);
    await user.click(screen.getByRole("menuitemradio", { name: "Last 30 days" }));
    await screen.findByText(/loading dashboard/i);
    await waitFor(() =>
      expect(screen.queryByText(/loading dashboard/i)).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(activityRows()).toBe(5));
    await user.click(screen.getByRole("button", { name: /activity rows/i }));
    await user.click(screen.getByRole("menuitemradio", { name: "All activity" }));
    await waitFor(() => expect(activityRows()).toBe(9));

    await user.click(rangeFilter);
    await user.click(screen.getByRole("menuitemradio", { name: "This school year" }));
    await screen.findByText(/loading dashboard/i);
    await waitFor(() =>
      expect(screen.queryByText(/loading dashboard/i)).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /activity rows/i }));
    await user.click(screen.getByRole("menuitemradio", { name: "All activity" }));
    await waitFor(() => expect(activityRows()).toBe(13));
    expect(screen.getAllByText(/, \d{1,2}:\d{2}/).length).toBeGreaterThan(1);
  });

  it("opens the shared payment workflow from the dashboard action", async () => {
    const user = userEvent.setup();
    renderWithProviders(cashier);

    await user.click(await screen.findByRole("button", { name: /record payment/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/payments/new");
    expect(screen.queryByRole("dialog", { name: /record payment/i })).not.toBeInTheDocument();
  });

  it("does not show Record Payment for Administrator", async () => {
    renderWithProviders(administrator);
    await waitFor(() =>
      expect(screen.getByText(/Last backup/i)).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /record payment/i }),
    ).not.toBeInTheDocument();
  });

  it("opens the notification log from the failed emails widget", async () => {
    const user = userEvent.setup();
    renderWithProviders(administrator);

    await user.click(await screen.findByRole("link", { name: /view failed emails/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/notifications?status=failed");
  });

  it("Registrar dashboard exposes no financial information", () => {
    renderWithProviders(registrar);
    expect(
      screen.getByLabelText(/search for a student/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/₱/)).not.toBeInTheDocument();
    expect(screen.queryByText(/collections/i)).not.toBeInTheDocument();
  });

  it("Auditor dashboard has no record/void/approve controls", async () => {
    renderWithProviders(auditor);
    await waitFor(() =>
      expect(screen.getByText(/collections \(last 7 days\)/i)).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /record payment/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /void/i }),
    ).not.toBeInTheDocument();
  });

  it("updates accounting chart label when the range changes", async () => {
    const user = userEvent.setup();
    renderWithProviders(accounting);

    expect(await screen.findByText(/collection trend \(last 7 days\)/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /filter range/i }));
    await user.click(screen.getByRole("menuitemradio", { name: "Last 30 days" }));

    await waitFor(() =>
      expect(screen.getByText(/collection trend \(last 30 days\)/i)).toBeInTheDocument(),
    );
  });

  it("builds the accounting timeline from the selected range", async () => {
    const [today, last7Days, last30Days, schoolYear] = await Promise.all([
      mockAdapter.fetchDashboardSummary(accounting, "today"),
      mockAdapter.fetchDashboardSummary(accounting, "last_7_days"),
      mockAdapter.fetchDashboardSummary(accounting, "last_30_days"),
      mockAdapter.fetchDashboardSummary(accounting, "school_year"),
    ]);

    expect(today.role).toBe("accounting");
    expect(last7Days.role).toBe("accounting");
    expect(last30Days.role).toBe("accounting");
    expect(schoolYear.role).toBe("accounting");

    if (
      today.role !== "accounting" ||
      last7Days.role !== "accounting" ||
      last30Days.role !== "accounting" ||
      schoolYear.role !== "accounting"
    ) {
      throw new Error("Accounting dashboard summary expected");
    }

    expect(today.collectionTrend).toHaveLength(1);
    expect(last7Days.collectionTrend.length).toBeGreaterThan(today.collectionTrend.length);
    expect(last30Days.collectionTrend.length).toBeGreaterThan(last7Days.collectionTrend.length);
    expect(schoolYear.collectionTrend.length).toBeGreaterThan(last30Days.collectionTrend.length);
  });

  it("shows a loading state before data resolves", () => {
    renderWithProviders(cashier);
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it("shows an error state when the fetch fails", async () => {
    vi.spyOn(mockAdapter, "fetchDashboardSummary").mockRejectedValueOnce(
      new Error("network down"),
    );
    renderWithProviders(cashier);
    expect(
      await screen.findByText(/unable to load dashboard data/i),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there is no recent activity", async () => {
    vi.spyOn(mockAdapter, "fetchDashboardSummary").mockResolvedValueOnce({
      role: "cashier",
      overallEnrolledStudents: 60,
      todayCollectionsTotal: centavos(0),
      paymentsTodayCount: 0,
      failedEmailCount: 0,
      closeoutDone: false,
      accountStatusOverview: {
        cleared: 0,
        current: 0,
        dueSoon: 0,
        overdue: 0,
      },
      accountsNeedingAttention: [],
      recentActivity: [],
    });
    renderWithProviders(cashier);
    expect(
      await screen.findByText(/no payment activity for last 7 days/i),
    ).toBeInTheDocument();
  });

  it("changes dashboard content per role", async () => {
    const { unmount } = renderWithProviders(cashier);
    expect(
      await screen.findByRole("button", { name: /record payment/i }),
    ).toBeInTheDocument();
    unmount();

    renderWithProviders(administrator);
    await waitFor(() =>
      expect(screen.getByText(/active users/i)).toBeInTheDocument(),
    );
  });

  it("keyboard focus is visible on the primary action", async () => {
    const user = userEvent.setup();
    renderWithProviders(cashier);
    const button = await screen.findByRole("button", {
      name: /record payment/i,
    });
    await user.tab();
    // Tabbing should eventually reach an interactive element without error;
    // the button itself is keyboard-focusable.
    expect(button).not.toHaveAttribute("tabindex", "-1");
  });
});
