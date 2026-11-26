import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { SettingsPage } from "@/features/operations/OperationalPages";

const years = [
  {
    id: "2", label: "SY sample-next", current: false, startsOn: "2027-06-01", endsOn: "2028-05-31", datesLocked: false, terms: [],
  },
  {
    id: "1", label: "SY sample-current", current: true, startsOn: "2026-06-01", endsOn: "2027-05-31", datesLocked: true,
    terms: [{
      id: "10", schoolYearId: "1", name: "First term (sample)", sequence: 1, startsOn: "2026-06-01", endsOn: "2026-10-31",
      examPeriods: [{ id: "100", termId: "10", name: "Midterm (sample)", startsOn: "2026-08-10", endsOn: "2026-08-14" }],
    }],
  },
];

const gradeNames = ["Kinder", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const grades = gradeNames.map((name, sortOrder) => ({
  id: `grade-${sortOrder}`,
  name,
  sortOrder,
  active: true,
  sections: name === "Grade 7" ? [
    { id: "70", gradeLevelId: "grade-7", name: "Olive (sample)", active: true },
    { id: "71", gradeLevelId: "grade-7", name: "Maple (sample)", active: false },
  ] : [],
}));

function json(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

type Handler = (url: string, options?: RequestInit) => ReturnType<typeof json> | undefined;

function stubApi(handler: Handler = () => undefined) {
  const fetchMock = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    const handled = handler(url, options);
    if (handled) return handled;
    if (url === "/sanctum/csrf-cookie") return json(204, {});
    if (url === "/api/settings/school-years" && !options?.method) return json(200, { data: years });
    if (url === "/api/settings/grade-levels" && !options?.method) return json(200, { data: grades });
    throw new Error(`Unexpected request: ${options?.method ?? "GET"} ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function writes(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([, options]) => options?.method === "POST" || options?.method === "PATCH");
}

function renderSchool(editable: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter><SettingsPage section="school" editable={editable} /></MemoryRouter></QueryClientProvider>);
}

describe("live school structure settings", () => {
  beforeEach(() => vi.stubEnv("VITE_DATA_SOURCE", "live"));

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("shows years, terms, exam periods, grades and sections read-only to Accounting", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi();
    renderSchool(false);

    expect(screen.getByRole("heading", { name: "School settings" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "SY sample-current" })).toBeInTheDocument();
    expect(screen.getByText(/dates locked by billing accounts/)).toBeInTheDocument();
    expect(screen.getByText("First term (sample)")).toBeInTheDocument();
    expect(screen.getByText("Midterm (sample)")).toBeInTheDocument();
    await screen.findByRole("button", { name: "Grade level" });
    await user.click(screen.getByRole("button", { name: "Grade level" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Grade 7" }));
    expect(screen.getAllByText("Grade 7")).toHaveLength(2);
    expect(screen.getByText("Maple (sample)")).toBeInTheDocument();
    expect(screen.getByText("You have read-only access to these settings.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add|edit|make current/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/settings/school-years", expect.anything());
    expect(fetchMock).toHaveBeenCalledWith("/api/settings/grade-levels", expect.anything());
  });

  it("lets an Administrator add a school year and refreshes the list", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi((url, options) => url === "/api/settings/school-years" && options?.method === "POST" ? json(201, { data: {} }) : undefined);
    renderSchool(true);

    await user.click(await screen.findByRole("button", { name: "Add school year" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^Label/), "SY sample-later");
    await user.type(within(dialog).getByLabelText(/^Start date/), "2028-06-01");
    await user.type(within(dialog).getByLabelText(/^End date/), "2029-05-31");
    await user.click(within(dialog).getByRole("button", { name: "Add school year" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(writes(fetchMock)).toEqual([["/api/settings/school-years", expect.objectContaining({
      method: "POST", body: JSON.stringify({ label: "SY sample-later", starts_on: "2028-06-01", ends_on: "2029-05-31" }),
    })]]);
    expect(fetchMock.mock.calls.filter(([url, options]) => url === "/api/settings/school-years" && !options?.method)).toHaveLength(2);
  });

  it("locks dates on a year with billing accounts and sends only the changed label", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi((url, options) => url === "/api/settings/school-years/1" && options?.method === "PATCH" ? json(200, { data: {} }) : undefined);
    renderSchool(true);

    const card = (await screen.findByRole("heading", { name: "SY sample-current" })).closest("div.overflow-x-auto") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "Edit" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText(/^Start date/)).toBeDisabled();
    expect(within(dialog).getAllByText("Locked: billing accounts exist for this school year.")).toHaveLength(2);
    await user.clear(within(dialog).getByLabelText(/^Label/));
    await user.type(within(dialog).getByLabelText(/^Label/), "SY sample-renamed");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(writes(fetchMock)).toEqual([["/api/settings/school-years/1", expect.objectContaining({
      method: "PATCH", body: JSON.stringify({ label: "SY sample-renamed" }),
    })]]));
  });

  it("requires a reason to make a year current and shows the server's 409 message", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi((url, options) => url === "/api/settings/school-years/2/make-current" && options?.method === "POST"
      ? json(409, { message: "This school year is already the current school year." })
      : undefined);
    renderSchool(true);

    await user.click(await screen.findByRole("button", { name: "Make current" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Make SY sample-next the current school year" })).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/^Reason for the change/), "Enrollment for the new year opened (sample).");
    await user.click(within(dialog).getByRole("button", { name: "Make current" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("This school year is already the current school year.");
    expect(writes(fetchMock)[0]?.[1]).toEqual(expect.objectContaining({ body: JSON.stringify({ reason: "Enrollment for the new year opened (sample)." }) }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("adds a term to a locked year without sending dates", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi((url, options) => url === "/api/settings/school-years/1/terms" && options?.method === "POST" ? json(201, { data: {} }) : undefined);
    renderSchool(true);

    const card = (await screen.findByRole("heading", { name: "SY sample-current" })).closest("div.overflow-x-auto") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "Add term" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText(/^Start date/)).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/^Term name/), "Second term (sample)");
    await user.click(within(dialog).getByRole("button", { name: "Add term" }));

    await waitFor(() => expect(writes(fetchMock)).toEqual([["/api/settings/school-years/1/terms", expect.objectContaining({
      body: JSON.stringify({ name: "Second term (sample)", sequence: 2 }),
    })]]));
  });

  it("uses the canonical grades in one centralized Add section dialog", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi((url, options) => url === "/api/settings/grade-levels/grade-7/sections" && options?.method === "POST"
      ? json(201, { data: {} })
      : undefined);
    renderSchool(true);

    expect(screen.queryByRole("button", { name: "Add grade level" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Order" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Add section" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Grade level" }));
    expect(screen.getAllByRole("menuitemradio").map((option) => option.textContent)).toEqual(["Select grade level", ...gradeNames]);
    await user.click(screen.getByRole("menuitemradio", { name: "Grade 7" }));
    await user.type(within(dialog).getByLabelText(/^Section name/), "Cedar (sample)");
    await user.click(within(dialog).getByRole("button", { name: "Add section" }));

    await waitFor(() => expect(writes(fetchMock)).toEqual([["/api/settings/grade-levels/grade-7/sections", expect.objectContaining({
      method: "POST", body: JSON.stringify({ name: "Cedar (sample)" }),
    })]]));
  });

  it("deactivates a section by sending only the active flag", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi((url, options) => url === "/api/settings/sections/70" && options?.method === "PATCH" ? json(200, { data: {} }) : undefined);
    renderSchool(true);

    await user.click(await screen.findByRole("button", { name: "Grade level" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Grade 7" }));
    await user.click(await screen.findByRole("button", { name: "Edit section Olive (sample) in Grade 7" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByLabelText(/^Active/));
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(writes(fetchMock)).toEqual([["/api/settings/sections/70", expect.objectContaining({
      method: "PATCH", body: JSON.stringify({ active: false }),
    })]]));
  });

  it("keeps the mock school page in mock mode", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "mock");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderSchool(false);

    expect(screen.getByText("Manage school year, terms, exam periods, grades, sections, and payment methods.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
