import { NavLink } from "react-router-dom";
import {
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  DatabaseBackup,
  FileBarChart,
  FileSearch,
  GraduationCap,
  LayoutDashboard,
  ReceiptText,
  ScanSearch,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
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
        { label: en.nav.financialPolicies, to: "/settings/fees", capability: "settings.finance", icon: SlidersHorizontal },
        { label: en.nav.voidApprovals, to: "/voids", capability: "payment.void.view", icon: BadgeCheck },
        { label: en.nav.closeoutReview, to: "/closeout/history", capability: "closeout.view", icon: ClipboardCheck },
        { label: en.nav.financialReports, to: "/reports", capability: "report.view", icon: FileBarChart },
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
        { label: en.nav.systemConfiguration, to: "/settings/school", capability: "settings.system", icon: Settings },
        { label: en.nav.backupRecovery, to: "/admin/backup", capability: "backup.manage", icon: DatabaseBackup },
        { label: en.nav.securityEvents, to: "/admin/audit-log", capability: "audit.view", icon: ShieldCheck },
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
}

export function Sidebar({ user }: SidebarProps) {
  const visibleGroups = ROLE_NAV_GROUPS[user.role].map((group) => ({
    ...group,
    items: group.items.filter((item) => can(user, item.capability)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav
      aria-label="Primary"
      className="flex w-full shrink-0 flex-col border-b border-border bg-white md:h-full md:w-56 md:border-b-0 md:border-r"
    >
      <div className="flex h-16 items-center border-b border-border px-3">
        <span className="flex items-center gap-3">
          <img
            src="/mendez-christian-academy-seal.png"
            alt="Mendez Christian Academy seal"
            className="h-12 w-12 shrink-0 object-contain"
          />
          <span className="flex flex-col leading-none text-brand-green-dark">
            <span className="text-[18px] font-black tracking-tight">EdukaTrak</span>
            <span className="mt-1 text-[12px] font-semibold tracking-tight text-text-muted-readable">
              {en.app.navbarName}
            </span>
          </span>
        </span>
      </div>
      <ul className="flex gap-4 overflow-x-auto p-3 md:flex-1 md:flex-col md:space-y-4 md:overflow-y-auto">
        {visibleGroups.map((group) => (
          <li key={group.label} className="shrink-0">
            <h2 className="hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-text-muted-readable md:block">
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
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary",
                          showNestedStyle && "ml-4 border-l border-border pl-4 text-[13px]",
                          isActive &&
                            "bg-[#E7F5EA] text-brand-green-dark hover:bg-[#E7F5EA]",
                        )
                      }
                    >
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
