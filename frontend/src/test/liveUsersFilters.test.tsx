import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiveUsersPage } from "@/features/operations/LiveUsersPage";
import type { AuthenticatedUser } from "@/lib/types";

const { listStaffUsers, archiveStaffUser } = vi.hoisted(() => ({ listStaffUsers: vi.fn(), archiveStaffUser: vi.fn() }));
vi.mock("@/api/staffApi", () => ({
  listStaffUsers,
  archiveStaffUser, createStaffUser: vi.fn(), resetStaffUserPassword: vi.fn(), restoreStaffUser: vi.fn(), updateStaffUser: vi.fn(),
}));

function renderUsers(user: AuthenticatedUser) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><LiveUsersPage user={user} /></QueryClientProvider>);
}

describe("role scoped user filters", () => {
  beforeEach(() => listStaffUsers.mockResolvedValue({ data: [], currentPage: 1, lastPage: 1, total: 0, perPage: 10 }));

  it("shows only roles an Administrator may inspect and keeps archive view separate from status filtering", async () => {
    const user = userEvent.setup();
    renderUsers({ id: "admin-1", name: "Alex Sample Administrator", role: "administrator" });
    await screen.findByRole("heading", { name: "Users" });
    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.queryByRole("option", { name: "Super Admin" })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter users by status" }), "inactive");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(listStaffUsers).toHaveBeenLastCalledWith(expect.objectContaining({ status: "inactive", page: 1 })));
    await user.click(screen.getByRole("tab", { name: "Archived users" }));
    await waitFor(() => expect(listStaffUsers).toHaveBeenLastCalledWith(expect.objectContaining({ status: "archived", page: 1 })));
    expect(screen.queryByRole("combobox", { name: "Filter users by status" })).not.toBeInTheDocument();
  });

  it("includes the protected role in the Super Admin's read filter", async () => {
    const user = userEvent.setup();
    renderUsers({ id: "super-1", name: "Jordan Sample Super Admin", role: "super_admin" });
    await screen.findByRole("heading", { name: "Users" });
    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.getByRole("option", { name: "Super Admin" })).toBeInTheDocument();
  });

  it("keeps the edit dialog scrollable and lets an administrator archive a user from it", async () => {
    const user = userEvent.setup();
    const staffUser = {
      id: "cashier-1", username: "sample.cashier", fullName: "Riley Sample", email: null,
      role: "cashier" as const, active: true, archivedAt: null, anonymizeAt: null,
      archivedBy: null, isProtected: false, mustChangePassword: false, lastLoginAt: null,
    };
    listStaffUsers.mockResolvedValue({ data: [staffUser], currentPage: 1, lastPage: 1, total: 1, perPage: 10 });
    archiveStaffUser.mockResolvedValue({ ...staffUser, active: false, archivedAt: "2026-10-25T00:00:00.000Z", anonymizeAt: "2026-11-24T00:00:00.000Z" });
    renderUsers({ id: "admin-1", name: "Alex Sample Administrator", role: "administrator" });

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const editDialog = screen.getByRole("dialog", { name: "Manage user account" });
    expect(editDialog).toHaveClass("max-h-[90dvh]", "overflow-y-auto");
    await user.click(screen.getByRole("button", { name: "Archive account" }));
    expect(screen.getByText(/restored for 30 days/)).toBeInTheDocument();
    const confirmButtons = screen.getAllByRole("button", { name: "Archive account" });
    await user.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() => expect(archiveStaffUser).toHaveBeenCalledWith("cashier-1", expect.anything()));
  });

  it("makes the deactivation confirmation stand out from the edit dialog", async () => {
    const user = userEvent.setup();
    const staffUser = {
      id: "cashier-1", username: "sample.cashier", fullName: "Riley Sample", email: null,
      role: "cashier" as const, active: true, archivedAt: null, anonymizeAt: null,
      archivedBy: null, isProtected: false, mustChangePassword: false, lastLoginAt: null,
    };
    listStaffUsers.mockResolvedValue({ data: [staffUser], currentPage: 1, lastPage: 1, total: 1, perPage: 10 });
    renderUsers({ id: "admin-1", name: "Alex Sample Administrator", role: "administrator" });

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Deactivate account" }));

    const confirmation = screen.getByRole("dialog", { name: "Deactivate account?" });
    expect(confirmation).toHaveClass("w-[min(520px,calc(100vw-2rem))]", "p-8", "shadow-2xl");
    expect(document.querySelector(".backdrop-blur-sm")).toBeInTheDocument();
  });
});
