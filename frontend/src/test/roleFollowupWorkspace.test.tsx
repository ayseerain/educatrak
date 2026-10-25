import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { RoleFollowupWorkspace } from "@/features/followup/RoleFollowupWorkspace";

const cashier = { id: "cashier-1", name: "Cashier", role: "cashier" as const };
const accounting = { id: "accounting-1", name: "Accounting", role: "accounting" as const };

vi.mock("@/features/followup/LiveFollowupPage", () => ({
  LiveFollowupPage: ({ workspaceSwitch }: { workspaceSwitch?: ReactNode }) => <>{workspaceSwitch}<div>Follow-up content</div></>,
}));

vi.mock("@/features/operations/LiveNotificationLog", () => ({
  LiveNotificationLog: ({ workspaceSwitch }: { workspaceSwitch?: ReactNode }) => <>{workspaceSwitch}<div>Notification history content</div></>,
}));

beforeAll(() => vi.stubEnv("PROD", true));
afterEach(() => vi.stubEnv("PROD", true));
afterAll(() => vi.unstubAllEnvs());

describe.each([["Cashier", cashier], ["Accounting", accounting]] as const)("%s combined workspace", (_roleName, user) => {
  it("keeps follow-ups and notifications under one workspace selector", async () => {
    const interaction = userEvent.setup();
    render(<MemoryRouter><RoleFollowupWorkspace user={user} /></MemoryRouter>);

    expect(screen.getByText("Follow-up content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Follow-up" })).toHaveAttribute("aria-pressed", "true");
    await interaction.click(screen.getByRole("button", { name: "Notification log" }));

    expect(screen.getByText("Notification history content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notification log" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens the notification view directly from a notification link", () => {
    render(<MemoryRouter initialEntries={["/followup?view=notifications"]}><RoleFollowupWorkspace user={user} /></MemoryRouter>);

    expect(screen.getByText("Notification history content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notification log" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the selected view synchronized with browser Back and Forward", async () => {
    const interaction = userEvent.setup();
    window.history.replaceState({}, "", "/followup");
    render(<BrowserRouter><RoleFollowupWorkspace user={user} /></BrowserRouter>);

    await interaction.click(screen.getByRole("button", { name: "Notification log" }));
    expect(await screen.findByText("Notification history content")).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe("?view=notifications"));

    act(() => window.history.back());
    await waitFor(() => expect(screen.getByRole("button", { name: "Follow-up" })).toHaveAttribute("aria-pressed", "true"));
    expect(window.location.search).toBe("");

    act(() => window.history.forward());
    await waitFor(() => expect(screen.getByRole("button", { name: "Notification log" })).toHaveAttribute("aria-pressed", "true"));
    expect(window.location.search).toBe("?view=notifications");
  });

  it("keeps the notification view reachable through the combined workspace in development", () => {
    vi.stubEnv("PROD", false);
    render(<MemoryRouter initialEntries={["/followup?view=notifications&status=failed"]}><RoleFollowupWorkspace user={user} /></MemoryRouter>);

    expect(screen.getByRole("button", { name: "Notification log" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("cell", { name: /failed/i })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: /queued/i })).not.toBeInTheDocument();
  });
});
