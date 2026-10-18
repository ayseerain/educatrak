import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "@/auth/session";
import { Shell } from "@/components/layout/Shell";
import { canViewReport, type ReportKind } from "@/lib/permissions";
import { SessionExpirationWarning } from "@/features/auth/SessionExpirationWarning";
import { FirstLoginPage } from "@/features/auth/FirstLoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { AccountDetailPage, AccountsPage, AccountWizardPage, AuditPage, BackupPage, ClearancePage, CloseoutHistoryPage, CloseoutPage, DeniedPage, FollowupPage, ImportPage, NotFoundPage, NotificationsPage, PaymentEntryPage, PaymentsPage, PermitPage, ProfilePage, ReceiptPage, ReportPage, ReportsHubPage, RequireCapability, RolesPage, SettingsPage, StudentFormPage, StudentProfilePage, StudentStatementPage, StudentsPage, UsersPage, VoidsPage } from "@/features/operations/OperationalPages";
import type { AuthenticatedUser, Capability, Role } from "@/lib/types";

function Guard({ user, capability, children }: { user: AuthenticatedUser; capability: Capability; children: ReactNode }) {
  return <RequireCapability user={user} capability={capability}>{children}</RequireCapability>;
}

function GuardReport({ user, report, children }: { user: AuthenticatedUser; report: ReportKind; children: ReactNode }) {
  return canViewReport(user, report) ? <>{children}</> : <DeniedPage />;
}

function AuthenticatedApp({ onLogout, onRoleChange, user }: { onLogout: () => void; onRoleChange: (role: Role) => void; user: AuthenticatedUser }) {
  const guarded = (capability: Capability, element: ReactNode) => <Guard user={user} capability={capability}>{element}</Guard>;
  return <Shell user={user} onLogout={onLogout} onRoleChange={onRoleChange}><SessionExpirationWarning /><Routes>
    <Route path="/" element={<DashboardPage user={user} />} /><Route path="/profile" element={<ProfilePage user={user} />} />
    <Route path="/students" element={guarded("student.view", <StudentsPage user={user} />)} /><Route path="/students/new" element={guarded("student.edit", <StudentFormPage />)} /><Route path="/students/:id/edit" element={guarded("student.edit", <StudentFormPage edit />)} /><Route path="/students/:id" element={guarded("student.view", <StudentProfilePage user={user} />)} />
    <Route path="/accounts" element={guarded("account.view", <AccountsPage user={user} />)} /><Route path="/accounts/new" element={guarded("account.create", <AccountWizardPage />)} /><Route path="/accounts/:id" element={guarded("account.view", <AccountDetailPage user={user} />)} />
    <Route path="/payments/new" element={guarded("payment.record", <PaymentEntryPage />)} /><Route path="/payments" element={guarded("payment.view", <PaymentsPage user={user} />)} /><Route path="/payments/:id" element={guarded("payment.view", <PaymentsPage user={user} detail />)} /><Route path="/receipts/:id/print" element={guarded("payment.view", <ReceiptPage user={user} />)} />
    <Route path="/voids" element={guarded("payment.void.view", <VoidsPage user={user} />)} /><Route path="/followup" element={guarded("followup.view", <FollowupPage user={user} />)} /><Route path="/clearance" element={guarded("clearance.view", <ClearancePage user={user} />)} /><Route path="/permits/:studentId/:period/print" element={guarded("permit.print", <PermitPage />)} />
    <Route path="/closeout" element={guarded("closeout.submit", <CloseoutPage user={user} />)} /><Route path="/closeout/history" element={guarded("closeout.view", <CloseoutHistoryPage user={user} />)} />
    <Route path="/reports" element={guarded("report.view", <ReportsHubPage user={user} />)} /><Route path="/reports/daily" element={guarded("report.view", <GuardReport user={user} report="daily"><ReportPage type="daily" /></GuardReport>)} /><Route path="/reports/monthly" element={guarded("report.view", <GuardReport user={user} report="monthly"><ReportPage type="monthly" /></GuardReport>)} /><Route path="/reports/outstanding" element={guarded("report.view", <GuardReport user={user} report="outstanding"><ReportPage type="outstanding" /></GuardReport>)} /><Route path="/reports/student/:id" element={guarded("report.view", <GuardReport user={user} report="statement"><StudentStatementPage user={user} /></GuardReport>)} />
    <Route path="/notifications" element={guarded("notification.view", <NotificationsPage user={user} />)} /><Route path="/import" element={guarded("import.run", <ImportPage />)} />
    <Route path="/settings/fees" element={guarded("settings.finance", <SettingsPage section="fees" editable={user.role === "accounting"} />)} /><Route path="/settings/plans" element={guarded("settings.finance", <SettingsPage section="plans" editable={user.role === "accounting"} />)} /><Route path="/settings/clearance-rules" element={guarded("settings.finance", <SettingsPage section="clearance" editable={user.role === "accounting"} />)} /><Route path="/settings/school" element={guarded("settings.system", <SettingsPage section="school" editable={user.role === "administrator"} />)} /><Route path="/settings/receipt" element={guarded("settings.system", <SettingsPage section="receipt" editable={user.role === "administrator"} />)} /><Route path="/settings/email" element={guarded("settings.system", <SettingsPage section="email" editable={user.role === "administrator"} />)} />
    <Route path="/admin/users" element={guarded("user.manage", <UsersPage />)} /><Route path="/admin/roles" element={guarded("user.manage", <RolesPage />)} /><Route path="/admin/audit-log" element={guarded("audit.view", <AuditPage user={user} />)} /><Route path="/admin/backup" element={guarded("backup.manage", <BackupPage />)} />
    <Route path="/403" element={<DeniedPage />} /><Route path="/404" element={<NotFoundPage />} /><Route path="*" element={<Navigate to="/404" replace />} />
  </Routes></Shell>;
}

export function App() {
  const { logout, switchRole, user } = useSession();
  return <Routes><Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} /><Route path="/first-login" element={<FirstLoginPage />} /><Route path="/*" element={user ? <AuthenticatedApp user={user} onLogout={logout} onRoleChange={switchRole} /> : <Navigate to="/login" replace />} /></Routes>;
}
