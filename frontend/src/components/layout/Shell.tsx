import { useState, type PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";
import type { AuthenticatedUser, Role } from "@/lib/types";
import { en } from "@/i18n/en";

interface ShellProps extends PropsWithChildren {
  user: AuthenticatedUser;
  onLogout: () => void;
  onRoleChange: (role: Role) => void;
}

export function Shell({ user, onLogout, onRoleChange, children }: ShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem("educatrak.sidebar.collapsed") === "true";
    } catch {
      return false;
    }
  });

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        window.localStorage.setItem("educatrak.sidebar.collapsed", String(next));
      } catch {
        // The sidebar remains usable when browser storage is unavailable.
      }
      return next;
    });
  }

  return (
    <div className="fixed inset-0 flex min-w-0 flex-col overflow-auto bg-surface md:flex-row md:overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow-card"
      >
        {en.a11y.skipToContent}
      </a>
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} onLogout={onLogout} onRoleChange={onRoleChange} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
        <main id="main-content" className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
