import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "@/auth/session";
import { Shell } from "@/components/layout/Shell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { en } from "@/i18n/en";
import type { AuthenticatedUser } from "@/lib/types";

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-white p-8 text-sm text-text-muted-readable">
      {title} — TODO(spec): screen not yet specified in the brief.
    </div>
  );
}

function AuthenticatedApp({
  onLogout,
  user,
}: {
  onLogout: () => void;
  user: AuthenticatedUser;
}) {
  return (
    <Shell user={user} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<DashboardPage user={user} />} />
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
  );
}

export function App() {
  const { logout, user } = useSession();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/*"
        element={
          user ? (
            <AuthenticatedApp user={user} onLogout={logout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}
