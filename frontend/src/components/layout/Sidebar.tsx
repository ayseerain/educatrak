import { NavLink } from "react-router-dom";
import { can } from "@/lib/permissions";
import type { AuthenticatedUser, Capability } from "@/lib/types";
import { en } from "@/i18n/en";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  to: string;
  capability: Capability;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: en.nav.overview,
    items: [{ label: en.nav.dashboard, to: "/", capability: "dashboard.view" }],
  },
  {
    label: en.nav.studentBilling,
    items: [
      { label: en.nav.students, to: "/students", capability: "student.view" },
      { label: en.nav.accounts, to: "/accounts", capability: "account.view" },
      { label: en.nav.payments, to: "/payments", capability: "payment.view" },
      { label: en.nav.followUp, to: "/followup", capability: "followup.view" },
      { label: en.nav.clearance, to: "/clearance", capability: "clearance.view" },
    ],
  },
  {
    label: en.nav.reportsControls,
    items: [
      { label: en.nav.reports, to: "/reports", capability: "report.view" },
      { label: en.nav.voidApprovals, to: "/voids", capability: "payment.void.approve" },
      { label: en.nav.closeOut, to: "/closeout", capability: "closeout.submit" },
      { label: en.nav.closeOutHistory, to: "/closeout/history", capability: "closeout.view" },
    ],
  },
  {
    label: en.nav.administrationGroup,
    items: [
      { label: en.nav.import, to: "/import", capability: "import.run" },
      { label: en.nav.administration, to: "/admin/users", capability: "user.manage" },
      { label: en.nav.backup, to: "/admin/backup", capability: "backup.manage" },
      { label: en.nav.auditLog, to: "/admin/audit-log", capability: "audit.view" },
      { label: en.nav.notifications, to: "/notifications", capability: "notification.view" },
      { label: en.nav.settings, to: "/settings/fees", capability: "settings.finance" },
    ],
  },
];

interface SidebarProps {
  user: AuthenticatedUser;
}

export function Sidebar({ user }: SidebarProps) {
  const visibleGroups = NAV_GROUPS.map((group) => ({
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
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "block rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary",
                        isActive &&
                          "bg-[#E7F5EA] text-brand-green-dark hover:bg-[#E7F5EA]",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
