import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useSession } from "@/auth/session";
import { Shell } from "@/components/layout/Shell";
import { ScreenTransition } from "@/components/layout/ScreenTransition";
import { can, canViewReport, type ReportKind } from "@/lib/permissions";
import { SessionExpirationWarning } from "@/features/auth/SessionExpirationWarning";
import { FirstLoginPage } from "@/features/auth/FirstLoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { RoleFollowupWorkspace } from "@/features/followup/RoleFollowupWorkspace";
import { LoginPage } from "@/features/auth/LoginPage";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AccountDetailPage, AccountsPage, AccountWizardPage, AuditPage, BackupPage, ClearancePage, CloseoutHistoryPage, CloseoutPage, DeniedPage, ImportPage, NotFoundPage, PaymentEntryPage, PaymentsPage, PermitPage, ProfilePage, ReceiptPage, ReportPage, ReportsHubPage, RequireCapability, RolesPage, SettingsPage, StudentFormPage, StudentProfilePage, StudentStatementPage, StudentsPage, UsersPage, VoidsPage } from "@/features/operations/OperationalPages";
import type { AuthenticatedUser, Capability, Role } from "@/lib/types";

function Guard({ user, capability, children }: { user: AuthenticatedUser; capability: Capability; children: ReactNode }) {
  return <RequireCapability user={user} capability={capability}>{children}</RequireCapability>;
}

function GuardReport({ user, report, children }: { user: AuthenticatedUser; report: ReportKind; children: ReactNode }) {
  return canViewReport(user, report) ? <>{children}</> : <DeniedPage />;
}

