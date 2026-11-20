import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { SettingsPage } from "@/features/operations/OperationalPages";

const plans = [
  {
    id: "1", name: "Quarterly (sample)", downPaymentType: "amount", downPaymentValue: 25000, active: false, version: 1, previousVersionId: null,
    installments: [{ label: "Balance", sequence: 1, dueDayOffset: 30, percentOfRemainingBasisPoints: 10000 }],
  },
  {
    id: "2", name: "Quarterly (sample)", downPaymentType: "percent", downPaymentValue: 2500, active: true, version: 2, previousVersionId: "1",
    installments: [
      { label: "First half", sequence: 1, dueDayOffset: 30, percentOfRemainingBasisPoints: 5000 },
      { label: "Second half", sequence: 2, dueDayOffset: 90, percentOfRemainingBasisPoints: 5000 },
    ],
  },
];

function json(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

function stubApi(handler: (url: string, options?: RequestInit) => ReturnType<typeof json> | undefined = () => undefined) {
  const fetchMock = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    const handled = handler(url, options);
    if (handled) return handled;
    if (url === "/sanctum/csrf-cookie") return json(204, {});
    if (url === "/api/settings/finance/plans" && !options?.method) return json(200, { data: plans });
    throw new Error(`Unexpected request: ${options?.method ?? "GET"} ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const writes = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls.filter(([, options]) => options?.method === "POST" || options?.method === "PATCH");

function renderPlans(editable: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter><SettingsPage section="plans" editable={editable} /></MemoryRouter></QueryClientProvider>);
}

describe("live payment plans", () => {
  beforeEach(() => vi.stubEnv("VITE_DATA_SOURCE", "live"));

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("shows versions and lineage read-only, with preview but no write controls", async () => {
    stubApi();
    renderPlans(false);

    expect(await screen.findByText(/superseded by version 2/)).toBeInTheDocument();
    expect(screen.getByText(/25% of the total · replaces version 1/)).toBeInTheDocument();
    expect(screen.getByText("₱250.00", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText("50%")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^Preview/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /revise|deactivate|add payment plan/i })).not.toBeInTheDocument();
  });

  it("only offers Revise and Deactivate on the active latest version", async () => {
    stubApi();
    renderPlans(true);

    expect(await screen.findByRole("button", { name: "Revise Quarterly (sample)" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Revise/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /^Deactivate/ })).toHaveLength(1);
  });

  it("creates a plan with centavos and basis points", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi((url, options) => url === "/api/settings/finance/plans" && options?.method === "POST" ? json(201, { data: {} }) : undefined);
    renderPlans(true);

    await user.click(await screen.findByRole("button", { name: "Add payment plan" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^Plan name/), "Two-step (sample)");
    await user.clear(within(dialog).getByLabelText("Down payment (PHP)"));
    await user.type(within(dialog).getByLabelText("Down payment (PHP)"), "1500.50");
    await user.type(within(dialog).getByLabelText("Label"), "First (sample)");
    await user.clear(within(dialog).getByLabelText("Share (%)"));
    await user.type(within(dialog).getByLabelText("Share (%)"), "33.33");
    await user.click(within(dialog).getByRole("button", { name: "Add installment" }));
    await user.type(within(dialog).getAllByLabelText("Label")[1] as HTMLElement, "Second (sample)");
    await user.type(within(dialog).getAllByLabelText("Due after (days)")[1] as HTMLElement, "60");
    await user.type(within(dialog).getAllByLabelText("Share (%)")[1] as HTMLElement, "66.67");
    expect(within(dialog).getByText("Shares total 100% of 100%")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Add payment plan" }));

    await waitFor(() => expect(writes(fetchMock)).toEqual([["/api/settings/finance/plans", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        name: "Two-step (sample)", down_payment_type: "amount", down_payment_value: 150050,
        installments: [
          { label: "First (sample)", due_day_offset: 30, percent_of_remaining_basis_points: 3333 },
          { label: "Second (sample)", due_day_offset: 60, percent_of_remaining_basis_points: 6667 },
        ],
      }),
    })]]));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("blocks a plan whose shares do not add up to 100%", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi();
    renderPlans(true);

    await user.click(await screen.findByRole("button", { name: "Add payment plan" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^Plan name/), "Short (sample)");
    await user.type(within(dialog).getByLabelText("Label"), "Only (sample)");
    await user.clear(within(dialog).getByLabelText("Share (%)"));
    await user.type(within(dialog).getByLabelText("Share (%)"), "80");
    await user.click(within(dialog).getByRole("button", { name: "Add payment plan" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent("Installment shares must add up to exactly 100% (now 80%).");
    expect(writes(fetchMock)).toHaveLength(0);
  });

  it("revises the latest version as N+1 and shows the server's 409", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi((url, options) => url === "/api/settings/finance/plans/2" && options?.method === "PATCH"
      ? json(409, { message: "Only the latest version of a payment plan can be revised." })
      : undefined);
    renderPlans(true);

    await user.click(await screen.findByRole("button", { name: "Revise Quarterly (sample)" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Saving creates version 3 for new accounts only. Existing accounts keep version 2/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Down payment (%)")).toHaveValue(25);
    await user.click(within(dialog).getByRole("button", { name: "Save as version 3" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Only the latest version of a payment plan can be revised.");
    expect(writes(fetchMock)[0]?.[1]).toEqual(expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({
        name: "Quarterly (sample)", down_payment_type: "percent", down_payment_value: 2500,
        installments: [
          { label: "First half", due_day_offset: 30, percent_of_remaining_basis_points: 5000 },
          { label: "Second half", due_day_offset: 90, percent_of_remaining_basis_points: 5000 },
        ],
      }),
    }));
  });

  it("shows a server 422 under the matching installment field and focuses it", async () => {
    const user = userEvent.setup();
    stubApi((url, options) => url === "/api/settings/finance/plans/2" && options?.method === "PATCH"
      ? json(422, { message: "Invalid.", errors: { "installments.1.label": ["The installments.1.label field must not be greater than 120 characters."] } })
      : undefined);
    renderPlans(true);

    await user.click(await screen.findByRole("button", { name: "Revise Quarterly (sample)" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Save as version 3" }));

    const secondLabel = within(dialog).getAllByLabelText("Label")[1] as HTMLElement;
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("must not be greater than 120 characters");
    expect(secondLabel).toHaveAttribute("aria-invalid", "true");
    expect(secondLabel).toHaveFocus();
  });

  it("confirms before deactivating and can be cancelled", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi((url, options) => url === "/api/settings/finance/plans/2/deactivate" && options?.method === "POST" ? json(200, { data: {} }) : undefined);
    renderPlans(true);

    await user.click(await screen.findByRole("button", { name: "Deactivate Quarterly (sample)" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep active" }));
    expect(writes(fetchMock)).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Deactivate Quarterly (sample)" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Deactivate plan" }));
    await waitFor(() => expect(writes(fetchMock)).toEqual([["/api/settings/finance/plans/2/deactivate", expect.objectContaining({ method: "POST" })]]));
  });

  it("previews a schedule from a peso total", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi((url, options) => url === "/api/settings/finance/plans/2/preview" && options?.method === "POST"
      ? json(200, { data: { planId: "2", version: 2, totalCents: 100000, installments: [
        { label: "Down payment", sequence: 0, dueDayOffset: 0, dueDate: "2026-11-20", amountCents: 25000 },
        { label: "First half", sequence: 1, dueDayOffset: 30, dueDate: "2026-12-20", amountCents: 37500 },
        { label: "Second half", sequence: 2, dueDayOffset: 90, dueDate: "2027-02-18", amountCents: 37500 },
      ] } })
      : undefined);
    renderPlans(false);

    await user.click(await screen.findByRole("button", { name: "Preview Quarterly (sample) version 2" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Total due (PHP)"), "1000");
    await user.click(within(dialog).getByRole("button", { name: "Preview schedule" }));

    expect(await within(dialog).findByText("Down payment")).toBeInTheDocument();
    expect(within(dialog).getAllByText("₱375.00")).toHaveLength(2);
    expect(within(dialog).getByText("₱1,000.00")).toBeInTheDocument();
    expect(writes(fetchMock)[0]?.[1]).toEqual(expect.objectContaining({ body: JSON.stringify({ total_cents: 100000 }) }));
  });

  it("keeps the mock plans page in mock mode", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "mock");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderPlans(false);

    expect(screen.getByText("Plan changes apply to new accounts only; preview schedules before saving.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
