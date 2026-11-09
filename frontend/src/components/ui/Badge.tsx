import * as React from "react";
import { CheckCircle2, Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type BadgeTone = "success" | "warning" | "error" | "info" | "neutral";

// CLINIQ "soft" badge: a 10% tint of the tone with a text-primary label (tinted-on-tint
// colored text drops below 4.5:1). Pair with an icon or a meaningful label, never color alone.
const TONE_STYLES: Record<BadgeTone, string> = {
  success: "bg-status-success/10 text-text-primary",
  warning: "bg-status-warning/10 text-text-primary",
  error: "bg-status-error/10 text-text-primary",
  info: "bg-status-info/10 text-text-primary",
  neutral: "bg-surface text-text-secondary",
};

const TONE_ICONS: Partial<Record<BadgeTone, LucideIcon>> = {
  success: CheckCircle2,
  warning: TriangleAlert,
  error: OctagonAlert,
  info: Info,
};

const ICON_TONE: Record<BadgeTone, string> = {
  success: "text-status-success",
  warning: "text-status-warning",
  error: "text-status-error",
  info: "text-status-info",
  neutral: "text-text-secondary",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: BadgeTone;
  label: string;
  /** Overrides the tone's default icon; `null` for a text-only badge. Neutral has none by default. */
  icon?: LucideIcon | null;
}

export function Badge({ tone, label, icon, className, ...props }: BadgeProps) {
  const Icon = icon === null ? undefined : (icon ?? TONE_ICONS[tone]);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold forced-colors:border print:border print:border-current",
        TONE_STYLES[tone],
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" className={cn("h-3 w-3 shrink-0", ICON_TONE[tone])} strokeWidth={2.25} />}
      {label}
    </span>
  );
}
