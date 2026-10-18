import { NavLink } from "react-router-dom";
import { can } from "@/lib/permissions";
import type { AuthenticatedUser, Capability, Role } from "@/lib/types";
import { en } from "@/i18n/en";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  to: string;
  capability: Capability;
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
      items: [{ label: en.nav.dashboard, to: "/", capability: "dashboard.view" }],
    },
    {
      label: en.nav.dailyBilling,
      items: [
        { label: en.nav.studentsBilling, to: "/students", capability: "student.view" },
        { label: en.nav.cashPaymentsReceipts, to: "/payments", capability: "payment.view" },
        { label: en.nav.installmentsFollowups, to: "/followup", capability: "followup.view" },
        { label: en.nav.dailyCloseout, to: "/closeout", capability: "closeout.submit" },
      ],
    },
  ],
  accounting: [
    {
      label: en.nav.overview,
      items: [{ label: en.nav.dashboard, to: "/", capability: "dashboard.view" }],
    },
    {
      label: en.nav.financialOversight,
      items: [
        { label: en.nav.financialPolicies, to: "/settings/fees", capability: "settings.finance" },
        { label: en.nav.voidApprovals, to: "/voids", capability: "payment.void.view" },
        { label: en.nav.closeoutReview, to: "/closeout/history", capability: "closeout.view" },
        { label: en.nav.financialReports, to: "/reports", capability: "report.view" },
      ],
    },
  ],
  administrator: [
    {
      label: en.nav.overview,
      items: [{ label: en.nav.dashboard, to: "/", capability: "dashboard.view" }],
    },
    {
      label: en.nav.systemAdministration,
      items: [
        { label: en.nav.userAccess, to: "/admin/users", capability: "user.manage" },
        { label: en.nav.systemConfiguration, to: "/settings/school", capability: "settings.system" },
        { label: en.nav.backupRecovery, to: "/admin/backup", capability: "backup.manage" },
        { label: en.nav.securityEvents, to: "/admin/audit-log", capability: "audit.view" },
      ],
    },
  ],
  auditor: [
    {
      label: en.nav.overview,
      items: [{ label: en.nav.dashboard, to: "/", capability: "dashboard.view" }],
    },
    {
      label: en.nav.independentReview,
      items: [{ label: en.nav.auditReview, to: "/admin/audit-log", capability: "audit.view" }],
    },
  ],
  registrar: [
    {
      label: en.nav.overview,
      items: [{ label: en.nav.dashboard, to: "/", capability: "dashboard.view" }],
    },
    {
      label: en.nav.clearancePermits,
      items: [{ label: en.nav.clearanceVerification, to: "/clearance", capability: "clearance.view" }],
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
      className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-white"
    >
      <div className="flex h-20 items-center border-b border-border px-3">
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-green text-base font-extrabold text-white"
          >
            EK
          </span>
          <span className="flex flex-col leading-none text-brand-green-dark">
            <span className="text-[18px] font-black tracking-tight">EdukaTrak</span>
            <span className="mt-1 text-[12px] font-semibold tracking-tight text-text-muted-readable">
              {en.app.navbarName}
            </span>
          </span>
        </span>
      </div>
      <ul className="flex-1 space-y-4 overflow-y-auto p-3">
        {visibleGroups.map((group) => (
          <li key={group.label}>
            <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-text-muted-readable">
              {group.label}
            </h2>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const showNestedStyle = Boolean(item.parentTo && group.items.some((groupItem) => groupItem.to === item.parentTo));

                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end ?? item.to === "/"}
                      className={({ isActive }) =>
                        cn(
                          "block rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary",
                          showNestedStyle && "ml-4 border-l border-border pl-4 text-[13px]",
                          isActive &&
                            "bg-[#E7F5EA] text-brand-green-dark hover:bg-[#E7F5EA]",
                        )
                      }
                    >
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
