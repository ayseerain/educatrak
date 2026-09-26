import * as React from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "success" | "warning" | "error" | "info" | "neutral";

const TONE_STYLES: Record<BadgeTone, string> = {
  success: "bg-[#EAF6EC] text-status-success",
  warning: "bg-[#FBF0E1] text-status-warning",
  error: "bg-[#FBEAEA] text-status-error",
  info: "bg-[#E8F1FB] text-status-info",
  neutral: "bg-surface text-text-secondary",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: BadgeTone;
  label: string;
}

export function Badge({ tone, label, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        TONE_STYLES[tone],
        className,
      )}
      {...props}
    >
      {label}
    </span>
  );
}
