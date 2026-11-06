import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { CollectionTrend } from "@/features/dashboard/components/CollectionTrend";
import { AdminDashboard } from "@/features/dashboard/components/AdminDashboard";
import type { AuthenticatedUser } from "@/lib/types";
import * as mockAdapter from "@/api/mockAdapter";
import { centavos } from "@/lib/money";
import { billingAccounts, payments } from "@/api/mock";

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

function activityCountInRange(range: "today" | "last_7_days" | "last_30_days") {
  const now = new Date();
  const offsetMs = 8 * 60 * 60 * 1000;
  const manilaNow = new Date(now.getTime() + offsetMs);
  const dayStart = Date.UTC(
    manilaNow.getUTCFullYear(),
    manilaNow.getUTCMonth(),
    manilaNow.getUTCDate(),
  ) - offsetMs;
  const days = range === "today" ? 1 : range === "last_7_days" ? 7 : 30;
  const cutoff = dayStart - (days - 1) * 24 * 60 * 60 * 1000;
  return payments.filter(
    (payment) => Date.parse(`${payment.paidOn}T12:00:00+08:00`) >= cutoff,
  ).length;
}

function trendDaysInRange(range: "today" | "last_7_days" | "last_30_days") {
  const now = new Date();
  const offsetMs = 8 * 60 * 60 * 1000;
  const manilaNow = new Date(now.getTime() + offsetMs);
  const dayStart = Date.UTC(
    manilaNow.getUTCFullYear(),
    manilaNow.getUTCMonth(),
    manilaNow.getUTCDate(),
  ) - offsetMs;
  const days = range === "today" ? 1 : range === "last_7_days" ? 7 : 30;
  const cutoff = dayStart - (days - 1) * 24 * 60 * 60 * 1000;
  return new Set(
    payments
      .filter(
        (payment) =>
          payment.status !== "Voided" &&
          Date.parse(`${payment.paidOn}T12:00:00+08:00`) >= cutoff,
      )
      .map((payment) => payment.paidOn),
  ).size;
}

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
  it("uses the same collection-trend bar sizing for all filter ranges", () => {
    const points = [
      { date: "2026-10-20", totalCollected: centavos(12500) },
      { date: "2026-10-21", totalCollected: centavos(24000) },
      { date: "2026-10-22", totalCollected: centavos(18000) },
    ];
    const { container, rerender } = render(
      <CollectionTrend points={points} range="today" />,
    );
    const barPaths = () =>
      Array.from(container.querySelectorAll(".recharts-bar-rectangle")).map((bar) =>
        bar.getAttribute("d"),
      );
    const todayBars = barPaths();

    rerender(<CollectionTrend points={points} range="last_7_days" />);
    const last7DayBars = barPaths();

    rerender(<CollectionTrend points={points} range="last_30_days" />);
    const last30DayBars = barPaths();

    expect(todayBars).toHaveLength(points.length);
    expect(todayBars).toEqual(last7DayBars);
    expect(todayBars).toEqual(last30DayBars);
  });

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

  it("keeps Cashier dashboard actions in one place without a duplicate workspace panel", async () => {
    renderWithProviders(cashier);

    expect(await screen.findByRole("button", { name: /record payment/i })).toBeInTheDocument();
    await screen.findByRole("link", { name: /view payments/i });
    expect(screen.getByLabelText(/cashier workspace dashboard/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view students/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /view payments/i })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /review close-out/i })).toBeInTheDocument();
  });

  it("defaults Cashier to today's collections and keeps other ranges available", async () => {
    renderWithProviders(cashier);
    expect(await screen.findByText(/accounts needing attention/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filter range/i })).toHaveTextContent(
      "Today",
    );
    expect(screen.getByText(/today's collections/i)).toBeInTheDocument();
    expect(screen.getByText(/payments today/i)).toBeInTheDocument();
  });

  it("keeps the cashier follow-up queue separate from its due-soon KPI", async () => {
    renderWithProviders(cashier);

    expect(await screen.findByText(/accounts needing attention/i)).toBeInTheDocument();
    expect(screen.getByText(/accounts due soon/i)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("shows cashier attention accounts with names and balances from shared billing records", async () => {
    renderWithProviders(cashier);

    expect(await screen.findByText(/accounts needing attention/i)).toBeInTheDocument();
    const summary = await mockAdapter.fetchDashboardSummary(cashier, "today");
    if (summary.role !== "cashier") throw new Error("Cashier dashboard summary expected");
    for (const account of summary.accountsNeedingAttention.slice(0, 2)) {
      expect(screen.getByText(account.studentName)).toBeInTheDocument();
      expect(screen.getByText(new RegExp((account.amountDue / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(".", "\\.")))).toBeInTheDocument();
    }
    for (const account of summary.accountsNeedingAttention.slice(2)) {
      expect(screen.queryByText(account.studentName)).not.toBeInTheDocument();
    }
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

    expect(await screen.findByRole("link", { name: /view payments/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /review close-out/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /review follow-ups/i })).toBeInTheDocument();

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

  it("filters shared billing payment activity by the selected range", async () => {
    const user = userEvent.setup();
    renderWithProviders(cashier);

    await screen.findByText(/accounts needing attention/i);
    const rangeFilter = screen.getByRole("button", { name: /filter range/i });
    const activityRows = () => Math.max(screen.queryAllByRole("row").length - 1, 0);

    await waitFor(() => expect(activityRows()).toBe(activityCountInRange("today")));

    await user.click(rangeFilter);
    await user.click(screen.getByRole("menuitemradio", { name: "Last 7 days" }));
    await screen.findByRole("button", { name: /activity rows/i });
    await waitFor(() => expect(activityRows()).toBe(activityCountInRange("last_7_days")));
    expect(screen.getByText(/collections \(last 7 days\)/i)).toBeInTheDocument();

    await user.click(rangeFilter);
    await user.click(screen.getByRole("menuitemradio", { name: "Today" }));
    await screen.findByRole("button", { name: /activity rows/i });
    expect(screen.getByText(/today's collections/i)).toBeInTheDocument();
    expect(screen.getByText(/payments today/i)).toBeInTheDocument();
    await waitFor(() => expect(activityRows()).toBe(activityCountInRange("today")));

    await user.click(rangeFilter);
    await user.click(screen.getByRole("menuitemradio", { name: "Last 30 days" }));
    await screen.findByRole("button", { name: /activity rows/i });
    await waitFor(() => expect(activityRows()).toBe(Math.min(activityCountInRange("last_30_days"), 5)));
    expect(screen.getByText(/collections \(last 30 days\)/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /activity rows/i }));
    await user.click(screen.getByRole("menuitemradio", { name: "All activity" }));
    await waitFor(() => expect(activityRows()).toBe(activityCountInRange("last_30_days")));

    await user.click(rangeFilter);
    await user.click(screen.getByRole("menuitemradio", { name: "This school year" }));
    await screen.findByRole("button", { name: /activity rows/i });
    await user.click(screen.getByRole("button", { name: /activity rows/i }));
    await user.click(screen.getByRole("menuitemradio", { name: "All activity" }));
    await waitFor(() => expect(activityRows()).toBe(11));
    expect(screen.getAllByText(/, \d{1,2}:\d{2}/).length).toBeGreaterThan(1);
  });

  it("opens the shared payment workflow from the dashboard action", async () => {
    const user = userEvent.setup();
    renderWithProviders(cashier);

    await user.click(await screen.findByRole("button", { name: /record payment/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/payments/new");
    expect(screen.queryByRole("dialog", { name: /record payment/i })).not.toBeInTheDocument();
  });

  it("distinguishes missing and unrecognized Administrator backup results", () => {
    const base = { role: "administrator" as const, activeUserCount: 2 };
    const { unmount } = render(<MemoryRouter><AdminDashboard summary={{ ...base, lastBackupAt: null, lastBackupSucceeded: null }} /></MemoryRouter>);
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("No backup record")).toBeInTheDocument();
    unmount();

    render(<MemoryRouter><AdminDashboard summary={{ ...base, lastBackupAt: "2026-10-24T03:00:00.000Z", lastBackupSucceeded: null }} /></MemoryRouter>);
    expect(screen.getByText("Result unavailable")).toBeInTheDocument();
  });
  it("does not show Record Payment for Administrator", async () => {
    renderWithProviders(administrator);
    await waitFor(() =>
      expect(screen.getByText(/Last backup/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /filter range/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /record payment/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the Administrator dashboard within system and account oversight", async () => {
    renderWithProviders(administrator);
    await waitFor(() => expect(screen.getByText(/Last backup/i)).toBeInTheDocument());
    expect(screen.getByText(/Active users/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view failed emails/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/failed emails/i)).not.toBeInTheDocument();
  });

  it("derives Administrator account and configuration context from the shared MockDB", async () => {
    const summary = await mockAdapter.fetchDashboardSummary(administrator, "last_7_days");
    expect(summary.role).toBe("administrator");
    if (summary.role !== "administrator") throw new Error("Administrator dashboard summary expected");

    expect(summary.staffAccounts?.active).toBe(summary.activeUserCount);
    expect(summary.staffAccounts?.byRole).toHaveLength(6);
    expect(summary.configuration?.schoolYear).toBe("SY 2026-2027");
    expect(summary.configuration?.gradeLevelCount).toBeGreaterThan(0);
    expect(summary.configuration?.paymentMethodCount).toBeGreaterThan(0);
  });

  it("keeps the Super Admin dashboard focused on governance without duplicate navigation panels", async () => {
    renderWithProviders({ id: "super-admin", name: "Morgan Super Admin", role: "super_admin" });
    await waitFor(() => expect(screen.getByLabelText(/system governance dashboard/i)).toBeInTheDocument());
    expect(await screen.findByRole("link", { name: "Users" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Audit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /record payment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /financial reports/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /filter range/i })).not.toBeInTheDocument();
  });

  it("Registrar dashboard exposes no financial information", () => {
    renderWithProviders(registrar);
    expect(
      screen.getByLabelText(/search for a student/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/₱/)).not.toBeInTheDocument();
    expect(screen.queryByText(/collections/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /registrar workspace/i })).not.toBeInTheDocument();
  });

  it("Auditor dashboard has no record/void/approve controls", async () => {
    renderWithProviders(auditor);
    await waitFor(() =>
      expect(screen.getByText(/recent audit activity/i)).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /record payment/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /void/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /go to reports/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/today's collections/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open audit/i })).toHaveAttribute("href", "/admin/audit-log");
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

    expect(today.collectionTrend).toHaveLength(trendDaysInRange("today"));
    expect(last7Days.collectionTrend).toHaveLength(trendDaysInRange("last_7_days"));
    expect(last30Days.collectionTrend).toHaveLength(trendDaysInRange("last_30_days"));
    expect(schoolYear.collectionTrend).toHaveLength(
      new Set(payments.filter((payment) => payment.status !== "Voided").map((payment) => payment.paidOn)).size,
    );
  });

  it("projects the canonical mock payments and reconciles account totals", async () => {
    const summary = await mockAdapter.fetchDashboardSummary(accounting, "school_year");
    expect(summary.role).toBe("accounting");
    if (summary.role !== "accounting") throw new Error("Accounting dashboard summary expected");

    expect(summary.recentActivity.map((payment) => payment.id)).toEqual(
      [...payments]
        .sort((first, second) => second.paidOn.localeCompare(first.paidOn))
        .map((payment) => payment.id),
    );
    for (const account of billingAccounts.filter((item) => item.schoolYear === "SY 2026-2027")) {
      const accountPayments = payments.filter(
        (payment) => payment.accountId === account.id && payment.status !== "Voided",
      );
      expect(accountPayments.reduce((total, payment) => total + payment.amount, 0)).toBe(
        account.totalPaid,
      );
      expect(accountPayments.every((payment) =>
        payment.allocations.reduce((total, allocation) => total + allocation.amount, 0) === payment.amount,
      )).toBe(true);
    }
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
      rangeCollectionsTotal: centavos(0),
      paymentsInRangeCount: 0,
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
      await screen.findByText(/no payment activity yet today/i),
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
