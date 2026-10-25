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
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_USE_LIVE_API", "");
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
