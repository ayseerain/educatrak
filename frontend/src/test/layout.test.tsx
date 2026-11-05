import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Shell } from "@/components/layout/Shell";
import { getMockState, getMockToday, resetMockStore } from "@/api/mock";

const cashier = { id: "cashier-1", name: "Casey Cashier", role: "cashier" as const };

describe("application sidebar", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
      },
    });
  });

  it("collapses to labeled icon links and remembers the preference", () => {
    const { unmount } = render(
      <MemoryRouter>
        <Shell user={cashier} onLogout={() => undefined} onRoleChange={() => undefined}>
          <p>Workspace</p>
        </Shell>
      </MemoryRouter>,
    );

    const sidebar = screen.getByRole("navigation", { name: "Primary" });
    const brand = screen.getByText("EducaTrak").parentElement?.parentElement;
    const toggle = within(sidebar).getByRole("button", { name: "Collapse sidebar" });

    expect(brand?.nextElementSibling).toBe(toggle);
    expect(toggle).toHaveClass("ml-auto");

    fireEvent.click(toggle);

    expect(sidebar).toHaveClass("md:w-16");
    expect(screen.getByRole("link", { name: "Students" })).toHaveAttribute("title", "Students");
    expect(within(sidebar).getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
    expect(window.localStorage.getItem("educatrak.sidebar.collapsed")).toBe("true");

    unmount();
    render(
      <MemoryRouter>
        <Shell user={cashier} onLogout={() => undefined} onRoleChange={() => undefined}>
          <p>Workspace</p>
        </Shell>
      </MemoryRouter>,
    );
    expect(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });

  it("shows a Cashier the development-only test date and time control in the top bar", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_DATA_SOURCE", "live");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/close-outs/business-date" && !init?.method) return jsonResponse({ data: { business_date: "2026-11-05", business_datetime: "2026-11-05T09:00:00+08:00", simulated_at: null } });
      if (url === "/sanctum/csrf-cookie") return jsonResponse({}, 204);
      if (url === "/api/close-outs/business-date" && init?.method === "POST") return jsonResponse({ data: { business_date: "2026-11-06", business_datetime: "2026-11-06T13:30:00+08:00", simulated_at: "2026-11-06T13:30:00+08:00" } });
      if (url === "/api/close-outs/business-date" && init?.method === "DELETE") return jsonResponse({ data: { business_date: "2026-11-05", business_datetime: "2026-11-05T09:00:00+08:00", simulated_at: null } });
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<MemoryRouter><Shell user={cashier} onLogout={() => undefined} onRoleChange={() => undefined}><p>Workspace</p></Shell></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Test date & time" }));
    expect(await screen.findByRole("heading", { name: "Test business date & time" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Test date and time")).toHaveValue("2026-11-05T09:00"));
    fireEvent.change(screen.getByLabelText("Test date and time"), { target: { value: "2026-11-06T13:30" } });
    await user.click(screen.getByRole("button", { name: "Apply test date & time" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/close-outs/business-date", expect.objectContaining({ method: "POST", body: JSON.stringify({ business_datetime: "2026-11-06T13:30" }) })));
    await user.click(screen.getByRole("button", { name: "Reset actual date & time" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/close-outs/business-date", expect.objectContaining({ method: "DELETE" }));
  });

  it("uses a MockDB date override without rebuilding payment records", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_DATA_SOURCE", "mock");
    const user = userEvent.setup();
    const paymentIds = getMockState().payments.map((payment) => payment.id);
    render(<MemoryRouter><Shell user={cashier} onLogout={() => undefined} onRoleChange={() => undefined}><p>Workspace</p></Shell></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Test date & time" }));
    fireEvent.change(await screen.findByLabelText("Test date and time"), { target: { value: "2026-11-06T13:30" } });
    await user.click(screen.getByRole("button", { name: "Apply test date & time" }));
    expect(getMockToday()).toBe("2026-11-06");
    expect(getMockState().payments.map((payment) => payment.id)).toEqual(paymentIds);
    expect(screen.getByText("A test date and time is active.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset actual date & time" }));
    expect(getMockToday()).not.toBe("2026-11-06");
  });

  afterEach(() => {
    resetMockStore();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
