import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
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
          disabled={disabled}
          className={cn("dropdown-trigger", className)}
        >
          <span>{selectedOption?.label}</span>
          <ChevronDown aria-hidden="true" className="size-4 text-text-secondary" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className={cn(
            "dropdown-menu z-50 min-w-52 rounded-md border border-border bg-white p-1 shadow-lg",
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
  );
}
