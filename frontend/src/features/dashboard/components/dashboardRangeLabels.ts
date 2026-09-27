import type { DashboardRange } from "@/api/dashboardTypes";
import { en } from "@/i18n/en";
import { DASHBOARD_RANGE_OPTIONS } from "./DashboardRangeFilter";

export function dashboardRangeLabel(range: DashboardRange): string {
  return (
    DASHBOARD_RANGE_OPTIONS.find((option) => option.value === range)?.label.toLowerCase() ??
    en.dashboard.rangeLast7Days.toLowerCase()
  );
}

export function financialStatLabelsForRange(range: DashboardRange): {
  collections: string;
  payments: string;
} {
  if (range === "today") {
    return {
      collections: en.dashboard.todayCollections,
      payments: en.dashboard.paymentsToday,
    };
  }

  const rangeLabel = dashboardRangeLabel(range);

  return {
    collections: en.dashboard.rangeCollections.replace("{range}", rangeLabel),
    payments: en.dashboard.paymentsInRange.replace("{range}", rangeLabel),
  };
}
