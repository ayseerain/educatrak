import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  AccountWizardPage,
  BackupPage,
  ClearancePage,
  FollowupPage,
  ImportPage,
  PermitPage,
  ReportPage,
  SettingsPage,
} from "@/features/operations/OperationalPages";
import type { ReactNode } from "react";

const cashier = { id: "cashier-sample", name: "Casey Cashier (sample)", role: "cashier" as const };
const accounting = { id: "accounting-sample", name: "Avery Accounting (sample)", role: "accounting" as const };
const registrar = { id: "registrar-sample", name: "Riley Registrar (sample)", role: "registrar" as const };

describe("production unavailable workflows", () => {
  beforeEach(() => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_USE_LIVE_API", "");
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ["billing account creation", <AccountWizardPage />, /account creation is not available in the live system/i],
    ["reminder sending", <FollowupPage user={cashier} />, /follow-up reminders is not available in the live system/i],
    ["clearance decisions", <ClearancePage user={registrar} />, /clearance is not available in the live system/i],
    ["permit printing", <PermitPage />, /exam permits is not available in the live system/i],
    ["student import", <ImportPage />, /ledger import is not available in the live system/i],
    ["school configuration", <SettingsPage section="school" editable={false} />, /system configuration is not available in the live system/i],
    ["monthly reporting", <ReportPage type="monthly" user={accounting} />, /report is unavailable until its live data source is connected/i],
    ["backup operations", <BackupPage />, /backup and restore operations is not available in the live system/i],
  ] as [string, ReactNode, RegExp][]) (
    "does not present a mock success path for %s",
    (_name, page, message) => {
      const view = render(<MemoryRouter>{page}</MemoryRouter>);

      expect(screen.getByText(message)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /send|create account|run backup|upload|approve|print permit/i })).not.toBeInTheDocument();

      view.unmount();
    },
  );
});
