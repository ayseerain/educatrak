import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  backTo?: string;
  backLabel?: string;
}

/** Shared page heading for application screens; dashboards use DashboardHeader. */
export function PageHeader({
  title,
  description,
  action,
  backTo,
  backLabel = "Back",
}: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function goBack() {
    if (location.key !== "default") {
      navigate(-1);
      return;
    }
    if (backTo) navigate(backTo);
  }

  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
      <div className="min-w-0">
        {backTo && (
          <button
            className="mb-3 inline-flex min-h-control items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface"
            type="button"
            onClick={goBack}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel}
          </button>
        )}
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-text-secondary">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}
