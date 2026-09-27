import type { DashboardRange, DashboardRangeOption } from "@/api/dashboardTypes";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { en } from "@/i18n/en";

export const DASHBOARD_RANGE_OPTIONS: DashboardRangeOption[] = [
  { value: "today", label: en.dashboard.rangeToday, days: 1 },
  { value: "last_7_days", label: en.dashboard.rangeLast7Days, days: 7 },
  { value: "last_30_days", label: en.dashboard.rangeLast30Days, days: 30 },
  { value: "school_year", label: en.dashboard.rangeSchoolYear, days: null },
];

interface DashboardRangeFilterProps {
  value: DashboardRange;
  onChange: (value: DashboardRange) => void;
}

export function DashboardRangeFilter({ value, onChange }: DashboardRangeFilterProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-text-secondary">
      <span>{en.dashboard.filterRange}</span>
      <DropdownSelect
        aria-label={en.dashboard.filterRange}
        value={value}
        options={DASHBOARD_RANGE_OPTIONS}
        onChange={onChange}
      />
    </label>
  );
}
