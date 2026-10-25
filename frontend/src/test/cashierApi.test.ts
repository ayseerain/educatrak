import { afterEach, describe, expect, it, vi } from "vitest";
import { listPayments } from "@/api/cashierApi";

describe("payment history API filters", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("serializes every supported filter and page into the Laravel query", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], meta: { current_page: 2, last_page: 3, total: 54, per_page: 10 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listPayments({
      query: "S-TEST-1001",
      status: "valid",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-24",
      cashier: "Taylor Sample",
      method: "cash",
      amountMinCents: 1_000,
      amountMaxCents: 50_000,
      page: 2,
    })).resolves.toEqual({ data: [], currentPage: 2, lastPage: 3, total: 54, perPage: 10 });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments?query=S-TEST-1001&status=valid&date_from=2026-10-01&date_to=2026-10-24&cashier=Taylor+Sample&method=cash&amount_min_cents=1000&amount_max_cents=50000&page=2&per_page=10",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
