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

const NAV_ITEMS: NavItem[] = [
  { label: en.nav.dashboard, to: "/", capability: "dashboard.view" },
  { label: en.nav.students, to: "/students", capability: "students.view" },
  { label: en.nav.accounts, to: "/accounts", capability: "accounts.view" },
  { label: en.nav.payments, to: "/payments", capability: "payments.view" },
  { label: en.nav.followUp, to: "/follow-up", capability: "followUp.view" },
  { label: en.nav.clearance, to: "/clearance", capability: "clearance.view" },
  { label: en.nav.reports, to: "/reports", capability: "reports.view" },
  {
    label: en.nav.voidApprovals,
    to: "/void-approvals",
    capability: "voidApprovals.view",
  },
  { label: en.nav.closeOut, to: "/close-out", capability: "closeOut.view" },
  {
    label: en.nav.closeOutHistory,
    to: "/close-out-history",
    capability: "closeOut.history",
  },
  { label: en.nav.import, to: "/import", capability: "import.view" },
  {
    label: en.nav.administration,
    to: "/administration",
    capability: "administration.view",
  },
  { label: en.nav.backup, to: "/backup", capability: "backup.view" },
  { label: en.nav.auditLog, to: "/audit-log", capability: "auditLog.view" },
  {
    label: en.nav.notifications,
    to: "/notifications",
    capability: "notifications.view",
  },
  { label: en.nav.settings, to: "/settings", capability: "settings.view" },
];

interface SidebarProps {
  user: AuthenticatedUser;
}

export function Sidebar({ user }: SidebarProps) {
  const visibleItems = NAV_ITEMS.filter((item) => can(user, item.capability));

  return (
    <nav
      aria-label="Primary"
      className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-white"
    >
      <div className="flex h-16 items-center border-b border-border px-4">
        <span className="flex items-center gap-2 text-lg font-semibold text-brand-green-dark">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-green text-sm font-bold text-white"
          >
            EK
          </span>
          {en.app.name}
        </span>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {visibleItems.map((item) => (
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
    </nav>
  );
}
