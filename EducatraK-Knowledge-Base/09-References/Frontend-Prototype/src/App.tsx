import { Route, Routes } from "react-router-dom";
import { Shell } from "@/components/layout/Shell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import type { AuthenticatedUser } from "@/lib/types";
import { en } from "@/i18n/en";

// Authentication is cookie-session based per the spec; the frontend
// never stores credentials. This placeholder represents the profile
// the session endpoint would resolve to. Swap for the real session
// hook once the auth API layer lands.
//
// TODO(spec): role-switching UI is not defined in the brief. Change
// this constant to preview a different role's dashboard/nav during
// development. Recorded in DECISIONS.md.
const CURRENT_USER: AuthenticatedUser = {
  id: "user-001",
  name: "Grace Villanueva (sample)",
  role: "cashier",
};

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-white p-8 text-sm text-text-muted-readable">
      {title} — TODO(spec): screen not yet specified in the brief.
    </div>
  );
}

export function App() {
  return (
    <Shell user={CURRENT_USER}>
      <Routes>
        <Route path="/" element={<DashboardPage user={CURRENT_USER} />} />
        <Route
          path="/students"
          element={<PlaceholderScreen title={en.nav.students} />}
        />
        <Route
          path="/accounts"
          element={<PlaceholderScreen title={en.nav.accounts} />}
        />
        <Route
          path="/payments"
          element={<PlaceholderScreen title={en.nav.payments} />}
        />
        <Route
          path="/follow-up"
          element={<PlaceholderScreen title={en.nav.followUp} />}
        />
        <Route
          path="/clearance"
          element={<PlaceholderScreen title={en.nav.clearance} />}
        />
        <Route
          path="/reports"
          element={<PlaceholderScreen title={en.nav.reports} />}
        />
        <Route
          path="/void-approvals"
          element={<PlaceholderScreen title={en.nav.voidApprovals} />}
        />
        <Route
          path="/close-out"
          element={<PlaceholderScreen title={en.nav.closeOut} />}
        />
        <Route
          path="/close-out-history"
          element={<PlaceholderScreen title={en.nav.closeOutHistory} />}
        />
        <Route
          path="/import"
          element={<PlaceholderScreen title={en.nav.import} />}
        />
        <Route
          path="/administration"
          element={<PlaceholderScreen title={en.nav.administration} />}
        />
        <Route
          path="/backup"
          element={<PlaceholderScreen title={en.nav.backup} />}
        />
        <Route
          path="/audit-log"
          element={<PlaceholderScreen title={en.nav.auditLog} />}
        />
        <Route
          path="/notifications"
          element={<PlaceholderScreen title={en.nav.notifications} />}
        />
        <Route
          path="/settings"
          element={<PlaceholderScreen title={en.nav.settings} />}
        />
      </Routes>
    </Shell>
  );
}
