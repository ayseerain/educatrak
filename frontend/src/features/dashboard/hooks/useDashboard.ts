import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "@/api/mockAdapter";
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
    queryFn: () => fetchDashboardSummary(user, range),
    enabled: user.role !== "registrar",
    staleTime: 30_000,
  });
}
