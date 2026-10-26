import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SessionProvider } from "@/auth/session";
import { MOCK_USERS } from "@/auth/mockSession";
import { App } from "@/App";
import { MockDatabaseProvider } from "@/api/mock/MockDatabaseProvider";
import { createMockStudent, resetMockStore } from "@/api/mock";

interface RenderAppOptions {
  sessionDurationMs?: number;
  warningDurationMs?: number;
}

function renderApp(initialPath = "/login", options: RenderAppOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <SessionProvider
          sessionDurationMs={options.sessionDurationMs}
          warningDurationMs={options.warningDurationMs}
        >
          <App />
          <LocationPath />
        </SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function LocationPath() {
  const { pathname } = useLocation();
  return <output aria-label="Current path">{pathname}</output>;
}

async function fillLogin(
  username: string,
  password: string,
  user = userEvent.setup(),
) {
  await user.type(screen.getByLabelText(/username/i), username);
  await user.type(screen.getByLabelText("Password", { selector: "input" }), password);
  await user.click(screen.getByRole("button", { name: /sign in/i }));
}

function submitLogin(username: string, password: string) {
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: username },
  });
  fireEvent.change(screen.getByLabelText("Password", { selector: "input" }), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

beforeEach(() => {
  resetMockStore();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("LoginPage", () => {
  it("renders username and password login at /login", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText(/use your educatrak account to continue/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Simplifying School Billing & Payments")).toHaveLength(2);
    const logos = screen.getAllByRole("img", { name: "Mendez Christian Academy seal" });
    expect(logos).toHaveLength(2);
    expect(logos.map((logo) => logo.getAttribute("src"))).toEqual([
      "/mendez-christian-academy-seal.png",
      "/mendez-christian-academy-seal.png",
    ]);
    const username = screen.getByLabelText(/username/i);
    const password = screen.getByLabelText("Password", { selector: "input" });
    expect(username).toHaveFocus();
    expect(username.parentElement?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(password.parentElement?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: /forgot password/i })).toBeInTheDocument();
  });

  it("supports sequential keyboard navigation through login controls", async () => {
    const user = userEvent.setup();
    renderApp();

    const username = screen.getByLabelText(/username/i);
    const password = screen.getByLabelText("Password", { selector: "input" });
    const visibility = screen.getByRole("button", { name: /show password/i });
    const submit = screen.getByRole("button", { name: /sign in/i });
    const forgotPassword = screen.getByRole("button", { name: /forgot password/i });

    expect(username).toHaveFocus();
    await user.tab();
    expect(password).toHaveFocus();
    await user.tab();
    expect(visibility).toHaveFocus();
    await user.tab();
    expect(submit).toHaveFocus();
    await user.tab();
    expect(forgotPassword).toHaveFocus();
  });

  it("explains the administrator-led password reset path", async () => {
    const user = userEvent.setup();
    renderApp();

    const forgotPassword = screen.getByRole("button", { name: /forgot password/i });
    expect(forgotPassword).toHaveAttribute("aria-expanded", "false");
    expect(forgotPassword.parentElement).toHaveClass("min-h-28");
    expect(screen.queryByText(/contact an administrator to reset your password/i)).not.toBeInTheDocument();

    await user.click(forgotPassword);

    expect(forgotPassword).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/contact an administrator to reset your password/i)).toBeInTheDocument();
  });

  it("toggles password visibility from the login form", async () => {
    const user = userEvent.setup();
    renderApp();

    const passwordInput = screen.getByLabelText("Password", { selector: "input" });
    const visibilityButton = screen.getByRole("button", { name: /show password/i });

    expect(passwordInput).toHaveAttribute("type", "password");
    expect(visibilityButton).toHaveClass("rounded-full", "focus-visible:outline-offset-[-2px]");
    expect(screen.queryByText(/show password/i)).not.toBeInTheDocument();

    await user.click(visibilityButton);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();
    expect(screen.queryByText(/hide password/i)).not.toBeInTheDocument();
  });

  it("signs in with a valid mock account and opens the dashboard", async () => {
    renderApp();

    await fillLogin("sample.cashier", "demo-cashier");

    await waitFor(() =>
      expect(screen.getByLabelText("Current path")).toHaveTextContent("/"),
    );
    expect(
      await screen.findByRole("heading", { name: /good day, casey cashier/i }),
    ).toBeInTheDocument();
  });

  it("keeps the mock session after a persisted MockDB update", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/login"]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <SessionProvider>
            <MockDatabaseProvider>
              <App />
              <LocationPath />
            </MockDatabaseProvider>
          </SessionProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByLabelText(/username/i);
    await fillLogin("sample.cashier", "demo-cashier", user);
    await waitFor(() => expect(screen.getByLabelText("Current path")).toHaveTextContent("/"));

    act(() => {
      createMockStudent({
        number: "MOCK-SESSION-REGRESSION",
        name: "Session Regression Student",
        grade: "Grade 7",
        section: "Olive",
        guardianName: "Session Regression Guardian",
        guardianRelationship: "Parent",
        guardianEmail: "",
        guardianMobile: "",
      });
    });

    await waitFor(() => expect(screen.getByLabelText("Current path")).toHaveTextContent("/"));
    expect(screen.queryByRole("heading", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it.each(Object.entries(MOCK_USERS))("signs in the seeded %s account", async (username, account) => {
    renderApp();

    await fillLogin(username, account.password);

    await waitFor(() => expect(screen.getByLabelText("Current path")).toHaveTextContent("/"));
    expect(await screen.findByRole("heading", { name: `Good day, ${account.user.name}` })).toBeInTheDocument();
  });

  it("switches mock roles from the header and returns to the role dashboard", async () => {
    const user = userEvent.setup();
    renderApp();

    await fillLogin("sample.cashier", "demo-cashier", user);
    await waitFor(() =>
      expect(screen.getByLabelText("Current path")).toHaveTextContent(/^\/$/),
    );
    expect(
      await screen.findByRole("heading", { name: /good day, casey cashier/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /preview role/i }));
    await user.click(screen.getByRole("menuitemradio", { name: /accounting/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent(/^\/$/);
    expect(
      await screen.findByRole("heading", { name: /good day, avery accounting/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Void requests" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /preview role/i }));
    await user.click(screen.getByRole("menuitemradio", { name: /registrar/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent(/^\/$/);
    expect(
      await screen.findByRole("heading", { name: /good day, riley registrar/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/search for a student/i)).toBeInTheDocument();
    expect(screen.queryByText(/collections/i)).not.toBeInTheDocument();
  });

  it("signs out and returns to the login page", async () => {
    const user = userEvent.setup();
    renderApp();

    await fillLogin("sample.cashier", "demo-cashier");
    await waitFor(() =>
      expect(screen.getByLabelText("Current path")).toHaveTextContent("/"),
    );

    await user.click(await screen.findByRole("button", { name: /sign out/i }));

    await waitFor(() =>
      expect(screen.getByLabelText("Current path")).toHaveTextContent("/login"),
    );
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows a generic failure message for invalid credentials", async () => {
    renderApp();

    await fillLogin("sample.cashier", "wrong-password");

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/we could not sign you in/i);
    expect(screen.getByLabelText("Current path")).toHaveTextContent("/login");
  });

  it("shows and enforces the server-provided retry interval for a 429 response", async () => {
    vi.stubEnv("VITE_USE_LIVE_API", "true");
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/sanctum/csrf-cookie")) return new Response(null, { status: 204 });
      if (url.endsWith("/api/auth/me")) {
        return new Response(JSON.stringify({ message: "Unauthenticated." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/api/auth/login")) {
        return new Response(JSON.stringify({ message: "Too many attempts." }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "60" },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    }));

    renderApp();
    await screen.findByLabelText(/username/i);
    await fillLogin("sample.cashier", "wrong-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(/account locked\. try again in 1 minute/i);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
  });

  it("shows the lockout wait time after repeated failed attempts", async () => {
    renderApp();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/username/i), "sample.cashier");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "wrong-password");

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await user.click(screen.getByRole("button", { name: /sign in/i }));
    }

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /account locked\. try again in 30 seconds/i,
    );
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
  });

  it("warns before session expiration and lets the user stay signed in", async () => {
    vi.useFakeTimers();
    renderApp("/login", { sessionDurationMs: 5000, warningDurationMs: 1000 });

    await act(async () => {
      submitLogin("sample.cashier", "demo-cashier");
    });
    expect(screen.getByLabelText("Current path")).toHaveTextContent("/");

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(
      screen.getByRole("dialog", { name: /session expiring soon/i }),
    ).toHaveTextContent(/will sign you out in 1 second/i);
    expect(screen.getByText(/would you like to stay signed in/i)).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /stay signed in/i }));
    });

    expect(
      screen.queryByRole("dialog", { name: /session expiring soon/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Current path")).toHaveTextContent("/");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(
      screen.queryByRole("dialog", { name: /session expiring soon/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps an active user signed in when they scroll before the timeout", async () => {
    vi.useFakeTimers();
    renderApp("/login", { sessionDurationMs: 5000, warningDurationMs: 1000 });

    await act(async () => {
      submitLogin("sample.cashier", "demo-cashier");
    });
    expect(screen.getByLabelText("Current path")).toHaveTextContent("/");

    act(() => {
      vi.advanceTimersByTime(3000);
      fireEvent.wheel(window);
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/");
    expect(
      screen.queryByRole("dialog", { name: /session expiring soon/i }),
    ).not.toBeInTheDocument();
  });

  it("renews the session when the user is active during the expiration warning", async () => {
    vi.useFakeTimers();
    renderApp("/login", { sessionDurationMs: 5000, warningDurationMs: 1000 });

    await act(async () => {
      submitLogin("sample.cashier", "demo-cashier");
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(
      screen.getByRole("dialog", { name: /session expiring soon/i }),
    ).toBeInTheDocument();

    act(() => {
      fireEvent.wheel(window);
    });

    expect(
      screen.queryByRole("dialog", { name: /session expiring soon/i }),
    ).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/");
  });

  it("signs out automatically when the session expires", async () => {
    vi.useFakeTimers();
    renderApp("/login", { sessionDurationMs: 3000, warningDurationMs: 1000 });

    await act(async () => {
      submitLogin("sample.cashier", "demo-cashier");
    });
    expect(screen.getByLabelText("Current path")).toHaveTextContent("/");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/login");
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });
});
