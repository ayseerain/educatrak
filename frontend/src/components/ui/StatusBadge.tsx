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
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        STATUS_TONE_STYLES[presentation.tone].badge,
        className,
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span>{presentation.label}</span>
    </span>
  );
}
