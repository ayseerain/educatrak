import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LiveStudentProfilePage, LiveStudentsPage } from "@/features/students/LiveStudentsPage";
import { StudentFormPage, StudentProfilePage } from "@/features/operations/OperationalPages";
import { can } from "@/lib/permissions";
import type { AuthenticatedUser } from "@/lib/types";

describe("live Registrar student list", () => {
  beforeEach(() => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_USE_LIVE_API", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("grants the Registrar student-directory access with student financial and guardian visibility", () => {
    const registrar: AuthenticatedUser = { id: "registrar-1", name: "Riley Registrar (sample)", role: "registrar" };
    expect(can(registrar, "student.view")).toBe(true);
    expect(can(registrar, "student.edit")).toBe(true);
    expect(can(registrar, "student.financial.view")).toBe(true);
    expect(can(registrar, "guardianContact.view")).toBe(true);
  });

  it.each([
    ["Cashier", "cashier", true],
    ["Accounting Officer", "accounting", true],
    ["Administrator", "administrator", false],
    ["Auditor", "auditor", false],
    ["Registrar", "registrar", true],
  ] as const)("shows student balances only to assigned student-finance roles (%s)", async (_label, role, maySeeBalance) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: "student-3", studentNo: "SAMPLE-4003", fullName: "Morgan Sample Student", gradeLevel: "Grade 5", section: "Maple", status: "enrolled", balanceCents: 12345 }], meta: { currentPage: 1, lastPage: 1, total: 1 } }),
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user: AuthenticatedUser = { id: `user-${role}`, name: `${_label} Test`, role };
    const view = render(<QueryClientProvider client={queryClient}><MemoryRouter><LiveStudentsPage user={user} /></MemoryRouter></QueryClientProvider>);

    await screen.findByText("Morgan Sample Student");
    if (maySeeBalance) expect(screen.getByRole("columnheader", { name: "Current school-year balance" })).toBeInTheDocument();
    else expect(screen.queryByRole("columnheader", { name: "Current school-year balance" })).not.toBeInTheDocument();
    view.unmount();
  });

  it("shows the MockDB student form when mock mode is active", () => {
    render(<MemoryRouter><StudentFormPage /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Add student" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /student number/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /mobile number/i })).toBeInTheDocument();
  });

  it("shows the MockDB existing-student edit form when mock mode is active", () => {
    render(<MemoryRouter initialEntries={["/students/sample-1001/edit"]}><Routes><Route path="/students/:id/edit" element={<StudentFormPage edit />} /></Routes></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Edit student" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /student number/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /mobile number/i })).toBeInTheDocument();
  });

  it("shows financial and guardian context while retaining Registrar student-record widgets", () => {
    const registrar: AuthenticatedUser = { id: "registrar-1", name: "Riley Registrar (sample)", role: "registrar" };
    render(<MemoryRouter initialEntries={["/students/sample-1001"]}><Routes><Route path="/students/:id" element={<StudentProfilePage user={registrar} />} /></Routes></MemoryRouter>);

    expect(screen.queryByText("Student number")).not.toBeInTheDocument();
    expect(screen.queryByText("Grade level")).not.toBeInTheDocument();
    expect(screen.queryByText("Section")).not.toBeInTheDocument();
    expect(screen.getByText("Student status")).toBeInTheDocument();
    expect(screen.getByText("Account balance")).toBeInTheDocument();
    expect(screen.getByText("Active").parentElement).toHaveClass("text-xl", "font-bold", "tracking-tight");
    expect(screen.getByText("Guardian details")).toBeInTheDocument();
  });

  it("links a Cashier live student profile to payment entry only", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "student-1", studentNo: "SAMPLE-4001", fullName: "Jordan Sample Student", gradeLevel: "Grade 4", section: "Orchid", status: "enrolled", balanceCents: 5000, guardians: [{ fullName: "Jamie Sample Guardian", relationship: "Parent", email: "jamie.guardian@example.test", mobile: "00000000000", emailStatus: "unverified" }] } }),
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const cashier: AuthenticatedUser = { id: "cashier-1", name: "Casey Cashier (sample)", role: "cashier" };
    render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={["/students/student-1"]}><Routes><Route path="/students/:id" element={<LiveStudentProfilePage user={cashier} />} /></Routes></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByText("Jordan Sample Student")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View statement" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute("href", "/payments/new?student=student-1");
    expect(screen.getByText("Jamie Sample Guardian")).toBeInTheDocument();
    expect(screen.getByText("Email status: unverified")).toBeInTheDocument();
  });

  it("renders guardian contacts and financial context for Registrar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "student-2", studentNo: "SAMPLE-4002", fullName: "Avery Sample Student", gradeLevel: "Grade 4", section: "Orchid", status: "enrolled", balanceCents: 5000, guardians: [{ fullName: "Alex Sample Guardian", relationship: "Parent", email: "alex.guardian@example.test", mobile: "00000000000", emailStatus: "verified" }] } }),
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const registrar: AuthenticatedUser = { id: "registrar-1", name: "Riley Registrar (sample)", role: "registrar" };
    render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={["/students/student-2"]}><Routes><Route path="/students/:id" element={<LiveStudentProfilePage user={registrar} />} /></Routes></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByText("Avery Sample Student")).toBeInTheDocument();
    expect(screen.getByText("Grade")).toBeInTheDocument();
    expect(screen.getByText("Section")).toBeInTheDocument();
    expect(screen.getByText("Enrollment status")).toBeInTheDocument();
    expect(screen.getByText("Alex Sample Guardian")).toBeInTheDocument();
    expect(screen.getByText("Current school-year balance")).toBeInTheDocument();
  });
});
