import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary as fetchMockDashboardSummary } from "@/api/mockAdapter";
import { fetchDashboardSummary as fetchLiveDashboardSummary } from "@/api/dashboardApi";
import { isLiveCashierApiEnabled } from "@/api/cashierApi";
import type { AuthenticatedUser } from "@/lib/types";
import type { DashboardRange } from "@/api/dashboardTypes";

/**
 * Fetches the authenticated user's role-specific dashboard summary
 * (GET /dashboard). Presentational components never fetch data
 * directly — they consume this hook instead.
 */
export function useDashboard(user: AuthenticatedUser, range: DashboardRange) {
  return useQuery({
    queryKey: ["dashboard", user.id, user.role, range],
    queryFn: () => isLiveCashierApiEnabled()
      ? fetchLiveDashboardSummary(range)
      : fetchMockDashboardSummary(user, range),
    enabled: user.role !== "registrar",
    staleTime: 30_000,
  });
}
