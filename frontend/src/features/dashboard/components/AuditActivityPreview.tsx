import { Link } from "react-router-dom";
import { Card, CardLabel } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { en } from "@/i18n/en";
import type { DashboardActivity } from "@/api/dashboardTypes";

interface AuditActivityPreviewProps {
  title: string;
  description: string;
  entries?: DashboardActivity[];
  emptyMessage: string;
  to?: string;
  actionLabel?: string;
  className?: string;
  emptyStateClassName?: string;
}

export function AuditActivityPreview({
  title,
  description,
  entries = [],
  emptyMessage,
  to,
  actionLabel,
  className,
  emptyStateClassName,
}: AuditActivityPreviewProps) {
  const visibleEntries = entries.slice(0, 5);
  const headingId = `audit-preview-${(to ?? "overview").replace(/[^a-z0-9]+/gi, "-")}`;

  return (
    <Card className={cn("p-0", className)} aria-labelledby={headingId}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <CardLabel id={headingId} className="text-base font-semibold text-text-primary">{title}</CardLabel>
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </div>
        {to && actionLabel && <Link to={to} className="inline-flex min-h-11 items-center text-sm font-medium text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark">
          {actionLabel}
        </Link>}
      </div>
      {visibleEntries.length > 0 ? (
        <ol className="divide-y divide-border">
          {visibleEntries.map((entry) => (
            <li key={entry.id} className="px-4 py-3">
              <p className="text-sm font-medium text-text-primary">{entry.label}</p>
              <p className="mt-1 text-sm text-text-secondary">
                {entry.actor ?? en.dashboard.unknownActor} · <time dateTime={entry.occurredAt}>{formatDateTime(entry.occurredAt)}</time>
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className={cn("px-4 py-5 text-sm text-text-secondary", emptyStateClassName)}>{emptyMessage}</p>
      )}
    </Card>
  );
}
