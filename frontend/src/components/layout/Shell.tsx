import { useEffect, useState, type PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";
import { BusinessDateSimulator } from "./BusinessDateSimulator";
import type { AuthenticatedUser, Role } from "@/lib/types";
import { en } from "@/i18n/en";

interface ShellProps extends PropsWithChildren {
  user: AuthenticatedUser;
  onLogout: () => void;
  onRoleChange: (role: Role) => void;
}

/** The workstation's date and time, on its own so only this text re-renders every second. */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <time
      dateTime={now.toISOString()}
      className="hidden whitespace-nowrap text-sm font-semibold tabular-nums text-text-secondary sm:block"
    >
      {now.toLocaleDateString("en-PH", { weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}
      {" · "}
      {now.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Manila" })}
    </time>
  );
}

/** App shell (CLINIQ layout): left sidebar holding navigation and the signed-in account, and a top bar with the live clock. */
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
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-card"
      >
        {en.a11y.skipToContent}
      </a>
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} onLogout={onLogout} onRoleChange={onRoleChange} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
        <header className="no-print flex h-16 shrink-0 items-center gap-2 border-b border-border bg-white px-4 sm:px-6">
          <LiveClock />
          {import.meta.env.DEV && user.role === "cashier" && <div className="ml-auto"><BusinessDateSimulator /></div>}
        </header>
        <main id="main-content" className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
