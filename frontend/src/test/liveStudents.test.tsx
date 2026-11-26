import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LiveStudentProfilePage, LiveStudentsPage } from "@/features/students/LiveStudentsPage";
import { StudentFormPage as LiveStudentFormPage } from "@/features/students/StudentFormPage";
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
      json: async () => ({ data: [{ id: "student-3", lrn: "SAMPLE-4003", fullName: "Morgan Sample Student", gradeLevel: "Grade 5", section: "Maple", status: "enrolled", balanceCents: 12345 }], meta: { currentPage: 1, lastPage: 1, total: 1 } }),
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
    expect(screen.getByRole("textbox", { name: /LRN/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /mobile number/i })).toBeInTheDocument();
  });

  it("opens the live Add Student form and saves a valid student after options load", async () => {
    const requests: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/student-record-options") return { ok: true, status: 200, json: async () => ({ data: { grades: [{ id: "1", name: "Grade 4", sections: [{ id: "2", name: "Orchid" }] }], statuses: ["enrolled", "inactive"] } }) };
      if (url === "/sanctum/csrf-cookie") return { ok: true, status: 204, json: async () => ({}) };
      if (url === "/api/students" && init?.method === "POST") {
        requests.push(JSON.parse(String(init.body)));
        return { ok: true, status: 201, json: async () => ({ data: { id: "sample-created" } }) };
      }
      throw new Error(`Unexpected request: ${url}`);
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={["/students/new"]}><Routes><Route path="/students/new" element={<LiveStudentFormPage />} /><Route path="/students/sample-created" element={<p>Saved profile</p>} /></Routes></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByRole("heading", { name: "Add student" })).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "LRN" }), "000000004001");
    await user.type(screen.getByRole("textbox", { name: "Student name" }), "Avery Sample Student");
    await user.click(screen.getByRole("button", { name: "Grade level" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Grade 4" }));
    await user.click(screen.getByRole("button", { name: "Section" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Orchid" }));
    await user.click(screen.getByRole("button", { name: "Create student" }));

    expect(await screen.findByText("Saved profile")).toBeInTheDocument();
    expect(requests[0]).toMatchObject({ lrn: "000000004001", grade_level_id: 1, section_id: 2, status: "enrolled" });
  });

  it("shows an options error instead of waiting indefinitely", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, headers: new Headers(), json: async () => ({ message: "Student options are unavailable." }) })));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><MemoryRouter><LiveStudentFormPage /></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByText("Student options are unavailable.")).toBeInTheDocument();
    expect(screen.queryByText("Loading student record form…")).not.toBeInTheDocument();
  });

  it("rejects an invalid LRN before sending a student record", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/student-record-options") return { ok: true, status: 200, json: async () => ({ data: { grades: [{ id: "1", name: "Grade 4", sections: [{ id: "2", name: "Orchid" }] }], statuses: ["enrolled", "inactive"] } }) };
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(<QueryClientProvider client={queryClient}><MemoryRouter><LiveStudentFormPage /></MemoryRouter></QueryClientProvider>);

    await screen.findByRole("heading", { name: "Add student" });
    await user.type(screen.getByRole("textbox", { name: "LRN" }), "123");
    await user.type(screen.getByRole("textbox", { name: "Student name" }), "Avery Sample Student");
    await user.click(screen.getByRole("button", { name: "Grade level" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Grade 4" }));
    await user.click(screen.getByRole("button", { name: "Section" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Orchid" }));
    await user.click(screen.getByRole("button", { name: "Create student" }));

    expect(screen.getByRole("alert")).toHaveTextContent("LRN must be exactly 12 digits.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the MockDB existing-student edit form when mock mode is active", () => {
    render(<MemoryRouter initialEntries={["/students/sample-1001/edit"]}><Routes><Route path="/students/:id/edit" element={<StudentFormPage edit />} /></Routes></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Edit student" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /LRN/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /mobile number/i })).toBeInTheDocument();
  });

  it("shows approved Registrar academic, personal, and guardian context without billing content", () => {
    const registrar: AuthenticatedUser = { id: "registrar-1", name: "Riley Registrar (sample)", role: "registrar" };
    render(<MemoryRouter initialEntries={["/students/sample-1001"]}><Routes><Route path="/students/:id" element={<StudentProfilePage user={registrar} />} /></Routes></MemoryRouter>);

    expect(screen.getByText("LRN")).toBeInTheDocument();
    expect(screen.getByText("Grade level")).toBeInTheDocument();
    expect(screen.getByText("Section")).toBeInTheDocument();
    expect(screen.getByText("Enrollment status")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Personal information" })).toBeInTheDocument();
    expect(screen.getByText("Guardian details")).toBeInTheDocument();
    expect(screen.queryByText("Account balance")).not.toBeInTheDocument();
    expect(screen.queryByText("Billing status")).not.toBeInTheDocument();
  });

  it("links a Cashier live student profile to payment entry only", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "student-1", lrn: "SAMPLE-4001", fullName: "Jordan Sample Student", gradeLevel: "Grade 4", section: "Orchid", status: "enrolled", balanceCents: 5000, guardians: [{ fullName: "Jamie Sample Guardian", relationship: "Parent", email: "jamie.guardian@example.test", mobile: "00000000000", emailStatus: "unverified" }] } }),
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
      json: async () => ({ data: { id: "student-2", lrn: "SAMPLE-4002", fullName: "Avery Sample Student", gradeLevel: "Grade 4", section: "Orchid", status: "enrolled", balanceCents: 5000, guardians: [{ fullName: "Alex Sample Guardian", relationship: "Parent", email: "alex.guardian@example.test", mobile: "00000000000", emailStatus: "verified" }] } }),
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

  it("asks the Registrar to confirm a shared-guardian contact change before resubmitting", async () => {
    const patchBodies: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/sanctum/csrf-cookie") return { ok: true, status: 204, json: async () => ({}) };
      if (url === "/api/student-record-options") return { ok: true, status: 200, json: async () => ({ data: { grades: [{ id: "1", name: "Grade 4", sections: [{ id: "2", name: "Orchid" }] }], statuses: ["enrolled", "inactive"] } }) };
      if (init?.method === "PATCH") {
        patchBodies.push(JSON.parse(String(init.body)));
        return patchBodies.length === 1
          ? { ok: false, status: 409, headers: new Headers(), json: async () => ({ message: "Shared guardian.", code: "shared_guardian_confirmation_required", affectedStudents: [{ id: "s1", lrn: "000000004001", fullName: "Avery Sample Student" }, { id: "s2", lrn: "000000004002", fullName: "Blake Sample Sibling" }] }) }
          : { ok: true, status: 200, json: async () => ({ data: { id: "s1" } }) };
      }
      return { ok: true, status: 200, json: async () => ({ data: { id: "s1", lrn: "000000004001", fullName: "Avery Sample Student", gradeLevel: "Grade 4", section: "Orchid", status: "enrolled", guardians: [{ id: "9", fullName: "Alex Sample Guardian", relationship: "Parent", isPrimary: true, email: "alex@example.test", mobile: null, emailStatus: "verified" }] } }) };
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={["/students/s1/edit"]}><Routes><Route path="/students/:id/edit" element={<LiveStudentFormPage edit />} /><Route path="/students/:id" element={<p>Saved profile</p>} /></Routes></MemoryRouter></QueryClientProvider>);

    fireEvent.click(await screen.findByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Update shared guardian contact?")).toBeInTheDocument();
    expect(screen.getByText("Blake Sample Sibling")).toBeInTheDocument();
    expect(patchBodies[0]?.confirm_shared_contact_update).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Update for all students" }));
    expect(await screen.findByText("Saved profile")).toBeInTheDocument();
    expect(patchBodies[1]).toMatchObject({ guardian_id: 9, confirm_shared_contact_update: true });
  });
});
