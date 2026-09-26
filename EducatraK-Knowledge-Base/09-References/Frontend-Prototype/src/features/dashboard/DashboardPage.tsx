import { useDashboard } from "./hooks/useDashboard";
import { CashierDashboard } from "./components/CashierDashboard";
import { AccountingDashboard } from "./components/AccountingDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { AuditorDashboard } from "./components/AuditorDashboard";
import { RegistrarDashboard } from "./components/RegistrarDashboard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { en } from "@/i18n/en";
import type { AuthenticatedUser } from "@/lib/types";

interface DashboardPageProps {
  user: AuthenticatedUser;
}

export function DashboardPage({ user }: DashboardPageProps) {
  // Registrar's dashboard carries no financial data and needs no fetch;
  // rendering it directly avoids requesting data the role can't see.
  if (user.role === "registrar") {
    return (
      <div className="flex h-full flex-col">
        <PageHeading user={user} />
        <RegistrarDashboard />
      </div>
    );
  }

  const { data, isPending, isError, refetch } = useDashboard(user);

  return (
    <div className="space-y-4">
      <PageHeading user={user} />

      {isPending && <LoadingState message={en.states.loadingDashboard} />}

      {isError && (
        <ErrorState
          message={en.states.errorDashboard}
          onRetry={() => refetch()}
        />
      )}

      {data && data.role === "cashier" && (
        <CashierDashboard
          summary={data}
          onRecordPayment={() => {
            // TODO(spec): the record-payment workflow/screen is not
            // detailed in the brief beyond being reachable from here.
            // Wired to a route once that screen is specified.
          }}
        />
      )}
      {data && data.role === "accounting" && (
        <AccountingDashboard summary={data} />
      )}
      {data && data.role === "administrator" && (
        <AdminDashboard summary={data} />
      )}
      {data && data.role === "auditor" && <AuditorDashboard summary={data} />}
    </div>
  );
}

function PageHeading({ user }: { user: AuthenticatedUser }) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">
        {en.dashboard.greeting.replace("{name}", user.name)}
      </h1>
    </div>
  );
}
