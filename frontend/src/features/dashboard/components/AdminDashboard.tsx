import { DashboardStatCard } from "./DashboardStatCard";
import { Database, Users } from "lucide-react";
import { en } from "@/i18n/en";
import { formatDateTime } from "@/lib/dates";
import type { AdministratorDashboardSummary } from "@/api/dashboardTypes";

interface AdminDashboardProps {
  summary: AdministratorDashboardSummary;
}

export function AdminDashboard({ summary }: AdminDashboardProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-3">
        <DashboardStatCard
          label={en.dashboard.lastBackup}
          value={summary.lastBackupAt ? formatDateTime(summary.lastBackupAt) : en.dashboard.backupUnavailable}
          helperText={summary.lastBackupAt === null ? en.dashboard.noBackupRecord : summary.lastBackupSucceeded === null ? en.dashboard.backupResultUnavailable : summary.lastBackupSucceeded ? en.dashboard.backupSucceeded : en.dashboard.backupFailed}
          icon={Database}
          action={{ to: "/admin/backup", label: en.dashboard.backupRecovery }}
        />
        <DashboardStatCard
          label={en.dashboard.activeUsers}
          value={String(summary.activeUserCount)}
          icon={Users}
          action={{ to: "/admin/users", label: en.dashboard.manageUsers }}
        />
      </div>
    </div>
  );
}
