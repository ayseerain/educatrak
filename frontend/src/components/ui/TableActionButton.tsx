import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export interface TableActionButtonProps extends Omit<ButtonProps, "children" | "size"> {
  icon: LucideIcon;
  label: string;
}

interface TableActionGroupProps {
  children: ReactNode;
  className?: string;
}

/** Keeps a row's action controls anchored while one of their labels expands. */
export function TableActionGroup({ children, className }: TableActionGroupProps) {
  return <div className={cn("flex w-full min-w-0 flex-nowrap items-center justify-start gap-1.5 whitespace-nowrap", className)}>{children}</div>;
}

/**
 * A compact row action that exposes its full label on pointer hover and keyboard focus.
 * The accessible name remains available while the label is visually collapsed.
 */
export function TableActionButton({
  icon: Icon,
  label,
  className,
  "aria-label": ariaLabel,
  ...props
}: TableActionButtonProps) {
  return (
    <Button
      {...props}
      size="sm"
      aria-label={ariaLabel ?? label}
      className={cn("group min-h-9 min-w-9 shrink-0 gap-0 px-2.5", className)}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,margin,opacity] duration-150 group-hover:ml-1.5 group-hover:max-w-48 group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:max-w-48 group-focus-visible:opacity-100 motion-reduce:transition-none">
        {label}
      </span>
    </Button>
  );
}
