import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LiveRegistrarStudentSearch } from "@/features/dashboard/components/LiveRegistrarStudentSearch";

function CurrentPath() {
  return <output aria-label="Current path">{useLocation().pathname}</output>;
}

describe("live Registrar dashboard search", () => {
  it("searches the server's amount-free student list and opens the selected enrollment overview", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: "student-1", studentNo: "SAMPLE-4001", fullName: "Jordan Sample Student", gradeLevel: "Grade 4", section: "Orchid", status: "enrolled" }],
        meta: { currentPage: 1, lastPage: 1, total: 1 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={["/"]}><Routes>
      <Route path="/" element={<LiveRegistrarStudentSearch />} />
      <Route path="/students/:id" element={<p>Student record</p>} />
    </Routes><CurrentPath /></MemoryRouter></QueryClientProvider>);

    const search = screen.getByRole("combobox", { name: "Search for a student" });
    fireEvent.change(search, { target: { value: "Jordan" } });
    await screen.findByRole("option", { name: /Jordan Sample Student SAMPLE-4001/ });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/students?query=Jordan&page=1&per_page=10", expect.objectContaining({ credentials: "include" })));
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(search).toHaveAttribute("aria-activedescendant", "registrar-student-option-0");
    fireEvent.keyDown(search, { key: "Enter" });

    expect(screen.getByText("Student record")).toBeInTheDocument();
    expect(screen.getByLabelText("Current path")).toHaveTextContent("/students/student-1");
  });

  it("lets keyboard users dismiss results with Escape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: "student-1", studentNo: "SAMPLE-4001", fullName: "Jordan Sample Student", gradeLevel: "Grade 4", section: "Orchid", status: "enrolled" }],
        meta: { currentPage: 1, lastPage: 1, total: 1 },
      }),
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><MemoryRouter><LiveRegistrarStudentSearch /></MemoryRouter></QueryClientProvider>);

    const search = screen.getByRole("combobox", { name: "Search for a student" });
    fireEvent.change(search, { target: { value: "Jordan" } });
    await screen.findByRole("option", { name: /Jordan Sample Student SAMPLE-4001/ });
    fireEvent.keyDown(search, { key: "Escape" });

    expect(search).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keeps listbox options out of the Tab sequence", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: "student-1", studentNo: "SAMPLE-4001", fullName: "Jordan Sample Student", gradeLevel: "Grade 4", section: "Orchid", status: "enrolled" }],
        meta: { currentPage: 1, lastPage: 1, total: 1 },
      }),
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><MemoryRouter><LiveRegistrarStudentSearch /></MemoryRouter></QueryClientProvider>);

    fireEvent.change(screen.getByRole("combobox", { name: "Search for a student" }), { target: { value: "Jordan" } });
    const option = await screen.findByRole("option", { name: /Jordan Sample Student SAMPLE-4001/ });

    expect(option).toHaveAttribute("tabindex", "-1");
  });
});
