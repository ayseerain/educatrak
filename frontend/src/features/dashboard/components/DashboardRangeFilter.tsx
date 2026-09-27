import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import type { DashboardRange, DashboardRangeOption } from "@/api/dashboardTypes";
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
  const selectedOption = DASHBOARD_RANGE_OPTIONS.find((option) => option.value === value);

  return (
    <label className="flex items-center gap-2 text-sm text-text-secondary">
      <span>{en.dashboard.filterRange}</span>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={en.dashboard.filterRange}
            className="dropdown-trigger"
          >
            <span>{selectedOption?.label}</span>
            <ChevronDown aria-hidden="true" className="size-4 text-text-secondary" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-52 rounded-md border border-border bg-white p-1 shadow-lg"
          >
            <DropdownMenu.RadioGroup
              value={value}
              onValueChange={(nextValue) => onChange(nextValue as DashboardRange)}
            >
              {DASHBOARD_RANGE_OPTIONS.map((option) => (
                <DropdownMenu.RadioItem
                  key={option.value}
                  value={option.value}
                  className="flex min-h-10 cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-text-primary outline-none transition-colors hover:bg-surface focus:bg-surface data-[state=checked]:bg-[#e8f5e9] data-[state=checked]:font-medium data-[state=checked]:text-brand-green-dark"
                >
                  <DropdownMenu.ItemIndicator className="flex size-4 items-center justify-center">
                    <Check aria-hidden="true" className="size-4" />
                  </DropdownMenu.ItemIndicator>
                  <span>{option.label}</span>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </label>
  );
}
