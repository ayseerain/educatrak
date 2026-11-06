import { describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { RoleFollowupWorkspace } from "@/features/followup/RoleFollowupWorkspace";
import { AccountDetailPage, AccountsPage, AccountWizardPage, AuditPage, CloseoutHistoryPage, CloseoutPage, FollowupPage, MockNotificationsPage, PaymentEntryPage, PaymentsPage, ReceiptPage, ReportsHubPage, RequireCapability, RolesPage, SettingsPage, StudentFormPage, StudentProfilePage, StudentStatementPage, StudentsPage, UsersPage } from "@/features/operations/OperationalPages";
import { getBillingAccount, getCurrentBillingAccount, getDueInstallments, getMockFeeSchedule, loadMockSnapshot, mockSnapshot } from "@/api/mock";
import { Sidebar } from "@/components/layout/Sidebar";
import { Shell } from "@/components/layout/Shell";
import { can, canViewReport } from "@/lib/permissions";
import type { AuthenticatedUser } from "@/lib/types";

const cashier: AuthenticatedUser = {
  id: "user-cashier",
  name: "Casey Cashier (sample)",
  role: "cashier",
};

const auditor: AuthenticatedUser = {
  id: "user-auditor",
  name: "Avery Auditor (sample)",
  role: "auditor",
};

const administrator: AuthenticatedUser = {
  id: "user-administrator",
  name: "Alex Administrator (sample)",
  role: "administrator",
};

const accounting: AuthenticatedUser = {
  id: "user-accounting",
  name: "Avery Accounting (sample)",
  role: "accounting",
};

const registrar: AuthenticatedUser = {
  id: "user-registrar",
  name: "Riley Registrar (sample)",
  role: "registrar",
};

const superAdmin: AuthenticatedUser = {
  id: "user-super-admin",
  name: "Morgan Super Admin (sample)",
  role: "super_admin",
};

function LocationPath() {
  const { pathname, search } = useLocation();
  return <output aria-label="Current path">{pathname}{search}</output>;
}

describe("operational page navigation", () => {
  it("separates read and manage settings access by the approved M9 roles", () => {
    expect(can(accounting, "settings.finance.view")).toBe(true);
    expect(can(accounting, "settings.finance.manage")).toBe(true);
    expect(can(accounting, "settings.system.view")).toBe(true);
    expect(can(accounting, "settings.system.manage")).toBe(false);

    expect(can(administrator, "settings.finance.view")).toBe(false);
    expect(can(administrator, "settings.finance.manage")).toBe(false);
    expect(can(administrator, "settings.system.view")).toBe(true);
    expect(can(administrator, "settings.system.manage")).toBe(true);

    expect(can(auditor, "settings.finance.view")).toBe(false);
    expect(can(auditor, "settings.finance.manage")).toBe(false);
    expect(can(auditor, "settings.system.view")).toBe(false);
    expect(can(auditor, "settings.system.manage")).toBe(false);
    expect(can(cashier, "settings.finance.view")).toBe(false);
    expect(can(registrar, "settings.system.view")).toBe(false);
    expect(can(superAdmin, "settings.finance.view")).toBe(false);
    expect(can(superAdmin, "settings.finance.manage")).toBe(false);
    expect(can(superAdmin, "settings.system.view")).toBe(false);
    expect(can(superAdmin, "settings.system.manage")).toBe(false);
  });

  it("shows the role matrix from the same capabilities used by interface guards", () => {
    render(<MemoryRouter><RolesPage /></MemoryRouter>);

    expect(screen.getByRole("columnheader", { name: "Accounting Officer" })).toBeInTheDocument();
    const paymentEntry = screen.getByRole("row", { name: /Payments Record payments/ });
    expect(within(paymentEntry).getAllByText("Allowed")).toHaveLength(1);
    expect(within(paymentEntry).getAllByText("Unavailable")).toHaveLength(5);

    const administratorVoidQueue = screen.getByRole("row", { name: /Payments Review payment voids/ });
    expect(within(administratorVoidQueue).getAllByText("Allowed")).toHaveLength(1);
    const receiptReprint = screen.getByRole("row", { name: /Receipts Reprint receipts/ });
    expect(within(receiptReprint).getAllByText("Allowed")).toHaveLength(2);
    const notificationRetry = screen.getByRole("row", { name: /Notifications Retry failed notifications/ });
    expect(within(notificationRetry).getAllByText("Allowed")).toHaveLength(1);
    expect(within(notificationRetry).getAllByText("Unavailable")).toHaveLength(5);
    expect(screen.queryByRole("row", { name: /Run student ledger import/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Download receipt PDFs/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Follow-up Print overdue follow-up list/ })).not.toBeInTheDocument();
    const closeoutHistory = screen.getByRole("row", { name: /Close-out View close-out history/ });
    expect(within(closeoutHistory).getAllByText("Allowed")).toHaveLength(2);
    expect(screen.getByText("Current interface access by role. The server enforces permissions for every request.")).toBeInTheDocument();
  });

  it("limits guardian contact access to roles with student record duties", () => {
    expect(can(administrator, "guardianContact.view")).toBe(false);
    expect(can(cashier, "guardianContact.view")).toBe(true);
    expect(can(accounting, "guardianContact.view")).toBe(true);
    expect(can(superAdmin, "guardianContact.view")).toBe(false);
    expect(can(auditor, "guardianContact.view")).toBe(false);
    expect(can(registrar, "guardianContact.view")).toBe(true);
  });

  it("uses the available workflow width for the student form", () => {
    render(<MemoryRouter><StudentFormPage /></MemoryRouter>);

    const form = screen.getByRole("button", { name: "Create student" }).closest("form");
    expect(form).toHaveClass("w-full");
    expect(form).not.toHaveClass("max-w-3xl");
  });

  it("shows enrollment status without allowing lifecycle changes", () => {
    const createForm = render(<MemoryRouter><StudentFormPage /></MemoryRouter>);

    expect(screen.getByRole("button", { name: "Enrollment status" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Enrollment status" })).toHaveTextContent("Active");
    createForm.unmount();

    render(<MemoryRouter initialEntries={["/students/sample-1004/edit"]}><Routes><Route path="/students/:id/edit" element={<StudentFormPage edit />} /></Routes></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Enrollment status" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Enrollment status" })).toHaveTextContent("Inactive");
  });

  it("routes to the created MockDB student record", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/students/new"]}>
        <Routes>
          <Route path="/students/new" element={<StudentFormPage />} />
          <Route path="/students/:id" element={<h1>Student profile</h1>} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/Student number/), "S-2000");
    await user.type(screen.getByLabelText(/Student name/), "Taylor Student");
    await user.click(screen.getByRole("button", { name: "Grade level" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Grade 7" }));
    await user.click(screen.getByRole("button", { name: "Section" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Olive" }));
    await user.click(screen.getByRole("button", { name: "Create student" }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent(/\/students\/mock-student-/);
    expect(screen.getByRole("heading", { name: "Student profile" })).toBeInTheDocument();
  });

  it("uses explicit button types for student and billing-account creation", () => {
    const studentForm = render(<MemoryRouter><StudentFormPage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Create student" })).toHaveAttribute("type", "submit");
    studentForm.unmount();

    render(<MemoryRouter><AccountWizardPage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute("type", "button");
    expect(screen.queryByRole("link", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("centers the account wizard at a balanced working width in both create and renewal flows", () => {
    const createFlow = render(<MemoryRouter><AccountWizardPage /></MemoryRouter>);
    expect(screen.getByTestId("account-wizard")).toHaveClass("mx-auto", "w-full", "max-w-5xl");
    createFlow.unmount();

    render(<MemoryRouter initialEntries={["/accounts/new?mode=renew"]}><AccountWizardPage /></MemoryRouter>);
    expect(screen.getByTestId("account-wizard")).toHaveClass("mx-auto", "w-full", "max-w-5xl");
  });

  it("limits student grade, section, and Senior High strand choices", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StudentFormPage /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Grade level" }));
    expect(screen.getAllByRole("menuitemradio").map((option) => option.textContent)).toEqual([
      "Select grade", "Kinder", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
      "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
    ]);
    await user.click(screen.getByRole("menuitemradio", { name: "Grade 11" }));

    expect(screen.getByRole("button", { name: "Section" })).toHaveTextContent("Select section");
    expect(screen.getByRole("button", { name: "Strand" })).toHaveTextContent("STEM");

    await user.click(screen.getByRole("button", { name: "Section" }));
    expect(screen.getAllByRole("menuitemradio").map((option) => option.textContent)).toEqual([
      "Select section", "Exodus", "Section B",
    ]);
    await user.click(screen.getByRole("menuitemradio", { name: "Exodus" }));

    await user.click(screen.getByRole("button", { name: "Strand" }));
    expect(screen.getAllByRole("menuitemradio").map((option) => option.textContent)).toEqual([
      "STEM", "ABM", "HUMSS", "TVL",
    ]);
    await user.click(screen.getByRole("menuitemradio", { name: "HUMSS" }));
    expect(screen.getByText("Student will be listed as Grade 11 - HUMSS Exodus.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Grade level" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Grade 8" }));
    expect(screen.getByRole("button", { name: "Section" })).toHaveTextContent("Select section");
    expect(screen.queryByRole("button", { name: "Strand" })).not.toBeInTheDocument();
  });

  it("aligns user state labels with the State column header", () => {
    render(<MemoryRouter><UsersPage /></MemoryRouter>);

    const stateHeader = screen.getByRole("columnheader", { name: "State" });
    const administratorRow = screen.getByRole("row", {
      name: /Alex Administrator \(sample\)/,
    });

    expect(stateHeader).toHaveClass("text-center");
    expect(within(administratorRow).getAllByRole("cell")[3]).toHaveClass("text-center");
  });

  it("shows all mock accounts permitted to the signed-in administrator and centers Actions", () => {
    const administratorUsers = render(<MemoryRouter><UsersPage user={administrator} /></MemoryRouter>);

    expect(screen.getAllByRole("row")).toHaveLength(6);
    expect(screen.getByText("Avery Accounting (sample)")).toBeInTheDocument();
    expect(screen.getByText("Arden Auditor (sample)")).toBeInTheDocument();
    expect(screen.getByText("Riley Registrar (sample)")).toBeInTheDocument();
    expect(screen.queryByText("Morgan Super Admin (sample)")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Actions" })).toHaveClass("text-center");
    expect(within(screen.getByRole("row", { name: /Alex Administrator \(sample\)/ })).getByRole("button", { name: "Edit" }).parentElement).toHaveClass("justify-center");
    administratorUsers.unmount();

    render(<MemoryRouter><UsersPage user={superAdmin} /></MemoryRouter>);
    expect(screen.getAllByRole("row")).toHaveLength(7);
    expect(screen.getByText("Morgan Super Admin (sample)")).toBeInTheDocument();
  });

  it("shows Security Events with an aligned Status column for administrators", () => {
    render(<MemoryRouter><AuditPage user={administrator} security /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Security events" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Outcome" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toHaveClass("text-center");
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => {
      const statusCell = within(row).getAllByRole("cell")[3];
      return statusCell?.classList.contains("text-center") ?? false;
    })).toBe(true);
    expect(screen.getByRole("cell", { name: "Sign-out" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Session ended by user" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Password reset" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "sample.cashier: Active -> Inactive" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "sample.cashier: Inactive -> Active" })).toBeInTheDocument();
  });

  it("aligns status heading and values on configuration pages", () => {
    for (const section of ["fees", "plans", "school", "receipt", "email"] as const) {
      const { unmount } = render(<MemoryRouter><SettingsPage section={section} editable /></MemoryRouter>);

      const statusHeader = screen.getByRole("columnheader", { name: "Status" });
      expect(statusHeader).toHaveClass("text-center");
      const statusIndex = screen.getAllByRole("columnheader").indexOf(statusHeader);
      const dataRows = screen.getAllByRole("row").slice(1);
      expect(dataRows.length).toBeGreaterThan(0);
      expect(dataRows.every((row) => {
        const cells = within(row).getAllByRole("cell");
        const statusCell = cells[statusIndex];
        return statusCell?.classList.contains("text-center");
      })).toBe(true);
      unmount();
    }
  });

  it("shows the shared status icon for every text status or state value", () => {
    render(<MemoryRouter><AuditPage user={auditor} /></MemoryRouter>);

    for (const label of ["Complete", "Review required", "Awaiting sign-off"]) {
      const cell = screen.getByRole("cell", { name: label });
      expect(cell.querySelector("svg")).not.toBeNull();
    }
  });

  it("lists current-year fee schedules from Kinder through Grade 12 in pages of ten", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SettingsPage section="fees" editable /></MemoryRouter>);

    expect(screen.getAllByRole("row")).toHaveLength(11);
    expect(screen.getAllByText("Kinder")).toHaveLength(3);
    expect(screen.queryAllByText("Grade 12")).toHaveLength(0);
    expect(screen.getByText("Showing 1–10 of 48 fee items")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next page" }));
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await user.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getAllByText("Grade 12")).toHaveLength(3);
    expect(screen.getAllByRole("row")).toHaveLength(11);
  });

  it("loads the configured K–12 grades in order and saves a fee only to its selected schedule", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SettingsPage section="fees" editable /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Add fee item" }));
    const dialog = screen.getByRole("dialog", { name: "Add fee item" });

    await user.click(within(dialog).getByRole("button", { name: "Grade level" }));
    expect(screen.getAllByRole("menuitemradio").map((option) => option.textContent)).toEqual([
      "Select grade level", "All grades", "Kinder", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
      "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
    ]);
    await user.click(screen.getByRole("menuitemradio", { name: "Grade 11" }));
    await user.type(within(dialog).getByLabelText("Fee item name"), "Laboratory fee");
    await user.click(within(dialog).getByRole("button", { name: "Category" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Other" }));
    await user.type(within(dialog).getByLabelText("Amount"), "500");
    await user.click(within(dialog).getByLabelText("Optional"));
    await user.click(within(dialog).getByRole("button", { name: "Save fee item" }));

    expect(screen.queryByRole("dialog", { name: "Add fee item" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Fee item saved for Grade 11");
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByRole("cell", { name: /Laboratory fee - Other - ₱500\.00 - Optional/ })).toBeInTheDocument();
    expect(getMockFeeSchedule("school-year-2026-2027", "Grade 11")).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Laboratory fee", amount: 50_000, required: false }),
    ]));
    expect(getMockFeeSchedule("school-year-2026-2027", "Grade 10")?.some((item) => item.name === "Laboratory fee") ?? false).toBe(false);
  });

  it("lets an Administrator add a current school year from Settings", async () => {
    const before = mockSnapshot();
    const user = userEvent.setup();
    render(<MemoryRouter><SettingsPage section="school" editable /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Add list item" }));
    const dialog = screen.getByRole("dialog", { name: "Add list item" });
    expect(within(dialog).getByText(/payment methods remain cash only/i)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("School year label"), "SY 2028-2029");
    await user.click(within(dialog).getByLabelText("Set SY 2028-2029 as current school year"));
    await user.click(within(dialog).getByRole("button", { name: "Add list item" }));

    expect(screen.queryByRole("dialog", { name: "Add list item" })).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "SY 2028-2029 current" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "SY 2026-2027" })).toBeInTheDocument();
    await act(async () => { loadMockSnapshot(before); });
  });

  it("makes a grade registered in School Settings available to the fee-item dropdown", async () => {
    const before = mockSnapshot();
    const user = userEvent.setup();
    const school = render(<MemoryRouter><SettingsPage section="school" editable /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Add list item" }));
    const schoolDialog = screen.getByRole("dialog", { name: "Add list item" });
    await user.selectOptions(within(schoolDialog).getByLabelText("List type"), "gradeLevel");
    await user.type(within(schoolDialog).getByLabelText("Name"), "Preparatory (sample)");
    await user.click(within(schoolDialog).getByRole("button", { name: "Add list item" }));
    expect(screen.getByRole("cell", { name: "Preparatory (sample)" })).toBeInTheDocument();
    school.unmount();

    render(<MemoryRouter><SettingsPage section="fees" editable /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Add fee item" }));
    await user.click(screen.getByRole("dialog", { name: "Add fee item" }).querySelector('[aria-label="Grade level"]')!);
    expect(screen.getByRole("menuitemradio", { name: "Preparatory (sample)" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await act(async () => { loadMockSnapshot(before); });
  });

  it("filters user administration rows by name or username", async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><UsersPage /></MemoryRouter>);

    const search = screen.getByRole("searchbox", { name: "Search users" });
    await user.type(search, "sample.cashier");
    expect(screen.getByText("Casey Cashier (sample)")).toBeInTheDocument();
    expect(screen.queryByText("Alex Administrator (sample)")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "riley");
    expect(screen.getByText("Riley Registrar (sample)")).toBeInTheDocument();
    expect(screen.queryByText("Casey Cashier (sample)")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "no matching user");
    expect(screen.getByRole("status")).toHaveTextContent("No users match that name or username.");
  });

  it("keeps mock user creation roles aligned with administrator assignment rules", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<MemoryRouter><UsersPage user={administrator} /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Create user" }));
    const administratorDialog = screen.getByRole("dialog", { name: "Create user" });
    await user.click(within(administratorDialog).getByRole("button", { name: "Primary role" }));
    expect(screen.getAllByRole("menuitemradio").map((option) => option.textContent)).toEqual([
      "Cashier", "Auditor", "Registrar",
    ]);
    await user.click(screen.getByRole("menuitemradio", { name: "Auditor" }));
    expect(within(administratorDialog).getByRole("button", { name: "Primary role" })).toHaveTextContent("Auditor");
    await user.type(within(administratorDialog).getByLabelText("Name"), "Jordan Example");
    await user.type(within(administratorDialog).getByLabelText("Username"), "jordan.example");
    await user.click(within(administratorDialog).getByRole("button", { name: "Create user" }));
    expect(within(administratorDialog).getByRole("status")).toHaveTextContent("User created.");
    await user.click(within(administratorDialog).getByRole("button", { name: "Done" }));
    const createdRow = screen.getByRole("row", { name: /Jordan Example/ });
    expect(within(createdRow).getByRole("cell", { name: "jordan.example" })).toBeInTheDocument();
    expect(within(createdRow).getByRole("cell", { name: "Auditor" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create user" }));
    const duplicateDialog = screen.getByRole("dialog", { name: "Create user" });
    await user.type(within(duplicateDialog).getByLabelText("Name"), "Another Example");
    await user.type(within(duplicateDialog).getByLabelText("Username"), "SAMPLE.CASHIER");
    await user.click(within(duplicateDialog).getByRole("button", { name: "Create user" }));
    expect(within(duplicateDialog).getByRole("alert")).toHaveTextContent("That username is already in use.");
    await user.click(within(duplicateDialog).getByRole("button", { name: "Cancel" }));
    expect(screen.getAllByRole("row", { name: /sample\.cashier/i })).toHaveLength(1);
    unmount();

    render(<MemoryRouter><UsersPage user={superAdmin} /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Create user" }));
    const superAdminDialog = screen.getByRole("dialog", { name: "Create user" });
    await user.click(within(superAdminDialog).getByRole("button", { name: "Primary role" }));
    expect(screen.getAllByRole("menuitemradio").map((option) => option.textContent)).toEqual([
      "Administrator", "Cashier", "Auditor", "Registrar",
    ]);
  });

  it("keeps profile and icon-only sign out in the sidebar for every role", () => {
    for (const user of [cashier, administrator, accounting, auditor, registrar]) {
      const shell = render(
        <MemoryRouter>
          <Shell user={user} onLogout={() => undefined} onRoleChange={() => undefined}>
            <p>Workspace</p>
          </Shell>
        </MemoryRouter>,
      );

      expect(screen.queryByRole("searchbox", { name: /search students, receipts/i })).not.toBeInTheDocument();
      const sidebar = screen.getByRole("navigation", { name: "Primary" });
      expect(within(sidebar).getByRole("button", { name: /open my profile/i })).toBeInTheDocument();
      const signOut = within(sidebar).getByRole("button", { name: /sign out/i });
      expect(signOut).toBeInTheDocument();
      expect(signOut).toHaveTextContent("");
      expect(signOut.querySelector("svg[aria-hidden='true']")).toBeInTheDocument();
      shell.unmount();
    }
  });

  it("provides separate MockDB user actions with archive and restore", async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><UsersPage /></MemoryRouter>);

    const cashierRow = screen.getByRole("row", { name: /Casey Cashier \(sample\)/ });
    expect(within(cashierRow).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(within(cashierRow).getByRole("button", { name: "Reset password" })).toBeInTheDocument();
    await user.click(within(cashierRow).getByRole("button", { name: "Reset password" }));
    const resetDialog = screen.getByRole("dialog", { name: "Password reset" });
    expect(within(resetDialog).getByRole("status")).toHaveTextContent("Password reset complete.");
    expect(within(resetDialog).getByText(/temporary password for casey cashier/i)).toBeInTheDocument();
    expect(within(resetDialog).getByText("SampleReset123!")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Edit user account" })).not.toBeInTheDocument();
    await user.click(within(resetDialog).getByRole("button", { name: "Done" }));

    await user.click(within(screen.getByRole("row", { name: /Casey Cashier \(sample\)/ })).getByRole("button", { name: "Deactivate account" }));
    expect(screen.getByRole("heading", { name: "Deactivate account?" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog", { name: "Deactivate account?" })).getByRole("button", { name: "Deactivate account" }));
    expect(within(screen.getByRole("row", { name: /Casey Cashier \(sample\)/ })).getByRole("button", { name: "Reactivate account" })).toBeInTheDocument();

    await user.click(within(screen.getByRole("row", { name: /Casey Cashier \(sample\)/ })).getByRole("button", { name: "Reactivate account" }));
    expect(screen.getByRole("heading", { name: "Reactivate account?" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog", { name: "Reactivate account?" })).getByRole("button", { name: "Reactivate account" }));

    await user.click(within(screen.getByRole("row", { name: /Casey Cashier \(sample\)/ })).getByRole("button", { name: "Edit" }));
    const editDialog = screen.getByRole("dialog", { name: "Edit user account" });
    expect(editDialog).toHaveClass("w-[min(32rem,calc(100vw-2rem))]");
    expect(within(editDialog).queryByRole("button", { name: "Reset password" })).not.toBeInTheDocument();
    expect(within(editDialog).queryByRole("button", { name: "Deactivate account" })).not.toBeInTheDocument();
    expect(within(editDialog).getByRole("button", { name: "Archive account" }).parentElement).toHaveClass("flex", "justify-end", "gap-3");
    await user.click(within(editDialog).getByRole("button", { name: "Archive account" }));
    const archiveDialog = screen.getByRole("dialog", { name: "Archive account?" });
    expect(archiveDialog).toHaveClass("z-[61]", "max-w-2xl", "border", "border-status-error/40", "p-6", "shadow-[0_20px_60px_rgba(0,0,0,0.3)]");
    expect(document.querySelector('[class~="bg-text-primary/55"][class~="backdrop-blur-sm"]')).toBeInTheDocument();
    await user.click(within(archiveDialog).getByRole("button", { name: "Archive account" }));
    expect(screen.queryByRole("row", { name: /Casey Cashier \(sample\)/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Archived users" }));
    await user.click(within(screen.getByRole("row", { name: /Casey Cashier \(sample\)/ })).getByRole("button", { name: "Restore" }));
    await user.click(within(screen.getByRole("dialog", { name: "Restore account?" })).getByRole("button", { name: "Restore account" }));
    await user.click(screen.getByRole("tab", { name: "Current users" }));
    expect(screen.getByRole("row", { name: /Casey Cashier \(sample\)/ })).toBeInTheDocument();

    const administratorRow = screen.getByRole("row", { name: /Alex Administrator \(sample\)/ });
    expect(within(administratorRow).getByRole("button", { name: "Deactivate account" })).toBeDisabled();
  });


  it("selects follow-up accounts individually and reviews selected reminder details", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <FollowupPage user={cashier} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Send reminder details" })).toBeDisabled();
    expect(screen.queryByRole("heading", { level: 2, name: "Follow-up" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(6);
    expect(screen.queryByRole("columnheader", { name: "Select" })).not.toBeInTheDocument();
    const coraRow = screen.getByRole("row", { name: /Cora Navarro/ });
    expect(within(coraRow).getByText("sky.navarro@example.test")).toBeInTheDocument();
    const basilRow = screen.getByRole("row", { name: /Basil Mercado/ });
    expect(within(basilRow).getByRole("cell", { name: /Basil Mercado/ })).toContainElement(
      within(basilRow).getByRole("checkbox", { name: /Basil Mercado/ }),
    );

    await user.click(screen.getByRole("checkbox", { name: /Basil Mercado/ }));
    expect(screen.getByRole("button", { name: "Send reminder details" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Select all listed accounts" })).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "Send reminder details" }));
    const recipientTable = screen.getByRole("table", { name: "Reminder recipients" });
    expect(recipientTable.parentElement).toHaveClass("max-h-52", "overflow-y-auto");
    expect(within(recipientTable).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Student",
      "Contact",
      "Amount due",
      "Status",
    ]);
    expect(within(recipientTable).getByRole("row", { name: /Basil Mercado.*guardian@example\.test.*₱4,200\.00.*Due soon/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send 1 reminder" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Reminder sent today to 1 guardian.",
    );
    expect(screen.getByRole("checkbox", { name: "Select all listed accounts" })).toBeDisabled();
  });

  it("updates individual selection when all listed accounts are toggled", async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><FollowupPage user={cashier} /></MemoryRouter>);

    await user.click(screen.getByRole("checkbox", { name: "Select all listed accounts" }));
    expect(screen.getByRole("button", { name: "Send reminder details" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select all listed accounts" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Basil Mercado/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Cora Navarro/ })).toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: /Basil Mercado/ }));
    expect(screen.getByRole("checkbox", { name: "Select all listed accounts" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Basil Mercado/ })).not.toBeChecked();
  });

  it("shows MockDB email contacts in the default reminder list", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><FollowupPage user={cashier} /></MemoryRouter>);

    expect(screen.getByText("Cora Navarro (sample)")).toBeInTheDocument();
    expect(screen.getByText("sky.navarro@example.test")).toBeInTheDocument();
    expect(screen.getByText("Basil Mercado (sample)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send reminders by" }));
    await user.click(screen.getByRole("menuitemradio", { name: "SMS" }));
    expect(screen.getByText("Cora Navarro (sample)")).toBeInTheDocument();
    expect(screen.getByText("0917 555 0103")).toBeInTheDocument();
  });

  it("offers SMS reminders and discloses the SMS load fee before sending", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><FollowupPage user={cashier} /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Send reminders by" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Email and SMS" }));
    await user.click(screen.getByRole("checkbox", { name: /Cora Navarro/ }));
    expect(screen.getByRole("checkbox", { name: /Cora Navarro/ })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Send reminder details" }));

    const reviewDialog = screen.getByRole("dialog", { name: "Review reminder notifications" });
    expect(reviewDialog).toHaveClass("w-[min(56rem,calc(100vw-2rem))]");
    expect(reviewDialog).toHaveTextContent("SMS: 0917 555 0103");
    expect(reviewDialog).toHaveTextContent(/SMS load fee: not configured/i);
    expect(screen.getByRole("button", { name: "Send 1 reminder" })).toBeEnabled();
  });

  it("opens a student profile from the whole student table row", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students"]}>
        <Routes>
          <Route path="/students" element={<StudentsPage user={cashier} />} />
          <Route path="/students/:id" element={<StudentProfilePage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: /open amara villanueva/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/students/sample-1001");
    expect(screen.getByRole("heading", { name: /amara villanueva/i })).toBeInTheDocument();
  });

  it("separates student status from billing status on the students page", () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students"]}>
        <Routes>
          <Route path="/students" element={<StudentsPage user={cashier} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("columnheader", { name: /student status/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /billing status/i })).toBeInTheDocument();
    expect(screen.getAllByText("Active")).toHaveLength(4);
    expect(screen.getAllByText("Current")).not.toHaveLength(0);
    expect(screen.getAllByText("Due soon")).not.toHaveLength(0);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("filters student search by the beginning of the student name", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students"]}>
        <Routes>
          <Route path="/students" element={<StudentsPage user={cashier} />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/search students/i), "B");

    expect(screen.getByRole("option", { name: /basil mercado/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /basil mercado/i })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: /amara villanueva/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: /cora navarro/i })).not.toBeInTheDocument();
  });

  it("opens a student profile from a clicked search suggestion", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students"]}>
        <Routes>
          <Route path="/students" element={<StudentsPage user={cashier} />} />
          <Route path="/students/:id" element={<StudentProfilePage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/search students/i), "B");
    await user.click(screen.getByRole("option", { name: /basil mercado/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/students/sample-1002");
    expect(screen.getByRole("heading", { name: /basil mercado/i })).toBeInTheDocument();
  });

  it("opens the matching student profile when Enter is pressed in search", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students"]}>
        <Routes>
          <Route path="/students" element={<StudentsPage user={cashier} />} />
          <Route path="/students/:id" element={<StudentProfilePage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/search students/i), "S-1003{Enter}");

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/students/sample-1003");
    expect(screen.getByRole("heading", { name: /cora navarro/i })).toBeInTheDocument();
  });

  it("takes the Back button to the previous history entry", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/payments", "/students/sample-1001"]} initialIndex={1}>
        <Routes>
          <Route path="/payments" element={<h1>Transaction history</h1>} />
          <Route path="/students/:id" element={<StudentProfilePage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/payments");
    expect(screen.getByRole("heading", { name: /transaction history/i })).toBeInTheDocument();
  });

  it("keeps the student profile focused on identity and permitted context", () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students/sample-1001"]}>
        <Routes>
          <Route path="/students/:id" element={<StudentProfilePage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/students/sample-1001");
    expect(screen.getByRole("heading", { name: /Amara Villanueva/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /guardian details/i })).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: /student profile sections/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /record payment/i })).not.toBeInTheDocument();
  });

  it("prefills the account wizard student search from a profile's Create account action", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students/sample-1004"]}>
        <Routes>
          <Route path="/students/:id" element={<StudentProfilePage user={cashier} />} />
          <Route path="/accounts/new" element={<AccountWizardPage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Create account" }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/accounts/new?student=sample-1004");
    expect(screen.getByPlaceholderText("Search student name or number")).toHaveValue("Dara Santos (sample) - S-1004");
  });

  it("opens the shared payment workflow route with student search", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/payments/new"]}>
        <Routes>
          <Route path="/payments/new" element={<PaymentEntryPage />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/student search/i), "S-1001");
    expect(screen.getByRole("listbox", { name: "Matching students" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close suggestions" }));
    expect(screen.queryByRole("listbox", { name: "Matching students" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Current path")).toHaveTextContent("/payments/new");

    await user.type(screen.getByLabelText(/student search/i), " ");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox", { name: "Matching students" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/student search/i), " ");
    await user.click(screen.getByRole("option", { name: /Amara Villanueva.*S-1001/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/payments/new");
    expect(screen.getAllByText("Amara Villanueva (sample)").length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/student search/i)).toHaveValue("Amara Villanueva (sample)");
    expect(screen.getByLabelText(/amount received/i)).toHaveValue("1250.00");
    expect(screen.getByLabelText(/fee name/i))
      .toHaveAttribute("placeholder", "SY 2026-2027 Tuition");
    expect(screen.getByLabelText(/fee name/i)).toHaveValue("SY 2026-2027 tuition");
    const installmentButton = screen.getByRole("button", { name: /pay next installment/i });
    const paymentActions = installmentButton.parentElement;
    expect(paymentActions).toHaveClass("flex", "items-center");
    expect(within(paymentActions!).getByRole("button", { name: "Review payment" }))
      .toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Review payment" }));
    expect(screen.getByRole("dialog", { name: "Confirm payment" })).toBeInTheDocument();
    expect(screen.getByLabelText("Current path")).toHaveTextContent("/payments/new");
  });

  it("guards the shared payment workflow against duplicate save clicks", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/payments/new?student=sample-1001"]}>
        <Routes>
          <Route path="/payments/new" element={<PaymentEntryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /review payment/i }));
    const confirmButton = screen.getByRole("button", { name: /confirm and save/i });

    await user.dblClick(confirmButton);

    expect(confirmButton).toBeDisabled();
    expect(await screen.findByText(/payment saved/i)).toBeInTheDocument();
  });

  it("keeps follow-up in its dedicated workspace instead of a student profile tab", () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students/sample-1003"]}>
        <Routes>
          <Route path="/students/:id" element={<StudentProfilePage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/students/sample-1003");
    expect(screen.queryByRole("tab", { name: /follow-up/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /follow-up reminder/i })).not.toBeInTheDocument();

    render(<MemoryRouter><FollowupPage user={cashier} /></MemoryRouter>);
    expect(screen.queryByRole("heading", { name: /due follow-ups/i })).not.toBeInTheDocument();
  });

  it("keeps the statement of account in its dedicated report route", () => {
    const profile = render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students/sample-1001"]}>
        <Routes>
          <Route path="/students/:id" element={<StudentProfilePage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/students/sample-1001");
    expect(screen.queryByRole("tab", { name: /billing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /statement of account/i })).not.toBeInTheDocument();
    profile.unmount();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/reports/student/sample-1001"]}>
        <Routes><Route path="/reports/student/:id" element={<StudentStatementPage user={cashier} />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Statement" })).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: /tuition installment/i }).length).toBeGreaterThan(0);
  });

  it("filters notification status from the URL query", () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/notifications?status=failed"]}>
        <Routes>
          <Route path="/notifications" element={<MockNotificationsPage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/notifications?status=failed");
    expect(screen.getByRole("cell", { name: /failed/i })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: /queued/i })).not.toBeInTheDocument();
  });

  it("shows queued, sent, and failed notification delivery statuses", () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/notifications"]}>
        <Routes>
          <Route path="/notifications" element={<MockNotificationsPage user={cashier} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("cell", { name: /queued/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /sent/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /failed/i })).toBeInTheDocument();
  });

  it("opens a notification entry from the functional action button", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/followup?view=notifications"]}>
        <MockNotificationsPage user={cashier} />
      </MemoryRouter>,
    );

    await user.click(screen.getAllByRole("button", { name: "View entry" })[0]!);

    expect(screen.getByRole("dialog", { name: "Notification entry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("updates the notification status filter query from the shared panel", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/notifications"]}>
        <Routes>
          <Route path="/notifications" element={<MockNotificationsPage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Failed" }));
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/notifications?status=failed");
    expect(screen.getByRole("cell", { name: /failed/i })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: /queued/i })).not.toBeInTheDocument();
  });

  it("does not offer receipt PDF downloads before the audited workflow exists", () => {
    const { rerender } = render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/receipts/mock-payment-0/print"]}>
        <ReceiptPage user={cashier} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: /download pdf/i })).not.toBeInTheDocument();

    rerender(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/receipts/mock-payment-0/print"]}>
        <ReceiptPage user={auditor} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: /download pdf/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/pdf downloads are logged by the backend/i)).not.toBeInTheDocument();
  });

  it("keeps billing and payment work in dedicated role workspaces", () => {
    const renderProfile = (profileUser: AuthenticatedUser) => render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students/sample-1001"]}>
        <Routes><Route path="/students/:id" element={<StudentProfilePage user={profileUser} />} /></Routes>
      </MemoryRouter>,
    );

    for (const financeUser of [cashier, accounting]) {
      const profile = renderProfile(financeUser);
      expect(screen.getByRole("heading", { name: /Amara Villanueva/i })).toBeInTheDocument();
      expect(screen.queryByRole("tablist", { name: /student profile sections/i })).not.toBeInTheDocument();
      profile.unmount();
    }

    const adminProfile = renderProfile(administrator);
    expect(screen.queryByRole("tablist", { name: /student profile sections/i })).not.toBeInTheDocument();
    adminProfile.unmount();

    renderProfile(registrar);
    expect(screen.queryByRole("tablist", { name: /student profile sections/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/guardian details/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/account balance/i)).not.toBeInTheDocument();
  });

  it("keeps account creation in the dedicated billing workspace", () => {
    const renderProfile = (profileUser: AuthenticatedUser) => render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students/sample-1001"]}>
        <Routes><Route path="/students/:id" element={<StudentProfilePage user={profileUser} />} /></Routes>
      </MemoryRouter>,
    );

    {
      const profile = renderProfile(cashier);
      expect(screen.queryByRole("button", { name: "Print" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Create account" })).not.toBeInTheDocument();
      expect(screen.queryByRole("tablist", { name: /student profile sections/i })).not.toBeInTheDocument();
      profile.unmount();
    }

    for (const restrictedUser of [accounting]) {
      const profile = renderProfile(restrictedUser);
      expect(screen.queryByRole("link", { name: "Create account" })).not.toBeInTheDocument();
      expect(screen.queryByRole("tablist", { name: /student profile sections/i })).not.toBeInTheDocument();
      profile.unmount();
    }

    const administratorProfile = renderProfile(administrator);
    expect(screen.queryByRole("tablist", { name: /student profile sections/i })).not.toBeInTheDocument();
    administratorProfile.unmount();

    const cashierAccounts = render(<MemoryRouter><AccountsPage user={cashier} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /create account/i })).toBeInTheDocument();
    cashierAccounts.unmount();

    for (const readOnlyUser of [administrator, accounting]) {
      const accountPage = render(<MemoryRouter><AccountsPage user={readOnlyUser} /></MemoryRouter>);
      expect(screen.queryByRole("link", { name: /create account/i })).not.toBeInTheDocument();
      accountPage.unmount();
    }
  });

  it("keeps reports with Accounting and Auditor review separate", () => {
    const cashierHub = render(<MemoryRouter><ReportsHubPage user={cashier} /></MemoryRouter>);
    expect(screen.queryByText(/daily collection/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/student statement/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/monthly financial/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/outstanding balances/i)).not.toBeInTheDocument();
    cashierHub.unmount();

    expect(canViewReport(accounting, "monthly")).toBe(true);
    expect(canViewReport(accounting, "outstanding")).toBe(true);
    expect(canViewReport(accounting, "daily")).toBe(true);
    expect(canViewReport(accounting, "statement")).toBe(true);
    expect(canViewReport(administrator, "monthly")).toBe(false);
    expect(canViewReport(auditor, "monthly")).toBe(false);
    expect(canViewReport(cashier, "daily")).toBe(false);
    expect(canViewReport(cashier, "statement")).toBe(false);
    expect(canViewReport(cashier, "monthly")).toBe(false);
    expect(canViewReport(cashier, "outstanding")).toBe(false);
  });

  it("keeps standalone reports out of the Cashier workspace", () => {
    vi.stubEnv("VITE_USE_LIVE_API", "true");
    try {
      const cashierHub = render(<MemoryRouter><ReportsHubPage user={cashier} /></MemoryRouter>);

      expect(screen.queryByRole("link", { name: /student statement/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /daily collection/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /monthly financial/i })).not.toBeInTheDocument();
      cashierHub.unmount();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("opens an Accounting report when its widget is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/reports"]}>
        <ReportsHubPage user={accounting} />
        <LocationPath />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: "Open" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /monthly financial/i }));

    expect(screen.getByRole("status", { name: "Current path" })).toHaveTextContent("/reports/monthly");
  });

  it("keeps the student selector in the statement report and switches its route", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/reports/student/sample-1001"]}>
        <Routes><Route path="/reports/student/:id" element={<StudentStatementPage user={accounting} />} /></Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "Student statement" });
    expect(trigger.parentElement).toHaveClass("mt-1", "block");

    await user.click(trigger);

    expect(screen.getAllByRole("menuitemradio", { name: /Amara Villanueva.*S-1001/i })).toHaveLength(1);
    await user.click(screen.getByRole("menuitemradio", { name: /Basil Mercado.*S-1002/i }));
    expect(screen.getByRole("status", { name: "Current path" })).toHaveTextContent("/reports/student/sample-1002");
    expect(screen.getAllByText(/Basil Mercado/i, { ignore: ".print-root *, script, style" }).length).toBeGreaterThan(0);
  });

  it("shows only permitted primary pages for each of the six account roles", () => {
    const expectedLinks = new Map<AuthenticatedUser, string[]>([
      [{ id: "super-admin", name: "Morgan Super Admin", role: "super_admin" }, ["Dashboard", "Users", "Audit", "Security"]],
      [cashier, ["Dashboard", "Students", "Accounts", "Payments", "Follow-up", "Close-out"]],
      [accounting, ["Dashboard", "Accounts", "Payment review", "Finance", "Settings", "Void requests", "Close-out review", "Reports", "Follow-up"]],
      [administrator, ["Dashboard", "Users", "Settings", "Backups", "Security"]],
      [auditor, ["Dashboard", "Audit"]],
      [registrar, ["Dashboard", "Students"]],
    ]);

    for (const [user, links] of expectedLinks) {
      const navigation = render(<MemoryRouter><Sidebar user={user} onLogout={() => undefined} onRoleChange={() => undefined} /></MemoryRouter>);
      const navigationLinks = screen.getAllByRole("link");
      expect(navigationLinks.map((link) => link.textContent)).toEqual(links);
      expect(navigationLinks.every((link) => link.querySelector("svg[aria-hidden='true']"))).toBe(true);
      expect(screen.getByRole("img", { name: "Mendez Christian Academy seal" })).toHaveClass(
        "h-11",
        "w-11",
      );
      navigation.unmount();
    }
  });

  it("uses role-specific payment page names", () => {
    const cashierPage = render(<MemoryRouter><PaymentsPage user={cashier} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Payments" })).toBeInTheDocument();
    cashierPage.unmount();

    render(<MemoryRouter><PaymentsPage user={accounting} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Payment review" })).toBeInTheDocument();
  });

  it("shows grade, section, and a prominent email status on the MockDB payment detail", () => {
    render(<MemoryRouter initialEntries={["/payments/mock-payment-4"]}><Routes><Route path="/payments/:id" element={<PaymentsPage user={cashier} detail />} /></Routes></MemoryRouter>);

    expect(screen.getByText("Grade 7 · Olive")).toBeInTheDocument();
    const emailMetric = screen.getByText("Email status").parentElement;
    expect(emailMetric).not.toBeNull();
    expect(within(emailMetric!).getByText("Queued").parentElement).toHaveClass("text-xl", "font-bold");
  });

  it("shows the cashier notification and permitted close-out tabs", () => {
    const followup = render(<MemoryRouter><RoleFollowupWorkspace user={cashier} /></MemoryRouter>);
    expect(screen.getByRole("tab", { name: "Follow-up" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Notification log" })).toBeInTheDocument();
    followup.unmount();

    const closeout = render(<MemoryRouter><CloseoutPage user={cashier} /></MemoryRouter>);
    expect(screen.getByRole("tab", { name: "Today's close-out" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "History" })).toBeInTheDocument();
    closeout.unmount();

    render(<MemoryRouter><CloseoutHistoryPage user={accounting} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Close-out review" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "History" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Today's close-out" })).not.toBeInTheDocument();
  });

  it("uses the close-out reconciliation row and requires a reason for a variance", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><CloseoutPage user={cashier} /></MemoryRouter>);

    const review = screen.getByRole("button", { name: "Review close-out" });
    expect(screen.getByText("Waiting for count")).toBeInTheDocument();
    expect(review).toBeDisabled();

    await user.type(screen.getByLabelText("Counted cash"), "1250");
    expect(screen.getByText("Balanced")).toBeInTheDocument();
    expect(review).toBeEnabled();

    await user.clear(screen.getByLabelText("Counted cash"));
    await user.type(screen.getByLabelText("Counted cash"), "1200");
    expect(screen.getByLabelText(/Variance explanation/)).toBeInTheDocument();
    expect(review).toBeDisabled();

    await user.type(screen.getByLabelText(/Variance explanation/), "Drawer count was corrected after recounting.");
    expect(review).toBeEnabled();
    await user.click(review);
    const confirmation = screen.getByRole("dialog", { name: "Confirm daily close-out" });
    expect(confirmation).toBeInTheDocument();
    expect(within(confirmation).getByText("Drawer count was corrected after recounting.")).toBeInTheDocument();
  });

  it("enforces allowed and forbidden primary capabilities for all six roles", () => {
    expect(can(superAdmin, "dashboard.view")).toBe(true);
    expect(can(superAdmin, "user.manage")).toBe(true);
    expect(can(superAdmin, "security.events.view")).toBe(true);
    expect(can(superAdmin, "audit.view")).toBe(true);
    expect(can(superAdmin, "student.view")).toBe(false);
    expect(can(superAdmin, "account.view")).toBe(false);
    expect(can(superAdmin, "payment.view")).toBe(false);
    expect(can(superAdmin, "payment.record")).toBe(false);
    expect(can(superAdmin, "payment.void.request")).toBe(false);
    expect(can(superAdmin, "payment.void.view")).toBe(false);
    expect(can(superAdmin, "payment.void.approve")).toBe(false);
    expect(can(superAdmin, "receipt.reprint")).toBe(false);
    expect(can(superAdmin, "followup.view")).toBe(false);
    expect(can(superAdmin, "followup.send")).toBe(false);
    expect(can(superAdmin, "notification.view")).toBe(false);
    expect(can(superAdmin, "notification.retry")).toBe(false);
    expect(can(superAdmin, "report.view")).toBe(false);
    expect(can(superAdmin, "closeout.submit")).toBe(false);
    expect(can(superAdmin, "closeout.view")).toBe(false);
    expect(can(superAdmin, "backup.manage")).toBe(false);
    expect(can(superAdmin, "import.run")).toBe(false);

    expect(can(cashier, "payment.record")).toBe(true);
    expect(can(cashier, "student.view")).toBe(true);
    expect(can(cashier, "student.edit")).toBe(false);
    expect(can(cashier, "report.view")).toBe(false);
    expect(can(cashier, "notification.retry")).toBe(true);
    expect(can(cashier, "import.run")).toBe(false);
    expect(can(accounting, "payment.void.approve")).toBe(true);
    expect(can(accounting, "payment.record")).toBe(false);
    expect(can(accounting, "followup.send")).toBe(true);
    expect(can(accounting, "audit.view")).toBe(false);
    expect(can(accounting, "notification.view")).toBe(true);
    expect(can(accounting, "notification.retry")).toBe(false);
    expect(can(accounting, "import.run")).toBe(false);
    expect(can(administrator, "user.manage")).toBe(true);
    expect(can(administrator, "security.events.view")).toBe(true);
    expect(can(administrator, "audit.view")).toBe(false);
    expect(can(administrator, "payment.view")).toBe(false);
    expect(can(administrator, "notification.retry")).toBe(false);
    expect(can(administrator, "import.run")).toBe(false);
    expect(can(administrator, "report.view")).toBe(false);
    expect(can(auditor, "audit.view")).toBe(true);
    expect(can(auditor, "notification.view")).toBe(false);
    expect(can(auditor, "payment.record")).toBe(false);
    expect(can(auditor, "notification.retry")).toBe(false);
    expect(can(auditor, "import.run")).toBe(false);
    expect(can(registrar, "student.view")).toBe(true);
    expect(can(registrar, "student.edit")).toBe(true);
    expect(can(registrar, "student.financial.view")).toBe(true);
    expect(can(registrar, "guardianContact.view")).toBe(true);
    expect(can(registrar, "account.view")).toBe(false);
    expect(can(registrar, "notification.view")).toBe(false);
    expect(can(registrar, "followup.send")).toBe(false);
    expect(can(registrar, "notification.retry")).toBe(false);
    expect(can(registrar, "import.run")).toBe(false);

    render(
      <MemoryRouter>
        <RequireCapability user={administrator} capability="payment.record">
          <p>Payment entry</p>
        </RequireCapability>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /access denied/i })).toBeInTheDocument();
    expect(screen.queryByText("Payment entry")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute("href", "/");
  });

  it("lets the Registrar open the student directory with read-only financial and guardian context", () => {
    render(
      <MemoryRouter initialEntries={["/students/sample-1001"]}>
        <Routes>
          <Route
            path="/students/:id"
            element={
              <RequireCapability user={registrar} capability="student.view">
                <StudentProfilePage user={registrar} />
              </RequireCapability>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("heading", { name: "Access denied" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /amara villanueva/i })).toBeInTheDocument();
    expect(screen.getByText(/account balance/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /guardian details/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit student" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /record payment/i })).not.toBeInTheDocument();
  });

  it("renders not found for unknown student and account routes", () => {
    const unknownStudent = render(
      <MemoryRouter initialEntries={["/students/missing"]}><Routes><Route path="/students/:id" element={<StudentProfilePage user={cashier} />} /></Routes></MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /not found/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute("href", "/");
    unknownStudent.unmount();

    render(
      <MemoryRouter initialEntries={["/accounts/missing"]}><Routes><Route path="/accounts/:id" element={<AccountDetailPage user={cashier} />} /></Routes></MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /not found/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute("href", "/");
  });

  it("uses the shared mock account records for account, payment, and follow-up context", () => {
    const account = getBillingAccount("account-1003-2026");
    expect(account?.balance).toBe(850000);
    expect(getCurrentBillingAccount("sample-1001")?.id).toBe("account-1001-2026");
    expect(getDueInstallments("sample-1003").map(({ installment }) => installment.id)).toEqual([
      "installment-1003-1", "installment-1003-2",
    ]);
  });

  it("uses the requested student statement route context", () => {
    render(
      <MemoryRouter initialEntries={["/reports/student/sample-1003"]}><Routes><Route path="/reports/student/:id" element={<StudentStatementPage user={cashier} />} /></Routes></MemoryRouter>,
    );
    expect(screen.getAllByText(/cora navarro/i, { ignore: ".print-root *, script, style" }).length).toBeGreaterThan(0);
    expect(screen.getByText("₱8,500.00", { ignore: ".print-root *, script, style" })).toBeInTheDocument();
  });
});