function AuthenticatedApp({ onLogout, onRoleChange, user }: { onLogout: () => void; onRoleChange: (role: Role) => void; user: AuthenticatedUser }) {
  const location = useLocation();
  const auditorPageAllowed = ["/", "/profile", "/admin/audit-log", "/403", "/404"].includes(location.pathname);
  const notificationParams = new URLSearchParams(location.search);
  notificationParams.set("view", "notifications");
  const notificationWorkspacePath = `/followup?${notificationParams.toString()}`;
  const guarded = (capability: Capability, element: ReactNode) => <Guard user={user} capability={capability}>{element}</Guard>;
  return <Shell user={user} onLogout={onLogout} onRoleChange={onRoleChange}><SessionExpirationWarning /><ScreenTransition screenKey={`${user.role}:${location.pathname}`}>{user.role === "auditor" && !auditorPageAllowed ? <DeniedPage /> : <Routes>
    <Route path="/" element={<DashboardPage user={user} />} /><Route path="/profile" element={<ProfilePage user={user} />} />
    <Route path="/students" element={guarded("student.view", <StudentsPage user={user} />)} /><Route path="/students/new" element={guarded("student.edit", <StudentFormPage />)} /><Route path="/students/:id/edit" element={guarded("student.edit", <StudentFormPage edit />)} /><Route path="/students/:id" element={guarded("student.view", <StudentProfilePage user={user} />)} />
    <Route path="/accounts" element={guarded("account.view", <AccountsPage user={user} />)} /><Route path="/accounts/new" element={guarded("account.create", <AccountWizardPage user={user} />)} /><Route path="/accounts/:id" element={guarded("account.view", <AccountDetailPage user={user} />)} />
    <Route path="/payments/new" element={guarded("payment.record", <PaymentEntryPage />)} /><Route path="/payments" element={guarded("payment.view", <PaymentsPage user={user} />)} /><Route path="/payments/:id" element={guarded("payment.view", <PaymentsPage user={user} detail />)} /><Route path="/receipts/:id/print" element={guarded("payment.view", <ReceiptPage user={user} />)} />
    <Route path="/voids" element={guarded("payment.void.view", <VoidsPage user={user} />)} /><Route path="/followup" element={guarded("followup.view", <RoleFollowupWorkspace user={user} />)} /><Route path="/clearance" element={guarded("clearance.view", <ClearancePage user={user} />)} /><Route path="/permits/:studentId/:period/print" element={guarded("permit.print", <PermitPage />)} />
    <Route path="/closeout" element={guarded("closeout.submit", <CloseoutPage user={user} />)} /><Route path="/closeout/history" element={guarded("closeout.view", <CloseoutHistoryPage user={user} />)} />
    <Route path="/reports" element={guarded("report.view", <ReportsHubPage user={user} />)} /><Route path="/reports/daily" element={guarded("report.view", <GuardReport user={user} report="daily"><ReportPage type="daily" user={user} /></GuardReport>)} /><Route path="/reports/monthly" element={guarded("report.view", <GuardReport user={user} report="monthly"><ReportPage type="monthly" user={user} /></GuardReport>)} /><Route path="/reports/outstanding" element={guarded("report.view", <GuardReport user={user} report="outstanding"><ReportPage type="outstanding" user={user} /></GuardReport>)} /><Route path="/reports/student/:id" element={guarded("report.view", <GuardReport user={user} report="statement"><StudentStatementPage user={user} /></GuardReport>)} />
    <Route path="/notifications" element={guarded("notification.view", <Navigate to={notificationWorkspacePath} replace />)} /><Route path="/import" element={guarded("import.run", <ImportPage />)} />
    <Route path="/settings/fees" element={guarded("settings.finance.view", <SettingsPage section="fees" editable={can(user, "settings.finance.manage")} actorId={user.id} />)} /><Route path="/settings/plans" element={guarded("settings.finance.view", <SettingsPage section="plans" editable={can(user, "settings.finance.manage")} actorId={user.id} />)} /><Route path="/settings/clearance-rules" element={guarded("settings.finance.view", <SettingsPage section="clearance" editable={can(user, "settings.finance.manage")} actorId={user.id} />)} /><Route path="/settings/school" element={guarded("settings.system.view", <SettingsPage section="school" editable={can(user, "settings.system.manage")} actorId={user.id} />)} /><Route path="/settings/receipt" element={guarded("settings.system.view", <SettingsPage section="receipt" editable={can(user, "settings.system.manage")} actorId={user.id} />)} /><Route path="/settings/email" element={guarded("settings.system.view", <SettingsPage section="email" editable={can(user, "settings.system.manage")} actorId={user.id} />)} />
    <Route path="/admin/users" element={guarded("user.manage", <UsersPage user={user} />)} /><Route path="/admin/roles" element={guarded("user.manage", <RolesPage />)} /><Route path="/admin/audit-log" element={guarded("audit.view", <AuditPage user={user} />)} /><Route path="/admin/security-events" element={guarded("security.events.view", <AuditPage user={user} security />)} /><Route path="/admin/backup" element={guarded("backup.manage", <BackupPage />)} />
    <Route path="/403" element={<DeniedPage />} /><Route path="/404" element={<NotFoundPage />} /><Route path="*" element={<Navigate to="/404" replace />} />
  </Routes>}</ScreenTransition></Shell>;
}

export function App() {
  const { logout, switchRole, user, isRestoringSession, sessionRestoreError, retrySessionRestore } = useSession();
  if (isRestoringSession) return <LoadingState message="Restoring your secure session…" layout="page" />;
  if (sessionRestoreError) return <ErrorState message={sessionRestoreError} onRetry={() => void retrySessionRestore()} />;
  return <Routes>
    <Route path="/login" element={user ? <Navigate to={user.mustChangePassword ? "/first-login" : "/"} replace /> : <div data-auth-screen><LoginPage /></div>} />
    <Route path="/first-login" element={!user ? <Navigate to="/login" replace /> : user.mustChangePassword ? <div data-auth-screen><FirstLoginPage /></div> : <Navigate to="/" replace />} />
    <Route path="/*" element={!user ? <Navigate to="/login" replace /> : user.mustChangePassword ? <Navigate to="/first-login" replace /> : <AuthenticatedApp user={user} onLogout={logout} onRoleChange={switchRole} />} />
  </Routes>;
}
