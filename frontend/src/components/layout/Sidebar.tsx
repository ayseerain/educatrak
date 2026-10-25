import { NavLink, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  DatabaseBackup,
  FileBarChart,
  FileSearch,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  ScanSearch,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { isLiveCashierApiEnabled } from "@/api/cashierApi";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { can } from "@/lib/permissions";
import type { AuthenticatedUser, Capability, Role } from "@/lib/types";
import { en } from "@/i18n/en";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  to: string;
  capability: Capability;
  icon: LucideIcon;
  end?: boolean;
  parentTo?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const ROLE_NAV_GROUPS: Record<Role, NavGroup[]> = {
  super_admin: [
    { label: en.nav.overview, items: [{ label: en.nav.dashboard, to: "/", capability: "dashboard.view", icon: LayoutDashboard }] },
    { label: "Governance", items: [
      { label: en.nav.userAccess, to: "/admin/users", capability: "user.manage", icon: UsersRound },
      { label: "Audit", to: "/admin/audit-log", capability: "audit.view", icon: FileSearch },
      { label: "Security", to: "/admin/security-events", capability: "security.events.view", icon: ShieldCheck },
    ] },
  ],
  cashier: [
    {
      label: en.nav.overview,
      items: [{ label: en.nav.dashboard, to: "/", capability: "dashboard.view", icon: LayoutDashboard }],
    },
    {
      label: en.nav.dailyBilling,
      items: [
        { label: en.nav.studentsBilling, to: "/students", capability: "student.view", icon: GraduationCap },
        { label: en.nav.cashPaymentsReceipts, to: "/payments", capability: "payment.view", icon: ReceiptText },
        { label: en.nav.installmentsFollowups, to: "/followup", capability: "followup.view", icon: CalendarClock },
        { label: en.nav.dailyCloseout, to: "/closeout", capability: "closeout.submit", icon: WalletCards },
      ],
    },
  ],
  accounting: [
    {
      label: en.nav.overview,
      items: [{ label: en.nav.dashboard, to: "/", capability: "dashboard.view", icon: LayoutDashboard }],
    },
    {
      label: en.nav.financialOversight,
      items: [
        { label: en.nav.paymentReview, to: "/payments", capability: "payment.view", icon: ReceiptText },
        { label: en.nav.financialPolicies, to: "/settings/fees", capability: "settings.finance.view", icon: SlidersHorizontal },
        { label: en.nav.systemSettingsReadOnly, to: "/settings/school", capability: "settings.system.view", icon: Settings },
        { label: en.nav.voidApprovals, to: "/voids", capability: "payment.void.view", icon: BadgeCheck },
        { label: en.nav.closeoutReview, to: "/closeout/history", capability: "closeout.view", icon: ClipboardCheck },
        { label: en.nav.financialReports, to: "/reports", capability: "report.view", icon: FileBarChart },
        { label: en.nav.followupNotifications, to: "/followup", capability: "followup.view", icon: CalendarClock },
      ],
    },
  ],
  administrator: [
    {
      label: en.nav.overview,
      items: [{ label: en.nav.dashboard, to: "/", capability: "dashboard.view", icon: LayoutDashboard }],
    },
    {
      label: en.nav.systemAdministration,
      items: [
        { label: en.nav.userAccess, to: "/admin/users", capability: "user.manage", icon: UsersRound },
        { label: en.nav.systemConfiguration, to: "/settings/school", capability: "settings.system.view", icon: Settings },
        { label: en.nav.backupRecovery, to: "/admin/backup", capability: "backup.manage", icon: DatabaseBackup },
        { label: en.nav.securityEvents, to: "/admin/security-events", capability: "security.events.view", icon: ShieldCheck },
      ],
    },
  ],
  auditor: [
    {
      label: en.nav.overview,
      items: [{ label: en.nav.dashboard, to: "/", capability: "dashboard.view", icon: LayoutDashboard }],
    },
    {
      label: en.nav.independentReview,
      items: [{ label: en.nav.auditReview, to: "/admin/audit-log", capability: "audit.view", icon: FileSearch }],
    },
  ],
  registrar: [
    {
      label: en.nav.overview,
      items: [{ label: en.nav.dashboard, to: "/", capability: "dashboard.view", icon: LayoutDashboard }],
    },
    {
      label: en.nav.clearancePermits,
      items: [{ label: en.nav.clearanceVerification, to: "/clearance", capability: "clearance.view", icon: ScanSearch }],
    },
  ],
};

interface SidebarProps {
  user: AuthenticatedUser;
  collapsed?: boolean;
  onToggleSidebar?: () => void;
  onLogout: () => void;
  onRoleChange: (role: Role) => void;
}

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  cashier: "Cashier",
  accounting: "Accounting",
  administrator: "Administrator",
  auditor: "Auditor",
  registrar: "Registrar",
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "super_admin", label: ROLE_LABEL.super_admin },
  { value: "administrator", label: ROLE_LABEL.administrator },
  { value: "cashier", label: ROLE_LABEL.cashier },
  { value: "accounting", label: ROLE_LABEL.accounting },
  { value: "auditor", label: ROLE_LABEL.auditor },
  { value: "registrar", label: ROLE_LABEL.registrar },
];

