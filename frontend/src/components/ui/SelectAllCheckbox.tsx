import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

interface SelectAllCheckboxProps {
  label: string;
  /** Accessible name when it should differ from the visible label. */
  ariaLabel?: string;
  checked: boolean;
  /** Some, not all, rows selected. */
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** "Select all" for a selectable table: sits at the left of the toolbar, above the row checkboxes, with a 44px label hit area. */
export function SelectAllCheckbox({ label, ariaLabel, checked, indeterminate = false, disabled, onChange }: SelectAllCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label className={cn(
      "inline-flex min-h-11 items-center gap-2.5 rounded-md border border-border bg-white px-3 text-sm font-semibold text-text-primary shadow-card transition-colors duration-150 motion-reduce:transition-none",
      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-brand-green hover:bg-surface",
    )}>
      <input
        ref={ref}
        type="checkbox"
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 cursor-pointer accent-brand-green-dark disabled:cursor-not-allowed"
      />
      {label}
    </label>
  );
}
