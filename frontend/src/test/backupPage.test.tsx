import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { BackupPage } from "@/features/operations/OperationalPages";
import * as mockAdapter from "@/api/mockAdapter";

describe("BackupPage", () => {
  it("displays recorded backup history instead of an unavailable page", async () => {
    vi.spyOn(mockAdapter, "listBackupRecords").mockResolvedValue([
      { id: "backup-1", result: "succeeded", sizeBytes: 2048, error: null, completedAt: "2026-10-25T03:00:00+08:00" },
    ]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<QueryClientProvider client={queryClient}><MemoryRouter><BackupPage /></MemoryRouter></QueryClientProvider>);

    await waitFor(() => expect(screen.getByRole("cell", { name: "succeeded" })).toBeInTheDocument());
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    expect(screen.queryByText(/not available in the live system/i)).not.toBeInTheDocument();
  });
});
