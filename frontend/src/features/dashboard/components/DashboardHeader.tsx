import type { ReactNode } from "react";
import { CARD_SURFACE } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  workspace: string;
  controls?: ReactNode;
}

/** Role workspace heading in the shared CLINIQ header-card style, with the workspace named above the title. */
export function DashboardHeader({ title, subtitle, workspace, controls }: DashboardHeaderProps) {
  return (
    <header className={cn(CARD_SURFACE, "p-5")} aria-label={`${workspace} dashboard`}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-green-dark">{workspace}</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">{subtitle}</p>
        </div>
        {controls && <div className="flex flex-wrap items-center justify-end gap-3">{controls}</div>}
      </div>
    </header>
  );
}
