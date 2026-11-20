import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AccountWizardPage } from "@/features/operations/OperationalPages";

const options = {
  currentSchoolYear: { id: "1", label: "SY sample-current" },
  paymentPlans: [{
    id: "4", name: "Quarterly (sample)", version: 2, downPaymentType: "percent", downPaymentValue: 1500,
    installments: [{ label: "Installment 1", sequence: 1, dueDayOffset: 30, percentOfRemainingBasisPoints: 10000 }],
  }],
};

const students = [{ id: "9", number: "000000000903", name: "Account Student (sample)", grade: "Grade 7 (sample)", section: "Olive", balance_cents: 0 }];

const fullPreview = {
  paymentPlanVersion: 2,
  items: [
    { feeItemId: "11", name: "Tuition (sample)", category: "tuition", amountCents: 1_000_000, required: true },
    { feeItemId: "12", name: "Laboratory (sample)", category: "other", amountCents: 50_000, required: false },
  ],
  totalDueCents: 1_050_000,
  installments: [
    { label: "Down payment", sequence: 1, dueDate: "2026-11-20", amountCents: 157_500 },
    { label: "Installment 1", sequence: 2, dueDate: "2026-12-20", amountCents: 892_500 },
  ],
};

const reducedPreview = {
  ...fullPreview,
  items: [fullPreview.items[0]],
  totalDueCents: 1_000_000,
  installments: [
    { label: "Down payment", sequence: 1, dueDate: "2026-11-20", amountCents: 150_000 },
    { label: "Installment 1", sequence: 2, dueDate: "2026-12-20", amountCents: 850_000 },
  ],
};

function json(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

function stubApi(overrides: { options?: unknown; preview?: (body: { excluded_fee_item_ids: number[] }) => ReturnType<typeof json>; create?: () => ReturnType<typeof json> } = {}) {
  const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/sanctum/csrf-cookie") return json(204, {});
    if (url === "/api/billing-accounts/creation-options") return json(200, { data: overrides.options ?? options });
    if (url.startsWith("/api/payment-students?query=")) return json(200, { data: students });
    if (url === "/api/billing-accounts/preview") {
      const body = JSON.parse(String(init?.body));
      return overrides.preview?.(body) ?? json(200, { data: body.excluded_fee_item_ids.length ? reducedPreview : fullPreview });
    }
    if (url === "/api/billing-accounts" && init?.method === "POST") return overrides.create?.() ?? json(201, { data: { id: "55" } });
    throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderWizard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={["/accounts/new"]}><Routes>
    <Route path="/accounts/new" element={<AccountWizardPage />} />
    <Route path="/accounts/:id" element={<p>Account detail page</p>} />
  </Routes></MemoryRouter></QueryClientProvider>);
}

async function pickStudent(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Student name or LRN"), "Account");
  await user.click(await screen.findByRole("button", { name: /Account Student \(sample\)/ }));
}

describe("live account wizard", () => {
  beforeEach(() => vi.stubEnv("VITE_DATA_SOURCE", "live"));

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("previews, removes an optional fee, then creates the account and opens it", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi();
    renderWizard();

    expect(await screen.findByText("SY sample-current")).toBeInTheDocument();
    await pickStudent(user);
    expect(await screen.findByText("Tuition (sample)")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Tuition \(sample\)/ })).toBeDisabled();
    expect(screen.getByRole("row", { name: /Total due ₱10,500.00/ })).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Laboratory \(sample\)/ }));
    expect(await screen.findByRole("row", { name: /Total due ₱10,000.00/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Installment 1 .* ₱8,500.00/ })).toBeInTheDocument();

    const create = screen.getByRole("button", { name: "Create account" });
    expect(create).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /Create a new billing account for Account Student/ }));
    await user.click(create);

    expect(await screen.findByText("Account detail page")).toBeInTheDocument();
    const createCall = fetchMock.mock.calls.find(([url, init]) => url === "/api/billing-accounts" && init?.method === "POST");
    expect(createCall?.[1]).toEqual(expect.objectContaining({
      body: JSON.stringify({ student_id: 9, school_year_id: 1, payment_plan_id: 4, excluded_fee_item_ids: [12] }),
    }));
  });

  it("shows the server's 422 when the student already has an account and offers no create", async () => {
    const user = userEvent.setup();
    stubApi({ preview: () => json(422, { message: "Invalid.", errors: { student_id: ["This student already has a billing account for this school year."] } }) });
    renderWizard();

    await pickStudent(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("This student already has a billing account for this school year.");
    expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument();
  });

  it("explains a missing fee schedule for the student's grade", async () => {
    const user = userEvent.setup();
    stubApi({ preview: () => json(422, { message: "Invalid.", errors: { fee_schedule: ["No active fee schedule is configured for this grade level and school year."] } }) });
    renderWizard();

    await pickStudent(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("No active fee schedule is configured for this grade level and school year.");
  });

  it("blocks creation when no school year is current", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi({ options: { ...options, currentSchoolYear: null } });
    renderWizard();

    expect(await screen.findByRole("alert")).toHaveTextContent("No current school year is configured.");
    await pickStudent(user);
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/billing-accounts/preview")).toBe(false);
  });

  it("keeps the wizard open with the error when create is rejected", async () => {
    const user = userEvent.setup();
    stubApi({ create: () => json(422, { message: "Invalid.", errors: { student_id: ["This student already has a billing account for this school year."] } }) });
    renderWizard();

    await pickStudent(user);
    await user.click(await screen.findByRole("checkbox", { name: /Create a new billing account for Account Student/ }));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This student already has a billing account for this school year.");
    expect(screen.queryByText("Account detail page")).not.toBeInTheDocument();
  });

  it("keeps the mock wizard in mock mode", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "mock");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWizard();

    expect(screen.getByText("Set up an account for one student and one school year.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
