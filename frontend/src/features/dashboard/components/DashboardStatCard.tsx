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
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <CardLabel>{label}</CardLabel>
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF6EC] text-brand-green-dark">
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
        )}
      </div>
      <CardValue>{value}</CardValue>
      {helperText && <CardHelperText>{helperText}</CardHelperText>}
      {action && (
        <Link
          to={action.to}
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"
        >
          {action.label}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      )}
    </Card>
  );
}
