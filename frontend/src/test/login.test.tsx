import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SessionProvider } from "@/auth/session";
import { App } from "@/App";

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
      <MemoryRouter initialEntries={[initialPath]}>
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

afterEach(() => {
  vi.useRealTimers();
});

describe("LoginPage", () => {
  it("renders username and password login at /login", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toHaveFocus();
    expect(screen.getByLabelText("Password", { selector: "input" })).toBeInTheDocument();
    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
  });

  it("toggles password visibility from the login form", async () => {
    const user = userEvent.setup();
    renderApp();

    const passwordInput = screen.getByLabelText("Password", { selector: "input" });

    expect(passwordInput).toHaveAttribute("type", "password");
    expect(screen.queryByText(/show password/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show password/i }));

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();
    expect(screen.queryByText(/hide password/i)).not.toBeInTheDocument();
  });

  it("signs in with a valid mock account and opens the dashboard", async () => {
    renderApp();

    await fillLogin("sample.cashier", "SamplePass123!");

    await waitFor(() =>
      expect(screen.getByLabelText("Current path")).toHaveTextContent("/"),
    );
    expect(
      await screen.findByRole("heading", { name: /good day, casey cashier/i }),
    ).toBeInTheDocument();
  });

  it("signs out and returns to the login page", async () => {
    const user = userEvent.setup();
    renderApp();

    await fillLogin("sample.cashier", "SamplePass123!");
    await waitFor(() =>
      expect(screen.getByLabelText("Current path")).toHaveTextContent("/"),
    );

    await user.click(screen.getByRole("button", { name: /sign out/i }));

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
      submitLogin("sample.cashier", "SamplePass123!");
    });
    expect(screen.getByLabelText("Current path")).toHaveTextContent("/");

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(
      screen.getByRole("dialog", { name: /session expiring soon/i }),
    ).toHaveTextContent(/will sign you out in 1 second/i);

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
      submitLogin("sample.cashier", "SamplePass123!");
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

  it("signs out automatically when the session expires", async () => {
    vi.useFakeTimers();
    renderApp("/login", { sessionDurationMs: 3000, warningDurationMs: 1000 });

    await act(async () => {
      submitLogin("sample.cashier", "SamplePass123!");
    });
    expect(screen.getByLabelText("Current path")).toHaveTextContent("/");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/login");
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });
});
