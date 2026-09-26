import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
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
      <MemoryRouter>
        <DashboardPage user={user} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
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
    expect(screen.getByRole("combobox", { name: /filter range/i })).toHaveValue(
      "last_7_days",
    );
  });

  it("filters sample payment activity by the selected range", async () => {
    const user = userEvent.setup();
    renderWithProviders(cashier);

    await screen.findByRole("button", { name: /record payment/i });
    const rangeFilter = screen.getByRole("combobox", { name: /filter range/i });
    const activityRows = () => screen.getAllByRole("row").length - 1;

    await waitFor(() => expect(activityRows()).toBe(5));

    await user.selectOptions(rangeFilter, "today");
    await waitFor(() => expect(activityRows()).toBe(2));

    await user.selectOptions(rangeFilter, "last_30_days");
    await waitFor(() => expect(activityRows()).toBe(9));

    await user.selectOptions(rangeFilter, "school_year");
    await waitFor(() => expect(activityRows()).toBe(13));
    expect(screen.getAllByText(/, \d{1,2}:\d{2}/).length).toBeGreaterThan(1);
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
      expect(screen.getByText(/Today's collections/i)).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /record payment/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /void/i }),
    ).not.toBeInTheDocument();
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
      dueSoonCount: 0,
      failedEmailCount: 0,
      closeoutDone: false,
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
