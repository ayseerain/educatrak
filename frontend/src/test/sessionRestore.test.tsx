import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionProvider, useSession } from "@/auth/session";

function SessionStatus() {
  const { user, isRestoringSession, sessionRestoreError } = useSession();
  if (isRestoringSession) return <p role="status">Restoring session</p>;
  if (sessionRestoreError) return <p role="alert">{sessionRestoreError}</p>;
  return <p>{user?.name ?? "Signed out"}</p>;
}

describe("live session restoration", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DATA_SOURCE", "live");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("restores the authenticated account from the Laravel cookie session", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "user-1", fullName: "Casey Cashier", role: "cashier" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SessionProvider><SessionStatus /></SessionProvider>);

    expect(await screen.findByText("Casey Cashier")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me", expect.objectContaining({ credentials: "include" }));
  });

  it("returns to the signed-out state when the server has no session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthenticated." }),
    }));

    render(<SessionProvider><SessionStatus /></SessionProvider>);

    expect(await screen.findByText("Signed out")).toBeInTheDocument();
  });
});

describe("mock session restoration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the signed-in mock user after a refresh and drops an expired one", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "mock");
    const user = { id: "user-1", name: "Casey Cashier", role: "cashier" };
    window.sessionStorage.setItem("educatrak.mockSession", JSON.stringify({ user, expiresAt: Date.now() + 60_000 }));
    const { unmount } = render(<SessionProvider><SessionStatus /></SessionProvider>);
    expect(screen.getByText("Casey Cashier")).toBeInTheDocument();
    unmount();

    window.sessionStorage.setItem("educatrak.mockSession", JSON.stringify({ user, expiresAt: Date.now() - 1 }));
    render(<SessionProvider><SessionStatus /></SessionProvider>);
    expect(screen.getByText("Signed out")).toBeInTheDocument();
  });
});
