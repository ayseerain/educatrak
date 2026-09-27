import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SessionProvider } from "@/auth/session";
import { App } from "@/App";

function renderApp(initialPath = "/login") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <SessionProvider>
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

async function fillLogin(username: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/username/i), username);
  await user.type(screen.getByLabelText(/password/i), password);
  await user.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("LoginPage", () => {
  it("renders username and password login at /login", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toHaveFocus();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
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
    await user.type(screen.getByLabelText(/password/i), "wrong-password");

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await user.click(screen.getByRole("button", { name: /sign in/i }));
    }

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /account locked\. try again in 5 minutes/i,
    );
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
  });
});
