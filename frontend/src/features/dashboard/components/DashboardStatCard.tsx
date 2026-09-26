import { Card, CardLabel, CardValue, CardHelperText } from "@/components/ui/Card";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface DashboardStatCardProps {
  label: string;
  value: string;
  helperText?: string;
  icon?: LucideIcon;
  action?: { to: string; label: string };
}

export function DashboardStatCard({
  label,
  value,
  helperText,
  icon: Icon,
  action,
}: DashboardStatCardProps) {
  return (
    <Card className="group flex min-h-[148px] flex-col border-t-2 border-t-brand-green-light/70 p-4 transition-shadow hover:shadow-md">
      <div className="flex min-h-9 items-start justify-between gap-3">
        <CardLabel className="max-w-[12rem] leading-5">{label}</CardLabel>
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-brand-green-light/60 bg-[#EAF6EC] text-brand-green-dark">
            <Icon aria-hidden="true" className="h-[18px] w-[18px] transition-transform group-hover:scale-105" strokeWidth={1.8} />
          </span>
        )}
      </div>
      <CardValue className="mt-2 truncate">{value}</CardValue>
      {helperText && <CardHelperText>{helperText}</CardHelperText>}
      {action && (
        <Link
          to={action.to}
          className="mt-auto inline-flex min-h-9 items-center gap-1 pt-2 text-sm font-medium text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"
        >
          {action.label}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      )}
    </Card>
  );
}
