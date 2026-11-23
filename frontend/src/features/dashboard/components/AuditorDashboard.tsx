import { AuditActivityPreview } from "./AuditActivityPreview";
import { en } from "@/i18n/en";
import type { AuditorDashboardSummary } from "@/api/dashboardTypes";

interface AuditorDashboardProps {
  summary: AuditorDashboardSummary;
}

export function AuditorDashboard({ summary }: AuditorDashboardProps) {
  return (
    <AuditActivityPreview
      title={en.dashboard.auditActivity}
      description={en.dashboard.auditActivityHelp}
      entries={summary.recentAuditActivity}
      emptyMessage={en.dashboard.noAuditActivity}
    />
  );
}
