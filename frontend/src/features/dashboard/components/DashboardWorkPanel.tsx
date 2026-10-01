import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
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

export function DashboardWorkPanel({
  title,
  description,
  items,
  className,
}: DashboardWorkPanelProps) {
  return (
    <Card className={cn("p-0", className)}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.to}
              className="group flex min-h-[82px] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface/80 focus-visible:bg-surface"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand-green-light/60 bg-[#EAF6EC] text-brand-green-dark">
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-text-primary">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-sm text-text-secondary">
                  {item.detail}
                </span>
              </span>
              {item.meta && (
                <span className="shrink-0 text-sm font-semibold text-text-primary">
                  {item.meta}
                </span>
              )}
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-text-muted-readable transition-transform group-hover:translate-x-0.5 group-hover:text-brand-green-dark"
              />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
