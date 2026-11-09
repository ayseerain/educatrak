import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface DropdownSelectOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface DropdownSelectProps<TValue extends string> {
  value: TValue;
  options: DropdownSelectOption<TValue>[];
  onChange: (value: TValue) => void;
  "aria-label": string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  align?: "start" | "center" | "end";
}

export function DropdownSelect<TValue extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
  className,
  contentClassName,
  disabled = false,
  align = "end",
}: DropdownSelectProps<TValue>) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-required={ariaRequired}
          disabled={disabled}
          className={cn("dropdown-trigger", className)}
        >
          <span>{selectedOption?.label}</span>
          <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.25} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className={cn(
            "dropdown-menu z-50 max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height))] min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-md border border-border bg-white p-1 shadow-raised",
            contentClassName,
          )}
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={(nextValue) => onChange(nextValue as TValue)}>
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className="dropdown-menu-item"
              >
                <span>{option.label}</span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
