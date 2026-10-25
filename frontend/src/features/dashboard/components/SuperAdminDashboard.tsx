import { useNavigate } from "react-router-dom";
import { Database, FileSearch, ShieldCheck, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DashboardStatCard } from "./DashboardStatCard";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/dates";
import type { SuperAdministratorDashboardSummary } from "@/api/dashboardTypes";

export function SuperAdminDashboard({ summary }: { summary: SuperAdministratorDashboardSummary }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <DashboardStatCard label="Active accounts" value={String(summary.activeUserCount)} icon={UsersRound} />
        <DashboardStatCard label="Latest backup" value={summary.lastBackupAt ? formatDateTime(summary.lastBackupAt) : "Unavailable"} helperText={summary.lastBackupSucceeded === null ? "Backup status is not recorded." : summary.lastBackupSucceeded ? "Last backup succeeded." : "Last backup failed."} icon={Database} />
      </div>
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-text-primary">System governance</h2>
        <p className="mt-1 text-sm text-text-secondary">Manage privileged access and review security and change history. Financial operations remain with their assigned roles.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate("/admin/users")}><UsersRound aria-hidden="true" className="mr-2 h-4 w-4" />Users</Button>
          <Button variant="secondary" onClick={() => navigate("/admin/security-events")}><ShieldCheck aria-hidden="true" className="mr-2 h-4 w-4" />Security</Button>
          <Button variant="secondary" onClick={() => navigate("/admin/audit-log")}><FileSearch aria-hidden="true" className="mr-2 h-4 w-4" />Audit</Button>
        </div>
      </Card>
    </div>
  );
}
