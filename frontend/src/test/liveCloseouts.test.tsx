import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LiveCloseOutHistory, LiveDailyCloseOut } from "@/features/operations/LiveCloseouts";
import type { AuthenticatedUser } from "@/lib/types";

const cashier: AuthenticatedUser = { id: "cashier-1", name: "Taylor Sample Cashier", role: "cashier" };

describe("live daily close-out", () => {
  beforeEach(() => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_USE_LIVE_API", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("loads the server cash total and locks a submitted variance with its reason", async () => {
    let submitted = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/close-outs/today" && !init?.method) return jsonResponse({ data: { business_date: "2026-10-24", system_cash_cents: 10000, close_out: submitted ? closeOut() : null } });
      if (url === "/sanctum/csrf-cookie") return jsonResponse({}, 204);
      if (url === "/api/close-outs") {
        expect(JSON.parse(String(init?.body))).toEqual({ counted_cash_cents: 12050, variance_reason: "Drawer overage found during recount." });
        submitted = true;
        return jsonResponse({ data: closeOut() }, 201);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(<QueryClientProvider client={queryClient}><LiveDailyCloseOut user={cashier} /></QueryClientProvider>);

    expect(await screen.findByText("₱100.00")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Counted cash"), "120.50");
    await user.type(screen.getByLabelText("Variance explanation *"), "Drawer overage found during recount.");
    await user.click(screen.getByRole("button", { name: "Review close-out" }));
    expect(screen.getByText(/submits and locks the close-out/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm and lock" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Today's close-out is locked.");
    expect(screen.getByRole("button", { name: "Print summary" })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/close-outs", expect.objectContaining({ method: "POST" })));
  });

  it("lets Accounting print available close-out history while read-only roles cannot", async () => {
    const accounting: AuthenticatedUser = { id: "accounting-1", name: "Avery Sample Accountant", role: "accounting" };
    const administrator: AuthenticatedUser = { id: "admin-1", name: "Alex Sample Admin", role: "administrator" };
    const fetchMock = vi.fn(async () => jsonResponse({ data: [closeOut()] }));
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const accountingView = render(<QueryClientProvider client={queryClient}><LiveCloseOutHistory user={accounting} /></QueryClientProvider>);
    expect(await screen.findByRole("button", { name: "Print summary" })).toBeInTheDocument();
    accountingView.unmount();

    queryClient.clear();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LiveCloseOutHistory user={administrator} /></QueryClientProvider>);
    expect(await screen.findByText("Unsigned")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Print summary" })).not.toBeInTheDocument();
  });

  it("shows a cashier's own history in the same close-out workspace", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/close-outs/today") return jsonResponse({ data: { business_date: "2026-10-24", system_cash_cents: 10000, close_out: null } });
      if (url === "/api/close-outs") return jsonResponse({ data: [] });
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(<QueryClientProvider client={queryClient}><LiveDailyCloseOut user={cashier} /></QueryClientProvider>);

    expect(await screen.findByLabelText("Counted cash")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "History" }));
    expect(await screen.findByRole("heading", { name: "Close-out history" })).toBeInTheDocument();
    expect(await screen.findByText("No close-outs have been submitted.")).toBeInTheDocument();
  });
});

function closeOut() {
  return {
    id: "closeout-1",
    business_date: "2026-10-24",
    cashier: "Casey Cashier (sample)",
    system_cash_cents: 10000,
    counted_cash_cents: 12050,
    variance_cents: 2050,
    variance_reason: "Drawer overage found during recount.",
    submitted_at: "2026-10-24T09:00:00Z",
    signed_off_at: null,
    signed_off_by: null,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
