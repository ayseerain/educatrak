import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

// #039935 with normal white text fails WCAG AA, so the primary variant
// uses #035419 (brand-green-dark), which passes (spec section 11).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md min-h-control px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-green-dark text-white hover:bg-[#023d12]",
        secondary:
          "bg-white text-text-primary border border-border hover:bg-surface",
        ghost: "text-text-primary hover:bg-surface",
        destructive: "bg-status-error text-white hover:bg-[#b32828]",
      },
      size: {
        default: "min-h-control",
        sm: "min-h-[36px] px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
