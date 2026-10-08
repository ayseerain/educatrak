import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AccountDetailPage, AccountsPage, FollowupPage, NotificationsPage, PaymentEntryPage, ReceiptPage, ReportsHubPage, StudentProfilePage, StudentStatementPage, StudentsPage } from "@/features/operations/OperationalPages";
import { getBillingAccount, getCurrentBillingAccount, getDueInstallments } from "@/features/students/mockBilling";
import { Sidebar } from "@/components/layout/Sidebar";
import { canViewReport } from "@/lib/permissions";
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

  it("keeps inline payment entry to the Cashier while retaining permitted history", async () => {
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

    for (const readOnlyUser of [administrator, accounting, auditor]) {
      const profile = renderProfile(readOnlyUser);
      await user.click(screen.getByRole("tab", { name: /payments/i }));
      expect(screen.queryByRole("heading", { name: /record payment/i })).not.toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "OR-2026-001000" })).toBeInTheDocument();
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

    for (const printUser of [cashier, accounting]) {
      const profile = renderProfile(printUser);
      await user.click(screen.getByRole("tab", { name: /billing/i }));
      expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
      profile.unmount();
    }

    for (const readOnlyUser of [administrator, auditor]) {
      const profile = renderProfile(readOnlyUser);
      await user.click(screen.getByRole("tab", { name: /billing/i }));
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

  it("limits Cashier reports in both discovery and route policy", () => {
    const cashierHub = render(<MemoryRouter><ReportsHubPage user={cashier} /></MemoryRouter>);
    expect(screen.getByText(/daily collection/i)).toBeInTheDocument();
    expect(screen.getByText(/student statement/i)).toBeInTheDocument();
    expect(screen.queryByText(/monthly financial/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/outstanding balances/i)).not.toBeInTheDocument();
    cashierHub.unmount();

    for (const reportUser of [administrator, accounting, auditor]) {
      expect(canViewReport(reportUser, "monthly")).toBe(true);
      expect(canViewReport(reportUser, "outstanding")).toBe(true);
    }
    expect(canViewReport(cashier, "daily")).toBe(true);
    expect(canViewReport(cashier, "statement")).toBe(true);
    expect(canViewReport(cashier, "monthly")).toBe(false);
    expect(canViewReport(cashier, "outstanding")).toBe(false);
  });

  it("nests navigation only while its explicit parent is visible", () => {
    const adminNavigation = render(<MemoryRouter><Sidebar user={administrator} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /notification/i })).not.toHaveClass("ml-4");
    adminNavigation.unmount();

    render(<MemoryRouter><Sidebar user={auditor} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Notifications" })).toHaveClass("ml-4");
    expect(screen.getByRole("link", { name: /close-out history/i })).not.toHaveClass("ml-4");
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
