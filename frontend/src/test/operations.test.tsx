import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AccountDetailPage, AccountsPage, ClearancePage, CloseoutHistoryPage, CloseoutPage, FollowupPage, NotificationsPage, PaymentEntryPage, ReceiptPage, ReportsHubPage, RequireCapability, SettingsPage, StudentProfilePage, StudentStatementPage, StudentsPage, UsersPage } from "@/features/operations/OperationalPages";
import { getBillingAccount, getCurrentBillingAccount, getDueInstallments } from "@/features/students/mockBilling";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
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

function LocationPath() {
  const { pathname, search } = useLocation();
  return <output aria-label="Current path">{pathname}{search}</output>;
}

describe("operational page navigation", () => {
  it("aligns user state labels with the State column header", () => {
    render(<MemoryRouter><UsersPage /></MemoryRouter>);

    const stateHeader = screen.getByRole("columnheader", { name: "State" });
    const administratorRow = screen.getByRole("row", {
      name: /Alex Administrator \(sample\)/,
    });

    expect(stateHeader).toHaveClass("text-center");
    expect(within(administratorRow).getAllByRole("cell")[3]).toHaveClass("text-center");
  });

  it("aligns status heading and values on Administrator system configuration pages", () => {
    for (const section of ["school", "receipt", "email"] as const) {
      const { unmount } = render(<MemoryRouter><SettingsPage section={section} editable /></MemoryRouter>);

      const statusHeader = screen.getByRole("columnheader", { name: "Status" });
      expect(statusHeader).toHaveClass("text-center");
      const dataRows = screen.getAllByRole("row").slice(1);
      expect(dataRows.length).toBeGreaterThan(0);
      expect(dataRows.every((row) => {
        const cells = within(row).getAllByRole("cell");
        const statusCell = cells[cells.length - 1];
        return statusCell?.classList.contains("text-center");
      })).toBe(true);
      unmount();
    }
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

  it("hides the global student search for administrators", () => {
    const administratorHeader = render(
      <MemoryRouter>
        <Header user={administrator} onLogout={() => undefined} onRoleChange={() => undefined} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("searchbox", { name: /search students, receipts/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i }).parentElement).toHaveClass("md:ml-auto");
    administratorHeader.unmount();

    render(
      <MemoryRouter>
        <Header user={cashier} onLogout={() => undefined} onRoleChange={() => undefined} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("searchbox", { name: /search students, receipts/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i }).parentElement).toHaveClass("md:ml-0");
  });

  it("provides administrator account actions from each user row's Edit button", async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><UsersPage /></MemoryRouter>);

    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]!);
    expect(screen.getByRole("button", { name: "Reset password" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deactivate account" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(screen.getByRole("status")).toHaveTextContent("Password reset complete.");
    expect(screen.getByText(/temporary password \(shown once\):/i)).toBeInTheDocument();
    expect(screen.getByText("SampleReset123!")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Deactivate account" }));
    expect(screen.getByRole("heading", { name: "Deactivate account?" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog", { name: "Deactivate account?" })).getByRole("button", { name: "Deactivate account" }));
    expect(screen.getByRole("button", { name: "Reactivate account" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reactivate account" }));
    expect(screen.getByRole("button", { name: "Deactivate account" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    expect(screen.getByRole("button", { name: "Deactivate account" })).toBeDisabled();
    expect(screen.getByText(/cannot deactivate your own administrator account/i)).toBeInTheDocument();
  });

  it("renders clearance verification for registrars", () => {
    render(<MemoryRouter><ClearancePage user={registrar} /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: /clearance verification/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /print exam permit/i })).toHaveAttribute("href", "/permits/sample-1001/midterm/print");
  });

  it("shows the reminder action for individual and all-account selections", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <FollowupPage user={cashier} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Send reminder emails" })).toBeDisabled();
    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
    expect(screen.queryByRole("columnheader", { name: "Select" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Select all listed accounts" }));
    expect(screen.getByRole("button", { name: "Send reminder emails" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select all listed accounts" })).toBeChecked();
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

    await user.click(screen.getByRole("cell", { name: /grade 7/i }));

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
    expect(screen.getAllByText("Active")).toHaveLength(3);
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Due soon")).toBeInTheDocument();
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

  it("shows record payment in the student activity widget without leaving the profile", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students/sample-1001"]}>
        <Routes>
          <Route path="/students/:id" element={<StudentProfilePage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("tab", { name: /payments/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/students/sample-1001");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("The current student is selected");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("SY 2026-2027 tuition");
    expect(screen.getByLabelText(/fee name/i)).toHaveValue("SY 2026-2027 tuition");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("₱1,250.00");
    expect(screen.queryByRole("link", { name: /record payment/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /payment method/i }));

    expect(
      screen.queryByRole("menuitemradio", { name: /gcash/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitemradio", { name: /bank deposit/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitemradio", { name: /^check$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: "Cash" }),
    ).toBeInTheDocument();
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

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/payments/new");
    expect(screen.getAllByText("Amara Villanueva (sample)").length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/fee name/i)).toHaveValue("SY 2026-2027 tuition");
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

  it("toggles follow-up in the student activity widget without leaving the profile", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students/sample-1003"]}>
        <Routes>
          <Route path="/students/:id" element={<StudentProfilePage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: /create billing record/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /follow-up/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/students/sample-1003");
    expect(screen.getByRole("heading", { name: /follow-up reminder/i })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("guardian@example.test");
    expect(screen.getByRole("columnheader", { name: /payment for/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /installment 1/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /installment 2/i })).toBeInTheDocument();
  });

  it("toggles the statement of account in the student activity widget", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students/sample-1001"]}>
        <Routes>
          <Route path="/students/:id" element={<StudentProfilePage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("tab", { name: /billing/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/students/sample-1001");
    expect(screen.getByRole("heading", { name: /statement of account/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /tuition installment/i })).toBeInTheDocument();
  });

  it("filters notification status from the URL query", () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/notifications?status=failed"]}>
        <Routes>
          <Route path="/notifications" element={<NotificationsPage user={cashier} />} />
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
          <Route path="/notifications" element={<NotificationsPage user={cashier} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("cell", { name: /queued/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /sent/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /failed/i })).toBeInTheDocument();
  });

  it("updates the notification status filter query from the status dropdown", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/notifications"]}>
        <Routes>
          <Route path="/notifications" element={<NotificationsPage user={cashier} />} />
        </Routes>
        <LocationPath />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /filter status/i }));
    await user.click(screen.getByRole("menuitemradio", { name: /failed/i }));

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/notifications?status=failed");
    expect(screen.getByRole("cell", { name: /failed/i })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: /queued/i })).not.toBeInTheDocument();
  });

  it("keeps shareable receipt PDF downloads to permitted staff roles", () => {
    const { rerender } = render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/receipts/mock-payment-0/print"]}>
        <ReceiptPage user={cashier} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /download pdf/i })).toBeInTheDocument();

    rerender(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/receipts/mock-payment-0/print"]}>
        <ReceiptPage user={auditor} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: /download pdf/i })).not.toBeInTheDocument();
    expect(screen.getByText(/pdf downloads are logged by the backend/i)).toBeInTheDocument();
  });

  it("keeps payment entry and history in the Cashier-owned student workflow", async () => {
    const user = userEvent.setup();
    const renderProfile = (profileUser: AuthenticatedUser) => render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students/sample-1001"]}>
        <Routes><Route path="/students/:id" element={<StudentProfilePage user={profileUser} />} /></Routes>
      </MemoryRouter>,
    );

    const cashierProfile = renderProfile(cashier);
    await user.click(screen.getByRole("tab", { name: /payments/i }));
    expect(screen.getByRole("heading", { name: /record payment/i })).toBeInTheDocument();
    cashierProfile.unmount();

    for (const restrictedUser of [administrator, accounting, auditor]) {
      const profile = renderProfile(restrictedUser);
      expect(screen.queryByRole("tab", { name: /payments/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /record payment/i })).not.toBeInTheDocument();
      profile.unmount();
    }

    renderProfile(registrar);
    expect(screen.queryByRole("tab", { name: /payments/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/guardian details/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/account balance/i)).not.toBeInTheDocument();
  });

  it("shows account creation and statement printing only to authorized roles", async () => {
    const user = userEvent.setup();
    const renderProfile = (profileUser: AuthenticatedUser) => render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/students/sample-1001"]}>
        <Routes><Route path="/students/:id" element={<StudentProfilePage user={profileUser} />} /></Routes>
      </MemoryRouter>,
    );

    {
      const profile = renderProfile(cashier);
      await user.click(screen.getByRole("tab", { name: /billing/i }));
      expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
      profile.unmount();
    }

    for (const restrictedUser of [administrator, accounting, auditor]) {
      const profile = renderProfile(restrictedUser);
      expect(screen.queryByRole("tab", { name: /billing/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Print" })).not.toBeInTheDocument();
      profile.unmount();
    }

    const cashierAccounts = render(<MemoryRouter><AccountsPage user={cashier} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /create account/i })).toBeInTheDocument();
    cashierAccounts.unmount();

    for (const readOnlyUser of [administrator, accounting, auditor]) {
      const accountPage = render(<MemoryRouter><AccountsPage user={readOnlyUser} /></MemoryRouter>);
      expect(screen.queryByRole("link", { name: /create account/i })).not.toBeInTheDocument();
      accountPage.unmount();
    }
  });

  it("reserves financial reports for Accounting", () => {
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
    expect(canViewReport(cashier, "monthly")).toBe(false);
    expect(canViewReport(cashier, "outstanding")).toBe(false);
  });

  it("shows only permitted primary pages for each of the five account roles", () => {
    const expectedLinks = new Map<AuthenticatedUser, string[]>([
      [cashier, ["Dashboard", "Students & billing", "Cash payments & receipts", "Installments & follow-ups", "Daily close-out"]],
      [accounting, ["Dashboard", "Financial policies", "Void approvals", "Close-out review", "Financial reports"]],
      [administrator, ["Dashboard", "User & access management", "System configuration", "Backup & recovery", "Security events"]],
      [auditor, ["Dashboard", "Audit review"]],
      [registrar, ["Dashboard", "Clearance verification"]],
    ]);

    for (const [user, links] of expectedLinks) {
      const navigation = render(<MemoryRouter><Sidebar user={user} /></MemoryRouter>);
      expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(links);
      navigation.unmount();
    }
  });

  it("hides inaccessible related pages within follow-up and close-out views", () => {
    const followup = render(<MemoryRouter><FollowupPage user={cashier} /></MemoryRouter>);
    expect(screen.getByRole("tab", { name: "Due follow-ups" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Notification log" })).not.toBeInTheDocument();
    followup.unmount();

    const closeout = render(<MemoryRouter><CloseoutPage user={cashier} /></MemoryRouter>);
    expect(screen.getByRole("tab", { name: "Today's close-out" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "History" })).not.toBeInTheDocument();
    closeout.unmount();

    render(<MemoryRouter><CloseoutHistoryPage user={accounting} /></MemoryRouter>);
    expect(screen.getByRole("tab", { name: "History" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Today's close-out" })).not.toBeInTheDocument();
  });

  it("enforces allowed and forbidden primary capabilities for all five roles", () => {
    expect(can(cashier, "payment.record")).toBe(true);
    expect(can(cashier, "report.view")).toBe(false);
    expect(can(accounting, "payment.void.approve")).toBe(true);
    expect(can(accounting, "payment.record")).toBe(false);
    expect(can(administrator, "user.manage")).toBe(true);
    expect(can(administrator, "finance.amounts.view")).toBe(false);
    expect(can(auditor, "audit.view")).toBe(true);
    expect(can(auditor, "payment.record")).toBe(false);
    expect(can(registrar, "student.view")).toBe(true);
    expect(can(registrar, "permit.print")).toBe(true);
    expect(can(registrar, "finance.amounts.view")).toBe(false);

    render(
      <MemoryRouter>
        <RequireCapability user={administrator} capability="payment.record">
          <p>Payment entry</p>
        </RequireCapability>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /access denied/i })).toBeInTheDocument();
    expect(screen.queryByText("Payment entry")).not.toBeInTheDocument();
  });

  it("allows a registrar to open the limited student profile used for clearance verification", () => {
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

    expect(screen.getByRole("heading", { name: /amara villanueva/i })).toBeInTheDocument();
    expect(screen.getByText(/clearance/i)).toBeInTheDocument();
    expect(screen.queryByText(/account balance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/guardian details/i)).not.toBeInTheDocument();
  });

  it("renders not found for unknown student and account routes", () => {
    const unknownStudent = render(
      <MemoryRouter initialEntries={["/students/missing"]}><Routes><Route path="/students/:id" element={<StudentProfilePage user={cashier} />} /></Routes></MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    unknownStudent.unmount();

    render(
      <MemoryRouter initialEntries={["/accounts/missing"]}><Routes><Route path="/accounts/:id" element={<AccountDetailPage user={cashier} />} /></Routes></MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
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
    expect(screen.getByText(/cora navarro/i)).toBeInTheDocument();
    expect(screen.getByText("₱8,500.00")).toBeInTheDocument();
  });
});
