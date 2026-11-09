import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

// Button hierarchy follows CLINIQ's design system. #039935 with small white text
// fails WCAG AA, so primary is #035419 (brand-green-dark); hover lightens it slightly.
// Secondary is a quiet outline, neutral is cancel/back, destructive is irreversible only.
// Controls keep EducatraK's 44px minimum (min-h-control).
export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border px-4 text-sm font-semibold transition-[color,background-color,border-color,filter] duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border-brand-green-dark bg-brand-green-dark text-white shadow-raised hover:brightness-125 disabled:hover:brightness-100",
        secondary:
          "border-brand-green bg-white text-brand-green-dark shadow-card hover:bg-surface",
        neutral:
          "border-border bg-white text-text-secondary hover:bg-surface hover:text-text-primary",
        ghost: "border-transparent text-brand-green-dark hover:bg-surface",
        success: "border-status-success bg-status-success text-white hover:brightness-90",
        destructive: "border-status-error bg-status-error text-white hover:brightness-90",
      },
      size: {
        default: "min-h-control",
        sm: "min-h-[36px] px-3 gap-1.5",
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
