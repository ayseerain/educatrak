import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { listAuditEntries } from "@/api/auditApi";
import { LiveAdminLog } from "@/features/operations/LiveAdminLog";

vi.mock("@/api/auditApi", () => ({
  listAuditEntries: vi.fn().mockResolvedValue({ data: [], currentPage: 1, lastPage: 1, total: 0 }),
}));

describe("live Administrator security log", () => {
  beforeEach(() => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_USE_LIVE_API", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("shows persisted security events while hiding unapproved detail keys", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{
        id: "event-1",
        action: "user.updated",
        entityType: "App\\Models\\User",
        entityId: "target-1",
        account: "fictional.cashier",
        accountName: "Casey Cashier (sample)",
        actorName: "Morgan Admin (sample)",
        details: { role: "cashier", active: true, password: "must-not-display" },
        occurredAt: "2026-10-24T08:00:00Z",
      }], meta: { currentPage: 1, lastPage: 1, total: 1 } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><LiveAdminLog /></QueryClientProvider>);

    expect(await screen.findByText("Account updated")).toBeInTheDocument();
    expect(screen.getByText(/Casey Cashier.*fictional.cashier/)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Actor" })).toBeInTheDocument();
    expect(screen.getByText("Morgan Admin (sample)")).toBeInTheDocument();
    expect(screen.getByText("role: cashier · active: true")).toBeInTheDocument();
    expect(screen.queryByText("must-not-display")).not.toBeInTheDocument();
  });

  it("keeps the Administrator log focused on security events", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], meta: { currentPage: 1, lastPage: 1, total: 0 } }),
    }));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LiveAdminLog /></QueryClientProvider>);

    expect(await screen.findByRole("heading", { name: "Security" })).toBeInTheDocument();
    expect(await screen.findByText("No security events are recorded.")).toBeInTheDocument();
    expect(listAuditEntries).not.toHaveBeenCalled();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("submits user, action, and date filters to the security-events API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], meta: { currentPage: 1, lastPage: 1, total: 0 } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LiveAdminLog /></QueryClientProvider>);

    await screen.findByText("No security events are recorded.");
    await user.type(screen.getByLabelText("User"), "fictional.admin");
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    await user.type(screen.getByLabelText("Action"), "auth.login");
    await user.type(screen.getByLabelText("From"), "2026-10-24");
    await user.type(screen.getByLabelText("To"), "2026-10-25");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/admin/security-events?user=fictional.admin&action=auth.login&date_from=2026-10-24&date_to=2026-10-25"),
      expect.objectContaining({ credentials: "include" }),
    ));
  });
});
