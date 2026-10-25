import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { SettingsPage } from "@/features/operations/OperationalPages";

describe("live finance settings", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DATA_SOURCE", "live");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function renderSettings(section: "fees" | "plans", editable = false) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={queryClient}><MemoryRouter><SettingsPage section={section} editable={editable} /></MemoryRouter></QueryClientProvider>);
  }

  it("shows persisted fee schedules to read-only roles without mock edit actions", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{
        id: "schedule-1",
        schoolYear: "SY sample-current",
        gradeLevel: "Grade 4",
        name: "Grade 4 sample schedule",
        active: true,
        items: [{ id: "fee-1", name: "Tuition (sample)", category: "tuition", amountCents: 250000, required: true, active: true, version: 1 }],
      }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    renderSettings("fees");

    expect(screen.getByRole("heading", { name: "Fees" })).toBeInTheDocument();
    expect(await screen.findByText("Grade 4 sample schedule")).toBeInTheDocument();
    expect(screen.getByText("₱2,500.00")).toBeInTheDocument();
    expect(screen.getByText("These finance settings are read-only for your role.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add fee item/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/settings/finance/fees", expect.objectContaining({ credentials: "include" }));
  });

  it("lets Accounting add a fee item and explains versioned changes", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === "/api/settings/finance/fees") {
        return { ok: true, status: 200, json: async () => ({ data: [{
          id: "schedule-1", schoolYear: "SY sample-current", gradeLevel: "Grade 4", name: "Grade 4 sample schedule", active: true, items: [],
        }] }) };
      }
      if (url === "/api/settings/finance/fees/schedule-1/items" && options?.method === "POST") {
        return { ok: true, status: 201, json: async () => ({ data: { id: "fee-2" } }) };
      }
      if (url === "/sanctum/csrf-cookie") return { ok: true, status: 204, json: async () => ({}) };
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderSettings("fees", true);

    fireEvent.click(await screen.findByRole("button", { name: "Add fee item" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Materials (sample)" } });
    fireEvent.change(screen.getByLabelText("Amount (PHP)"), { target: { value: "125.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Add fee item" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/settings/finance/fees/schedule-1/items", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "Materials (sample)", category: "tuition", amount_cents: 12550, required: true }),
    })));
    expect(screen.getByText("Your role may manage fee items. Changes create a new version and apply to new accounts only.")).toBeInTheDocument();
  });

  it("shows persisted plan structure and accurately reports unavailable edits", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{
        id: "plan-1",
        name: "Two-part sample plan",
        downPaymentType: "amount",
        downPaymentValue: 25000,
        active: true,
        installments: [{ label: "First installment", sequence: 1, dueDayOffset: 30, percentOfRemainingBasisPoints: 10000 }],
      }] }),
    }));
    renderSettings("plans", true);

    expect(screen.getByRole("heading", { name: "Plans" })).toBeInTheDocument();
    expect(await screen.findByText("Two-part sample plan")).toBeInTheDocument();
    expect(screen.getByText("First installment")).toBeInTheDocument();
    expect(screen.getByText("Your role may manage finance settings, but payment plan changes are not available yet.")).toBeInTheDocument();
  });

  it("uses a general API error when finance settings cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));
    renderSettings("fees");

    expect(await screen.findByRole("alert")).toHaveTextContent("The request could not be completed. Please try again.");
    expect(screen.queryByText(/payment could not be saved/i)).not.toBeInTheDocument();
  });
});
