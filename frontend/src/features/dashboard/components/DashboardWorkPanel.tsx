import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

interface DashboardWorkPanelProps {
  title: string;
  description?: string;
  items: DashboardWorkItem[];
  className?: string;
}

interface DashboardWorkItem {
  label: string;
  detail: string;
  to: string;
  icon: LucideIcon;
  meta?: ReactNode;
}

/** CLINIQ list card: card header, then divided rows (16px icon, semibold label, 12px detail). */
export function DashboardWorkPanel({
  title,
  description,
  items,
  className,
}: DashboardWorkPanelProps) {
  return (
    <Card className={cn("p-0", className)}>
      <CardHeader title={title} description={description} />
      <ul className="divide-y divide-border border-t border-border">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.label}>
              <Link
                to={item.to}
                className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface motion-reduce:transition-none"
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-green-dark" strokeWidth={2} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text-primary group-hover:text-brand-green-dark">{item.label}</span>
                  <span className="block break-words text-xs text-text-secondary">{item.detail}</span>
                </span>
                {item.meta && (
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-text-primary">{item.meta}</span>
                )}
                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-text-secondary group-hover:text-brand-green-dark" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
