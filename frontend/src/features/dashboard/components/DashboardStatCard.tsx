import { Link } from "react-router-dom";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { CARD_SURFACE } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

interface DashboardStatCardProps {
  label: string;
  value: string;
  helperText?: string;
  icon?: LucideIcon;
  action?: { to: string; label: string };
}

/** CLINIQ stat card: semibold label with a tinted icon chip, a large bold figure, a quiet scope line. */
export function DashboardStatCard({
  label,
  value,
  helperText,
  icon: Icon,
  action,
}: DashboardStatCardProps) {
  return (
    <div className={cn(CARD_SURFACE, "flex w-full flex-col gap-2 p-5 print:break-inside-avoid")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-text-secondary">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-green-light/30 text-brand-green-dark">
            <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          </span>
        )}
      </div>
      <p className="-mt-1 truncate text-3xl font-bold tabular-nums tracking-tight text-text-primary">{value}</p>
      {helperText && <p className="text-xs text-text-secondary">{helperText}</p>}
      {action && (
        <Link
          to={action.to}
          className="mt-auto inline-flex min-h-control items-center gap-1 self-start text-sm font-semibold text-brand-green-dark underline decoration-brand-green-dark/40 underline-offset-2 transition-colors hover:text-brand-green hover:decoration-brand-green motion-reduce:transition-none"
        >
          {action.label}
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        </Link>
      )}
    </div>
  );
}
