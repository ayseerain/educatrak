import { DashboardStatCard } from "./DashboardStatCard";
import { Database, MailSearch, Users } from "lucide-react";
import { en } from "@/i18n/en";
import { formatDateTime } from "@/lib/dates";
import type { AdministratorDashboardSummary } from "@/api/dashboardTypes";

interface AdminDashboardProps {
  summary: AdministratorDashboardSummary;
}

export function AdminDashboard({ summary }: AdminDashboardProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4">
        <DashboardStatCard
          label={en.dashboard.overallEnrolledStudents}
          value={String(summary.overallEnrolledStudents)}
          icon={Users}
        />
        <DashboardStatCard
          label={en.dashboard.lastBackup}
          value={formatDateTime(summary.lastBackupAt)}
          icon={Database}
        />
        <DashboardStatCard
          label={en.dashboard.activeUsers}
          value={String(summary.activeUserCount)}
        />
        <DashboardStatCard
          label={en.dashboard.failedEmails}
          value={String(summary.failedEmailCount)}
          icon={MailSearch}
          action={{ to: "/notifications?status=failed", label: en.dashboard.viewFailedEmails }}
        />
      </div>
    </div>
  );
}
