import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "@/api/mockAdapter";
import type { AuthenticatedUser } from "@/lib/types";

/**
 * Fetches the authenticated user's role-specific dashboard summary
 * (GET /dashboard). Presentational components never fetch data
 * directly — they consume this hook instead.
 */
export function useDashboard(user: AuthenticatedUser) {
  return useQuery({
    queryKey: ["dashboard", user.id, user.role],
    queryFn: () => fetchDashboardSummary(user),
    staleTime: 30_000,
  });
}
