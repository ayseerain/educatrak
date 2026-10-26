import { Card, CardLabel } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { en } from "@/i18n/en";
import type { DashboardStaffAccountSummary } from "@/api/dashboardTypes";

interface StaffAccountOverviewProps {
  summary?: DashboardStaffAccountSummary;
  title: string;
  description: string;
  className?: string;
}

export function StaffAccountOverview({ summary, title, description, className }: StaffAccountOverviewProps) {
  return (
    <Card className={cn("p-0", className)} aria-labelledby="staff-account-overview-heading">
      <div className="border-b border-border px-4 py-3">
        <CardLabel id="staff-account-overview-heading" className="text-base font-semibold text-text-primary">
          {title}
        </CardLabel>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      {summary ? (
        <div className="space-y-4 px-4 py-4">
          <dl className="grid grid-cols-3 gap-3">
            <AccountCount label={en.dashboard.activeAccounts} value={summary.active} />
            <AccountCount label={en.dashboard.inactiveAccounts} value={summary.inactive} />
            <AccountCount label={en.dashboard.privilegedAccounts} value={summary.privileged} />
          </dl>
          <div className="border-t border-border pt-3">
            <p className="text-sm font-medium text-text-primary">{en.dashboard.staffByRole}</p>
            <ul className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2" aria-label={en.dashboard.staffByRole}>
              {summary.byRole.map((item) => (
                <li key={item.role} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-text-secondary">{en.dashboard.roleLabels[item.role]}</span>
                  <span className="font-semibold tabular-nums text-text-primary">{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="px-4 py-5 text-sm text-text-secondary">{en.dashboard.accountOverviewUnavailable}</p>
      )}
    </Card>
  );
}

function AccountCount({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-text-primary">{value}</dd>
    </div>
  );
}
