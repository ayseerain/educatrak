import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LiveVoidsPage } from "@/features/operations/LiveVoidsPage";
import type { AuthenticatedUser } from "@/lib/types";

const accounting: AuthenticatedUser = { id: "accounting-1", name: "Avery Accounting (sample)", role: "accounting" };
const administrator: AuthenticatedUser = { id: "administrator-1", name: "Alex Administrator (sample)", role: "administrator" };

describe("live void approval queue", () => {
  beforeEach(() => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_USE_LIVE_API", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("loads persisted requests and posts an Accounting decision with a note", async () => {
    let approved = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/void-requests" && !init?.method) return jsonResponse({ data: [approved ? { ...request(), status: "approved", decision_note: "Verified duplicate receipt." } : request()] });
      if (url === "/sanctum/csrf-cookie") return jsonResponse({}, 204);
      if (url === "/api/void-requests/void-1") {
        expect(init?.method).toBe("PATCH");
        expect(JSON.parse(String(init?.body))).toEqual({ decision: "approved", decision_note: "Verified duplicate receipt." });
        approved = true;
        return jsonResponse({ data: { ...request(), status: "approved", decision_note: "Verified duplicate receipt." } });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(<QueryClientProvider client={queryClient}><LiveVoidsPage user={accounting} /></QueryClientProvider>);

    expect(await screen.findByText("OR-2026-001042")).toBeInTheDocument();
    expect(screen.getByText("Duplicate entry during handover")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Approve" }));
    await user.type(screen.getByLabelText("Decision note"), "Verified duplicate receipt.");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.getByText("approved")).toBeInTheDocument());
    expect(screen.getByText("Verified duplicate receipt.")).toBeInTheDocument();
  });

  it("shows Administrator void history without decision controls", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/void-requests") return jsonResponse({ data: [request()] });
      throw new Error(`Unexpected request: ${String(input)}`);
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><LiveVoidsPage user={administrator} /></QueryClientProvider>);

    expect(await screen.findByRole("heading", { name: "Void request history" })).toBeInTheDocument();
    expect(await screen.findByText("OR-2026-001042")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });
});

function request() {
  return {
    id: "void-1",
    payment_id: "payment-1",
    receipt_no: "OR-2026-001042",
    amount_cents: 200000,
    reason: "Duplicate entry during handover",
    status: "pending",
    requested_by: "Casey Cashier (sample)",
    requested_at: "2026-10-24T08:00:00Z",
    decision_note: null,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