export function Sidebar({ user, collapsed = false, onToggleSidebar = () => undefined, onLogout, onRoleChange }: SidebarProps) {
  const navigate = useNavigate();
  const visibleGroups = ROLE_NAV_GROUPS[user.role].map((group) => ({
    ...group,
    items: group.items.filter((item) => can(user, item.capability)),
  })).filter((group) => group.items.length > 0);
  const initials = user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  function handleRoleChange(role: Role) {
    onRoleChange(role);
    navigate("/");
  }

  return (
    <nav
      id="primary-navigation"
      aria-label="Primary"
      className={cn("w-full shrink-0 flex-col border-b border-border bg-white transition-[width] duration-200 ease-out md:h-full md:border-b-0 md:border-r", collapsed ? "flex md:w-16" : "flex md:w-72")}
    >
      <div className={cn("flex h-16 items-center border-b border-border px-3", collapsed && "md:justify-center md:px-1")}>
        <span className={cn("flex min-w-0 items-center gap-3", collapsed && "md:hidden")}>
          <img
            src="/mendez-christian-academy-seal.png"
            alt="Mendez Christian Academy seal"
            className="h-12 w-12 shrink-0 object-contain"
          />
          <span className="flex min-w-0 flex-col leading-tight text-brand-green-dark">
            <span className="text-[18px] font-black tracking-tight">{en.app.name}</span>
            <span className="mt-1 text-[12px] font-semibold tracking-tight text-text-muted-readable">
              {en.app.navbarName}
            </span>
          </span>
        </span>
        <button type="button" onClick={onToggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} aria-controls="primary-navigation" title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className={cn("ml-auto inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark", collapsed && "md:ml-0")}>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <ul className={cn("flex gap-4 overflow-x-auto p-3 md:flex-1 md:flex-col md:space-y-4 md:overflow-y-auto", collapsed && "hidden md:flex")}>
        {visibleGroups.map((group) => (
          <li key={group.label} className="shrink-0">
            <h2 className={cn("hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-text-muted-readable md:block", collapsed && "md:hidden")}>
              {group.label}
            </h2>
            <ul className="flex gap-1 md:block md:space-y-0.5">
              {group.items.map((item) => {
                const showNestedStyle = Boolean(item.parentTo && group.items.some((groupItem) => groupItem.to === item.parentTo));
                const Icon = item.icon;

                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end ?? item.to === "/"}
                      title={collapsed ? item.label : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary md:whitespace-normal md:leading-5",
                          collapsed && "md:justify-center md:px-2",
                          showNestedStyle && "ml-4 border-l border-border pl-4 text-[13px]",
                          isActive &&
                            "bg-[#E7F5EA] text-brand-green-dark hover:bg-[#E7F5EA]",
                        )
                      }
                    >
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                      <span className={collapsed ? "md:hidden" : undefined}>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      <div className={cn("mt-auto border-t border-border p-3", collapsed && "md:px-1 md:py-2")}>
        {import.meta.env.DEV && !isLiveCashierApiEnabled() && (
          <DropdownSelect
            aria-label={`${en.header.previewRole}: ${ROLE_LABEL[user.role]}`}
            value={user.role}
            options={ROLE_OPTIONS}
            onChange={handleRoleChange}
            className={cn("mb-3 !h-11 w-full border-dashed bg-surface", collapsed && "hidden")}
            contentClassName="min-w-44"
          />
        )}
        <div className={cn("flex items-center gap-2", collapsed && "md:flex-col md:gap-1")}>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            aria-label={`Open my profile: ${user.name}`}
            title={`${user.name} · ${ROLE_LABEL[user.role]}`}
            className={cn("flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1 text-left hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark", collapsed && "md:flex-none md:justify-center md:px-1")}
          >
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green-light text-sm font-semibold text-brand-green-dark">{initials}</span>
            <span className={cn("min-w-0", collapsed && "md:hidden")}>
              <span className="block truncate text-sm font-medium text-text-primary">{user.name}</span>
              <span className="block truncate text-xs text-text-muted-readable">{ROLE_LABEL[user.role]}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            aria-label={en.header.signOut}
            title={en.header.signOut}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-white text-text-primary hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
