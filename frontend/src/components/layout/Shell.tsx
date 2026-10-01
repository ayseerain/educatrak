import type { PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { AuthenticatedUser, Role } from "@/lib/types";
import { en } from "@/i18n/en";

interface ShellProps extends PropsWithChildren {
  user: AuthenticatedUser;
  onLogout: () => void;
  onRoleChange: (role: Role) => void;
}

export function Shell({ user, onLogout, onRoleChange, children }: ShellProps) {
  return (
    <div className="flex h-screen min-w-[1024px] bg-surface">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow-card"
      >
        {en.a11y.skipToContent}
      </a>
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} onLogout={onLogout} onRoleChange={onRoleChange} />
        <main id="main-content" className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
