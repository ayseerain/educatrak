import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  AccountWizardPage,
  ClearancePage,
  FollowupPage,
  PermitPage,
  ReportPage,
  SettingsPage,
} from "@/features/operations/OperationalPages";
import type { ReactNode } from "react";

const cashier = { id: "cashier-sample", name: "Casey Cashier (sample)", role: "cashier" as const };
const accounting = { id: "accounting-sample", name: "Avery Accounting (sample)", role: "accounting" as const };
const registrar = { id: "registrar-sample", name: "Riley Registrar (sample)", role: "registrar" as const };

describe("MockDB production workflows", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DATA_SOURCE", "mock");
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ["billing account creation", <AccountWizardPage />],
    ["reminder sending", <FollowupPage user={cashier} />],
    ["clearance decisions", <ClearancePage user={registrar} />],
    ["permit printing", <PermitPage />],
    ["school configuration", <SettingsPage section="school" editable={false} />],
    ["monthly reporting", <ReportPage type="monthly" user={accounting} />],
  ] as [string, ReactNode][]) (
    "does not require a Laravel data source for %s",
    (_name, page) => {
      const view = render(<MemoryRouter>{page}</MemoryRouter>);

      expect(screen.queryByText(/not available in the live system|unavailable until its live data source is connected/i)).not.toBeInTheDocument();

      view.unmount();
    },
  );
});
