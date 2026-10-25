import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SessionProvider } from "@/auth/session";
import { App } from "@/App";

function CurrentPath() {
  const location = useLocation();
  return <output aria-label="Current path">{location.pathname}</output>;
}

describe("forced first-login password change", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DATA_SOURCE", "live");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("blocks protected routes until the Laravel password change succeeds", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/auth/me") {
        return jsonResponse({ data: { id: "user-1", fullName: "Casey Cashier (sample)", role: "cashier", mustChangePassword: true } });
      }
      if (url === "/sanctum/csrf-cookie") return jsonResponse({}, 204);
      if (url === "/api/auth/change-password") {
        expect(JSON.parse(String(init?.body))).toEqual({
          current_password: "TempPass123!",
          password: "longpassword",
          password_confirmation: "longpassword",
        });
        return jsonResponse({ data: { id: "user-1", fullName: "Casey Cashier (sample)", role: "cashier", mustChangePassword: false } });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={["/"]}><SessionProvider><App /><CurrentPath /></SessionProvider></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByRole("heading", { name: "New password" })).toBeInTheDocument();
    expect(screen.getByLabelText("Current temporary password")).toBeInTheDocument();
    const currentPassword = screen.getByLabelText("Current temporary password");
    const newPassword = screen.getByLabelText("New password");
    const confirmation = screen.getByLabelText("Confirm new password");
    const submit = screen.getByRole("button", { name: "Save new password" });
    expect(currentPassword).toHaveFocus();
    await user.tab();
    expect(newPassword).toHaveFocus();
    await user.tab();
    expect(confirmation).toHaveFocus();
    await user.tab();
    expect(submit).toHaveFocus();

    await user.type(screen.getByLabelText("Current temporary password"), "TempPass123!");
    await user.type(screen.getByLabelText("New password"), "longpassword");
    await user.type(screen.getByLabelText("Confirm new password"), "longpassword");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    await waitFor(() => expect(screen.getByLabelText("Current path")).toHaveTextContent("/"));
    expect(screen.queryByRole("heading", { name: "New password" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/change-password", expect.objectContaining({ method: "POST" }));
  });

  it("shows the Laravel current-password error and stays on first login", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/me") return jsonResponse({ data: { id: "user-1", fullName: "Casey Cashier (sample)", role: "cashier", mustChangePassword: true } });
      if (url === "/sanctum/csrf-cookie") return jsonResponse({}, 204);
      if (url === "/api/auth/change-password") return jsonResponse({
        message: "The current password is incorrect.",
        errors: { current_password: ["The current password is incorrect."] },
      }, 422);
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={["/"]}><SessionProvider><App /><CurrentPath /></SessionProvider></MemoryRouter></QueryClientProvider>);

    await screen.findByRole("heading", { name: "New password" });
    await user.type(screen.getByLabelText("Current temporary password"), "WrongTempPass123!");
    await user.type(screen.getByLabelText("New password"), "longpassword");
    await user.type(screen.getByLabelText("Confirm new password"), "longpassword");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The current password is incorrect.");
    expect(screen.getByLabelText("Current path")).toHaveTextContent("/first-login");
  });

  it("shows the minimum-length rule and does not send a short password to the API", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/me") return jsonResponse({ data: { id: "user-1", fullName: "Casey Cashier (sample)", role: "cashier", mustChangePassword: true } });
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={["/"]}><SessionProvider><App /></SessionProvider></MemoryRouter></QueryClientProvider>);

    await screen.findByRole("heading", { name: "New password" });
    await user.type(screen.getByLabelText("Current temporary password"), "TempPass123!");
    const newPassword = screen.getByLabelText("New password");
    await user.type(newPassword, "short");
    await user.type(screen.getByLabelText("Confirm new password"), "short");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(screen.getByRole("alert")).toHaveTextContent("use at least 12 characters");
    expect(fetchMock).not.toHaveBeenCalledWith("/api/auth/change-password", expect.anything());
  });
});

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
