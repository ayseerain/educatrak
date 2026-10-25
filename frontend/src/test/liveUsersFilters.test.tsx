import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiveUsersPage } from "@/features/operations/LiveUsersPage";
import type { AuthenticatedUser } from "@/lib/types";

const { listStaffUsers } = vi.hoisted(() => ({ listStaffUsers: vi.fn() }));
vi.mock("@/api/staffApi", () => ({
  listStaffUsers,
  archiveStaffUser: vi.fn(), createStaffUser: vi.fn(), resetStaffUserPassword: vi.fn(), restoreStaffUser: vi.fn(), updateStaffUser: vi.fn(),
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
    await screen.findByRole("heading", { name: "User administration" });
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
    await screen.findByRole("heading", { name: "User administration" });
    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.getByRole("option", { name: "Super Admin" })).toBeInTheDocument();
  });
});
