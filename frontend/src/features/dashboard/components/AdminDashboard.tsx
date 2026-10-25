import { DashboardStatCard } from "./DashboardStatCard";
import { DashboardWorkPanel } from "./DashboardWorkPanel";
import { Database, History, Settings, ShieldCheck, UserCog } from "lucide-react";
import { Card } from "@/components/ui/Card";
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
        />
        <DashboardStatCard
          label={en.dashboard.activeUsers}
          value={String(summary.activeUserCount)}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <DashboardWorkPanel
          title={en.dashboard.adminWorkspace}
          description={en.dashboard.adminWorkspaceHelp}
          items={[
            {
              label: en.dashboard.manageUsers,
              detail: en.dashboard.manageUsersHelp,
              to: "/admin/users",
              icon: UserCog,
            },
            {
              label: en.dashboard.systemSettings,
              detail: en.dashboard.systemSettingsHelp,
              to: "/settings/school",
              icon: Settings,
            },
            {
              label: en.dashboard.backupRecovery,
              detail: en.dashboard.backupRecoveryHelp,
              to: "/admin/backup",
              icon: Database,
            },
            {
              label: en.dashboard.securityEvents,
              detail: en.dashboard.securityEventsHelp,
              to: "/admin/audit-log",
              icon: ShieldCheck,
            },
          ]}
        />
        <Card className="border-l-4 border-l-brand-green p-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {en.dashboard.adminSafeguards}
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-md bg-surface p-3">
              <UserCog aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-green-dark" />
              <div>
                <p className="font-semibold text-text-primary">
                  {en.dashboard.adminAccountSafety}
                </p>
                <p className="mt-1 text-text-secondary">{en.dashboard.adminAccountSafetyHelp}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md bg-surface p-3">
              <History aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-green-dark" />
              <div>
                <p className="font-semibold text-text-primary">
                  {en.dashboard.adminAuditTrail}
                </p>
                <p className="mt-1 text-text-secondary">{en.dashboard.adminAuditTrailHelp}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md bg-surface p-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-green-dark" />
              <div>
                <p className="font-semibold text-text-primary">
                  {en.dashboard.adminSettingsReview}
                </p>
                <p className="mt-1 text-text-secondary">{en.dashboard.adminSettingsReviewHelp}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
