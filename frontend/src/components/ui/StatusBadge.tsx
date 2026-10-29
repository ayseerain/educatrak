import { cn } from "@/lib/cn";
import {
  STATUS_TONE_STYLES,
  getStatusPresentation,
} from "@/lib/status";
import { CircleDashed } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const presentation = getStatusPresentation(status) ?? {
    label: status,
    tone: "neutral",
    icon: CircleDashed,
  };

  const Icon = presentation.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold forced-colors:border print:border print:border-current",
        STATUS_TONE_STYLES[presentation.tone].badge,
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn("h-3 w-3 shrink-0", STATUS_TONE_STYLES[presentation.tone].text)} strokeWidth={2.25} />
      <span>{presentation.label}</span>
    </span>
  );
}
