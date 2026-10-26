import { CalendarDays, Database, GraduationCap, Users } from "lucide-react";
import { DashboardStatCard } from "./DashboardStatCard";
import { AuditActivityPreview } from "./AuditActivityPreview";
import { StaffAccountOverview } from "./StaffAccountOverview";
import { Card, CardLabel } from "@/components/ui/Card";
import { en } from "@/i18n/en";
import { formatDateTime } from "@/lib/dates";
import type { AdministratorDashboardSummary } from "@/api/dashboardTypes";

interface AdminDashboardProps {
  summary: AdministratorDashboardSummary;
}

export function AdminDashboard({ summary }: AdminDashboardProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
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
      <div className="grid gap-4 xl:grid-cols-2">
        <StaffAccountOverview
          summary={summary.staffAccounts}
          title={en.dashboard.userAccountOverview}
          description={en.dashboard.userAccountOverviewHelp}
        />
        <ConfigurationOverview configuration={summary.configuration} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <AuditActivityPreview
          title={en.dashboard.recentAdministrativeActivity}
          description={en.dashboard.recentAdministrativeActivityHelp}
          entries={summary.recentAdministrativeActivity}
          emptyMessage={en.dashboard.noAdministrativeActivity}
          to="/admin/audit-log"
          actionLabel={en.dashboard.goToAuditLog}
        />
        <AuditActivityPreview
          title={en.dashboard.securityEvents}
          description={en.dashboard.securityEventsHelp}
          entries={summary.securityEvents}
          emptyMessage={en.dashboard.noSecurityEvents}
          to="/admin/security-events"
          actionLabel={en.dashboard.viewSecurityEvents}
        />
      </div>
    </div>
  );
}

function ConfigurationOverview({
  configuration,
}: {
  configuration: AdministratorDashboardSummary["configuration"];
}) {
  return (
    <Card className="p-0" aria-labelledby="school-configuration-heading">
      <div className="border-b border-border px-4 py-3">
        <CardLabel id="school-configuration-heading" className="text-base font-semibold text-text-primary">
          {en.dashboard.schoolConfiguration}
        </CardLabel>
        <p className="mt-1 text-sm text-text-secondary">{en.dashboard.schoolConfigurationHelp}</p>
      </div>
      {configuration ? (
        <dl className="space-y-3 px-4 py-4">
          <ConfigurationItem icon={CalendarDays} label={en.dashboard.currentSchoolYear} value={configuration.schoolYear ?? en.dashboard.configurationUnavailable} />
          <ConfigurationItem icon={GraduationCap} label={en.dashboard.configuredGradeLevels} value={String(configuration.gradeLevelCount)} />
          <ConfigurationItem icon={Users} label={en.dashboard.configuredPaymentMethods} value={String(configuration.paymentMethodCount)} />
        </dl>
      ) : (
        <p className="px-4 py-5 text-sm text-text-secondary">{en.dashboard.configurationUnavailable}</p>
      )}
    </Card>
  );
}

function ConfigurationItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#EAF6EC] text-brand-green-dark">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-sm text-text-secondary">{label}</dt>
        <dd className="mt-0.5 font-semibold text-text-primary">{value}</dd>
      </div>
    </div>
  );
}
