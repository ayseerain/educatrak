import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiveUsersPage } from "@/features/operations/LiveUsersPage";
import type { AuthenticatedUser } from "@/lib/types";

const { listStaffUsers, archiveStaffUser, resetStaffUserPassword, updateStaffUser } = vi.hoisted(() => ({ listStaffUsers: vi.fn(), archiveStaffUser: vi.fn(), resetStaffUserPassword: vi.fn(), updateStaffUser: vi.fn() }));
vi.mock("@/api/staffApi", () => ({
  listStaffUsers,
  archiveStaffUser, resetStaffUserPassword, updateStaffUser, createStaffUser: vi.fn(), restoreStaffUser: vi.fn(),
}));

function renderUsers(user: AuthenticatedUser) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><LiveUsersPage user={user} /></QueryClientProvider>);
}

describe("role scoped user filters", () => {
  beforeEach(() => listStaffUsers.mockResolvedValue({ data: [], currentPage: 1, lastPage: 1, total: 0, perPage: 10 }));

  it("applies the Administrator's status filter and keeps archive view separate", async () => {
    const user = userEvent.setup();
    renderUsers({ id: "admin-1", name: "Alex Sample Administrator", role: "administrator" });
    await screen.findByRole("heading", { name: "Users" });
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(screen.getByRole("button", { name: "Filter users by status" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Inactive" }));
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(listStaffUsers).toHaveBeenLastCalledWith(expect.objectContaining({ status: "inactive", page: 1 })));
    await user.click(screen.getByRole("tab", { name: "Archived users" }));
    await waitFor(() => expect(listStaffUsers).toHaveBeenLastCalledWith(expect.objectContaining({ status: "archived", page: 1 })));
    expect(screen.queryByRole("button", { name: "Filter users by status" })).not.toBeInTheDocument();
  });

  it("includes the protected role in the Super Admin's read filter", async () => {
    const user = userEvent.setup();
    renderUsers({ id: "super-1", name: "Jordan Sample Super Admin", role: "super_admin" });
    await screen.findByRole("heading", { name: "Users" });
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(screen.getByRole("button", { name: "Filter users by role" }));
    expect(screen.getByRole("menuitemradio", { name: "Super Admin" })).toBeInTheDocument();
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
    expect(within(editDialog).queryByRole("button", { name: "Reset password" })).not.toBeInTheDocument();
    expect(within(editDialog).queryByRole("button", { name: "Deactivate account" })).not.toBeInTheDocument();
    expect(within(editDialog).queryByRole("button", { name: "Reactivate account" })).not.toBeInTheDocument();
    const archiveButton = within(editDialog).getByRole("button", { name: "Archive account" });
    expect(archiveButton.parentElement).toHaveClass("flex", "justify-end", "gap-3");
    await user.click(archiveButton);
    const archiveDialog = screen.getByRole("dialog", { name: "Archive account?" });
    expect(archiveDialog).toBeVisible();
    expect(archiveDialog).toHaveClass("w-[min(520px,calc(100vw-2rem))]", "p-8", "shadow-2xl");
    expect(archiveDialog).toHaveTextContent(/restored for 30 days/);
    expect(document.querySelector(".backdrop-blur-sm")).toBeInTheDocument();
    await user.click(within(archiveDialog).getByRole("button", { name: "Archive account" }));

    await waitFor(() => expect(archiveStaffUser).toHaveBeenCalledWith("cashier-1", expect.anything()));
  });

  it("keeps account-state changes separate from edit and password-reset actions", async () => {
    const user = userEvent.setup();
    const staffUser = {
      id: "cashier-1", username: "sample.cashier", fullName: "Riley Sample", email: null,
      role: "cashier" as const, active: true, archivedAt: null, anonymizeAt: null,
      archivedBy: null, isProtected: false, mustChangePassword: false, lastLoginAt: null,
    };
    listStaffUsers.mockResolvedValue({ data: [staffUser], currentPage: 1, lastPage: 1, total: 1, perPage: 10 });
    updateStaffUser.mockResolvedValue({ ...staffUser, active: false });
    resetStaffUserPassword.mockResolvedValue({ user: staffUser, temporaryPassword: "ResetPassword123!" });
    renderUsers({ id: "admin-1", name: "Alex Sample Administrator", role: "administrator" });

    await screen.findByRole("button", { name: "Edit" });
    expect(screen.getByRole("button", { name: "Reset password" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    const resetDialog = await screen.findByRole("dialog", { name: "Password reset" });
    expect(within(resetDialog).getByText("ResetPassword123!")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Manage user account" })).not.toBeInTheDocument();
    await user.click(within(resetDialog).getByRole("button", { name: "Done" }));
    await user.click(screen.getByRole("button", { name: "Deactivate account" }));

    const confirmation = screen.getByRole("dialog", { name: "Deactivate account?" });
    expect(confirmation).toHaveClass("w-[min(520px,calc(100vw-2rem))]", "p-8", "shadow-2xl");
    expect(document.querySelector(".backdrop-blur-sm")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(updateStaffUser).toHaveBeenCalledWith("cashier-1", { active: false }));
  });

  it("requires confirmation before reactivating an inactive account", async () => {
    const user = userEvent.setup();
    const staffUser = {
      id: "cashier-1", username: "sample.cashier", fullName: "Riley Sample", email: null,
      role: "cashier" as const, active: false, archivedAt: null, anonymizeAt: null,
      archivedBy: null, isProtected: false, mustChangePassword: false, lastLoginAt: null,
    };
    listStaffUsers.mockResolvedValue({ data: [staffUser], currentPage: 1, lastPage: 1, total: 1, perPage: 10 });
    updateStaffUser.mockResolvedValue({ ...staffUser, active: true });
    renderUsers({ id: "admin-1", name: "Alex Sample Administrator", role: "administrator" });

    await user.click(await screen.findByRole("button", { name: "Reactivate account" }));
    expect(screen.getByRole("dialog", { name: "Reactivate account?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reactivate" }));
    await waitFor(() => expect(updateStaffUser).toHaveBeenCalledWith("cashier-1", { active: true }));
  });
});
