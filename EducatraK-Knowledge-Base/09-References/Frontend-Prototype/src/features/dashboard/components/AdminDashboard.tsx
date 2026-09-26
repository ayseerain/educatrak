import { DashboardStatCard } from "./DashboardStatCard";
import { en } from "@/i18n/en";
import { formatDateTime } from "@/lib/dates";
import type { AdministratorDashboardSummary } from "@/api/dashboardTypes";

interface AdminDashboardProps {
  summary: AdministratorDashboardSummary;
}

export function AdminDashboard({ summary }: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-text-secondary">{en.dashboard.subtitle}</p>

      <div className="grid grid-cols-3 gap-4">
        <DashboardStatCard
          label={en.dashboard.lastBackup}
          value={formatDateTime(summary.lastBackupAt)}
          badge={
            summary.lastBackupSucceeded
              ? { tone: "success", label: en.status.cleared }
              : { tone: "error", label: en.status.error }
          }
        />
        <DashboardStatCard
          label={en.dashboard.activeUsers}
          value={String(summary.activeUserCount)}
        />
        <DashboardStatCard
          label={en.dashboard.failedEmails}
          value={String(summary.failedEmailCount)}
          badge={
            summary.failedEmailCount > 0
              ? { tone: "error", label: en.status.error }
              : undefined
          }
        />
      </div>
    </div>
  );
}
