import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { SettingsPage } from "@/features/operations/OperationalPages";

const sampleSettings = {
  schoolName: "Sample Christian School",
  schoolAddress: null,
  receiptTitle: "Official Receipt",
  paperSize: "Letter",
  emailSenderName: "Sample Billing Office",
  emailSenderAddress: "billing@school.example",
  emailDailySendLimit: 100,
  nextReceiptSequence: 12,
  nextReceiptNumber: "OR-2026-000012",
};

function json(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

function renderSettings(section: "receipt" | "email", editable: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter><SettingsPage section={section} editable={editable} /></MemoryRouter></QueryClientProvider>);
}

describe("live system settings", () => {
  beforeEach(() => vi.stubEnv("VITE_DATA_SOURCE", "live"));

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("shows receipt settings read-only to Accounting with no edit control", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { data: sampleSettings }));
    vi.stubGlobal("fetch", fetchMock);
    renderSettings("receipt", false);

    expect(screen.getByRole("heading", { name: "Receipts" })).toBeInTheDocument();
    expect(await screen.findByText("Sample Christian School")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /School address Not set/ })).toBeInTheDocument();
    expect(screen.getByText("OR-2026-000012")).toBeInTheDocument();
    expect(screen.getByText("You have read-only access to these settings.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit receipt settings/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/settings/system", expect.objectContaining({ credentials: "include" }));
  });

  it("lets an Administrator save only the changed receipt fields", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === "/sanctum/csrf-cookie") return json(204, {});
      if (url === "/api/settings/system" && options?.method === "PATCH") {
        return json(200, { data: { ...sampleSettings, schoolName: "Renamed Sample School", paperSize: "A4" } });
      }
      if (url === "/api/settings/system") return json(200, { data: sampleSettings });
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderSettings("receipt", true);

    await user.click(await screen.findByRole("button", { name: "Edit receipt settings" }));
    const dialog = screen.getByRole("dialog");
    await user.clear(within(dialog).getByLabelText("School name"));
    await user.type(within(dialog).getByLabelText("School name"), "Renamed Sample School");
    await user.click(within(dialog).getByRole("button", { name: "Paper size" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "A4" }));
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/settings/system", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ school_name: "Renamed Sample School", paper_size: "A4" }),
    })));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Renamed Sample School")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Paper size A4/ })).toBeInTheDocument();
  });

  it("does not send a request when nothing changed", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(json(200, { data: sampleSettings }));
    vi.stubGlobal("fetch", fetchMock);
    renderSettings("email", true);

    await user.click(await screen.findByRole("button", { name: "Edit email settings" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByRole("status")).toHaveTextContent("No changes to save.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a 422 validation message under the rejected field and focuses it", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === "/sanctum/csrf-cookie") return json(204, {});
      if (url === "/api/settings/system" && options?.method === "PATCH") {
        return json(422, { message: "The given data was invalid.", errors: { email_sender_name: ["The email sender name field must not be greater than 120 characters."] } });
      }
      if (url === "/api/settings/system") return json(200, { data: sampleSettings });
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderSettings("email", true);

    await user.click(await screen.findByRole("button", { name: "Edit email settings" }));
    const senderName = screen.getByLabelText("Sender name");
    await user.clear(senderName);
    await user.type(senderName, "Changed sender (sample)");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("must not be greater than 120 characters");
    expect(senderName).toHaveAttribute("aria-invalid", "true");
    expect(senderName).toHaveFocus();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the email settings without the unapproved test-email or SMS rows", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { data: sampleSettings })));
    renderSettings("email", false);

    expect(await screen.findByText("100 messages")).toBeInTheDocument();
    expect(screen.getByText("billing@school.example")).toBeInTheDocument();
    expect(screen.queryByText(/test email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SMS/)).not.toBeInTheDocument();
  });

  it("shows a retryable error when settings cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(500, {})));
    renderSettings("receipt", true);

    expect(await screen.findByRole("alert")).toHaveTextContent("The request could not be completed. Please try again.");
    expect(screen.queryByRole("button", { name: /edit receipt settings/i })).not.toBeInTheDocument();
  });

  it("keeps the mock receipt page in mock mode", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "mock");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderSettings("receipt", false);

    expect(screen.getByText("Set school header, receipt title, and configured paper size.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
