import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "@/components/layout/Shell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { en } from "@/i18n/en";
import type { AuthenticatedUser } from "@/lib/types";

// TODO(spec): authentication is archived until the auth screen and API
// contract are implemented. This fictional user keeps the dashboard
// previewable without storing credentials or personal data.
const DASHBOARD_PREVIEW_USER: AuthenticatedUser = {
  id: "preview-cashier",
  name: "Casey Cashier (sample)",
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
  return <Routes>
    <Route path="*" element={
      <Shell user={DASHBOARD_PREVIEW_USER}>
        <Routes>
        <Route path="/" element={<DashboardPage user={DASHBOARD_PREVIEW_USER} />} />
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
        <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Shell>
    } />
  </Routes>;
}
