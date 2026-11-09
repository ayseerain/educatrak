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
  Landmark,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  User,
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
        { label: en.nav.accounts, to: "/accounts", capability: "account.view", icon: Landmark },
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
        { label: en.nav.accounts, to: "/accounts", capability: "account.view", icon: Landmark },
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
      label: en.nav.studentBilling,
      items: [{ label: en.nav.students, to: "/students", capability: "student.view", icon: UsersRound }],
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

export const ROLE_LABEL: Record<Role, string> = {
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
  const showRolePreview = import.meta.env.DEV && !isLiveCashierApiEnabled();

  function handleRoleChange(role: Role) {
    onRoleChange(role);
    navigate("/");
  }

  return (
    <nav
      id="primary-navigation"
      aria-label="Primary"
      className={cn(
        "no-print flex w-full shrink-0 flex-col border-b border-border bg-white pb-2 pt-5 transition-[width] duration-200 ease-out motion-reduce:transition-none md:h-full md:border-b-0 md:border-r",
        collapsed ? "gap-5 px-3 md:w-16 md:items-center md:px-2" : "gap-6 px-4 md:w-[17rem]",
      )}
    >
      <div className={cn("flex w-full items-center pl-2", collapsed && "md:justify-center md:pl-0")}>
        <span className={cn("flex min-w-0 items-center gap-2.5", collapsed && "md:hidden")}>
          <img
            src="/mendez-christian-academy-seal.png"
            alt="Mendez Christian Academy seal"
            className="h-11 w-11 shrink-0 object-contain"
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-xl font-bold tracking-tight text-brand-green-dark">{en.app.name}</span>
            <span className="whitespace-nowrap text-xs font-medium leading-tight tracking-tight text-text-secondary">
              {en.app.navbarName}
            </span>
          </span>
        </span>
        <button type="button" onClick={onToggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} aria-controls="primary-navigation" title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className={cn("ml-auto -mr-2 inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:text-text-primary motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark", collapsed && "md:ml-0 md:mr-0")}>
          {collapsed ? <PanelLeftOpen className="h-[22px] w-[22px]" aria-hidden="true" /> : <PanelLeftClose className="h-[22px] w-[22px]" aria-hidden="true" />}
        </button>
      </div>
      {/* 4px of room inside the scroller for the focus ring, cancelled by a -4px margin. */}
      <ul className={cn("-m-1 flex min-h-0 gap-4 overflow-x-auto p-1 md:flex-1 md:flex-col md:overflow-y-auto", collapsed && "hidden md:flex md:items-center md:gap-2")}>
        {visibleGroups.map((group) => (
          <li key={group.label} className={cn("shrink-0", collapsed && "md:w-full")}>
            <h2 className={cn("hidden px-1.5 pb-1 text-xs font-medium uppercase text-text-secondary md:block", collapsed && "md:hidden")}>
              {group.label}
            </h2>
            <ul className={cn("flex gap-1 md:flex-col md:gap-1.5", collapsed && "md:items-center md:gap-1")}>
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
                          // No color transition: the active fill swaps in one frame (a cross-fade read as a flicker).
                          "flex min-h-11 cursor-pointer items-center gap-3 whitespace-nowrap rounded-md px-3.5 text-sm font-medium text-text-primary hover:bg-surface md:whitespace-normal md:leading-5",
                          collapsed && "md:w-11 md:justify-center md:px-0",
                          showNestedStyle && "ml-4 border-l border-border pl-4",
                          isActive &&
                            "bg-brand-green-dark font-semibold text-white shadow-raised hover:bg-brand-green-dark",
                        )
                      }
                    >
                      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                      <span className={collapsed ? "md:hidden" : undefined}>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      <div className={cn("mt-auto flex w-full flex-col gap-3 border-t border-border pt-3", collapsed && "md:items-center")}>
        {showRolePreview && (
          <DropdownSelect
            aria-label={`${en.header.previewRole}: ${ROLE_LABEL[user.role]}`}
            value={user.role}
            options={ROLE_OPTIONS}
            onChange={handleRoleChange}
            className={cn("w-full border-dashed bg-surface", collapsed && "hidden")}
          />
        )}
        <div className={cn("flex items-center gap-1.5", collapsed && "md:flex-col md:gap-1")}>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            aria-label={`Open my profile: ${user.name}`}
            title={`${user.name} · ${ROLE_LABEL[user.role]}`}
            className={cn("flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md px-1.5 text-left transition-colors duration-150 hover:bg-surface motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark", collapsed && "md:flex-none md:justify-center md:px-0")}
          >
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green-light text-text-primary ring-2 ring-white">
              <User className="h-5 w-5" />
            </span>
            <span className={cn("flex min-w-0 flex-col leading-tight", collapsed && "md:hidden")}>
              <span className="truncate text-sm font-semibold text-text-primary">{user.name}</span>
              <span className="truncate text-xs text-text-secondary">{ROLE_LABEL[user.role]}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            aria-label={en.header.signOut}
            title={en.header.signOut}
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-status-error transition-[filter] hover:brightness-75 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-error"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
