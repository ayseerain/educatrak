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
          "border border-brand-green-dark bg-white text-brand-green-dark hover:bg-[#F4FAF5]",
        neutral:
          "border border-border bg-white text-text-secondary hover:bg-surface hover:text-text-primary",
        ghost: "text-brand-green-dark hover:bg-[#F4FAF5]",
        success: "bg-status-success text-white hover:bg-[#185f2e]",
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
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
