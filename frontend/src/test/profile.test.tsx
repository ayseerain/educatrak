import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider } from "@/auth/session";
import { ProfilePage } from "@/features/operations/OperationalPages";
import type { AuthenticatedUser } from "@/lib/types";

const cashier: AuthenticatedUser = {
  id: "user-1",
  name: "Casey Cashier (sample)",
  role: "cashier",
  lastLoginAt: "2026-10-24T08:00:00Z",
};

describe("profile password change", () => {
  beforeEach(() => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_USE_LIVE_API", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("submits to the authenticated API and displays the server login time", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/auth/me") return jsonResponse({ data: { id: "user-1", fullName: cashier.name, role: "cashier", lastLoginAt: cashier.lastLoginAt } });
      if (url === "/sanctum/csrf-cookie") return jsonResponse({}, 204);
      if (url === "/api/auth/change-password") {
        expect(JSON.parse(String(init?.body))).toEqual({
          current_password: "CurrentPass123!",
          password: "lowercasepass",
          password_confirmation: "lowercasepass",
        });
        return jsonResponse({ data: { id: "user-1", fullName: cashier.name, role: "cashier", lastLoginAt: cashier.lastLoginAt } });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<MemoryRouter><SessionProvider><ProfilePage user={cashier} /></SessionProvider></MemoryRouter>);

    expect(screen.getByText(cashier.name)).toBeInTheDocument();
    expect(screen.getByText(/Role: Cashier/)).toBeInTheDocument();
    expect(screen.getByText(/Last login:/)).toHaveTextContent("Oct 24, 2026");
    await user.type(screen.getByLabelText("Current password"), "CurrentPass123!");
    await user.type(screen.getByLabelText("New password"), "lowercasepass");
    await user.type(screen.getByLabelText("Confirm new password"), "lowercasepass");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Password changed successfully.");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/auth/change-password", expect.objectContaining({ method: "POST" })));
  });

  it.each([
    [{ id: "profile-super-admin", name: "Morgan Super Admin", role: "super_admin", lastLoginAt: cashier.lastLoginAt }, "Super Admin"],
    [{ id: "profile-cashier", name: "Casey Cashier", role: "cashier", lastLoginAt: cashier.lastLoginAt }, "Cashier"],
    [{ id: "profile-accounting", name: "Avery Accounting", role: "accounting", lastLoginAt: cashier.lastLoginAt }, "Accounting Officer"],
    [{ id: "profile-admin", name: "Alex Administrator", role: "administrator", lastLoginAt: cashier.lastLoginAt }, "Administrator"],
    [{ id: "profile-auditor", name: "Ari Auditor", role: "auditor", lastLoginAt: cashier.lastLoginAt }, "Auditor"],
    [{ id: "profile-registrar", name: "Rory Registrar", role: "registrar", lastLoginAt: cashier.lastLoginAt }, "Registrar"],
  ] as const)("shows the authenticated %s user's own profile fields", async (profile, roleLabel) => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/auth/me") {
        return jsonResponse({ data: { id: profile.id, fullName: profile.name, role: profile.role, lastLoginAt: profile.lastLoginAt } });
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = { ...profile } as AuthenticatedUser;

    const view = render(<MemoryRouter><SessionProvider><ProfilePage user={user} /></SessionProvider></MemoryRouter>);

    expect(await screen.findByText(profile.name)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Role: ${roleLabel}`))).toBeInTheDocument();
    expect(screen.getByText(/Last login:/)).toHaveTextContent("Oct 24, 2026");
    view.unmount();
  });
});

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
