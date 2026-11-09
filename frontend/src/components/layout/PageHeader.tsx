import type { ReactNode } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { CARD_SURFACE } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  backTo?: string;
  backLabel?: string;
}

/** Shared page heading (CLINIQ header card); dashboards use DashboardHeader. Back sits above the card. */
export function PageHeader({
  title,
  description,
  action,
  backTo,
  backLabel = "Back",
}: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-4">
      {backTo && <BackButton fallback={backTo} label={backLabel} />}
      <header className={cn(CARD_SURFACE, "flex flex-wrap items-start justify-between gap-4 p-5")}>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-text-secondary">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </header>
    </div>
  );
}
