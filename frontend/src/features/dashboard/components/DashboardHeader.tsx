import type { ReactNode } from "react";

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  workspace: string;
  controls?: ReactNode;
}

/** A compact role workspace heading that deliberately differs from a standard page header. */
export function DashboardHeader({ title, subtitle, workspace, controls }: DashboardHeaderProps) {
  return (
    <header className="border-b-2 border-brand-green-light/60 bg-[#F4FAF5] px-4 py-4 sm:px-5" aria-label={`${workspace} dashboard`}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-green-dark">{workspace}</p>
          <h1 className="mt-0.5 text-2xl font-semibold text-text-primary">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">{subtitle}</p>
        </div>
        {controls && <div className="flex flex-wrap items-center justify-end gap-3">{controls}</div>}
      </div>
    </header>
  );
}
