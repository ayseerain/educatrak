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

const TONE_ICON: Record<BadgeTone, string> = {
  success: "✓",
  warning: "!",
  error: "×",
  info: "i",
  neutral: "•",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: BadgeTone;
  label: string;
  /** Override the default glyph for this tone if needed. */
  icon?: string;
}

export function Badge({ tone, label, icon, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        TONE_STYLES[tone],
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">{icon ?? TONE_ICON[tone]}</span>
      <span>{label}</span>
    </span>
  );
}
