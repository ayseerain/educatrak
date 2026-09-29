import { Bell } from "lucide-react";
import type { AuthenticatedUser } from "@/lib/types";
import { en } from "@/i18n/en";

const ROLE_LABEL: Record<AuthenticatedUser["role"], string> = {
  cashier: "Cashier",
  accounting: "Accounting",
  administrator: "Administrator",
  auditor: "Auditor",
  registrar: "Registrar",
};

interface HeaderProps {
  user: AuthenticatedUser;
}

export function Header({ user }: HeaderProps) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-6">
      <div className="w-80 max-w-full">
        <label htmlFor="global-search" className="sr-only">
          {en.header.searchPlaceholder}
        </label>
        <input
          id="global-search"
          type="search"
          placeholder={en.header.searchPlaceholder}
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:border-brand-green"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label={en.header.notifications}
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface"
        >
          <Bell aria-hidden="true" className="h-4 w-4" />
        </button>

        <button
          type="button"
          aria-label={en.header.profileMenu}
          className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-surface"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green-light text-sm font-semibold text-brand-green-dark"
          >
            {initials}
          </span>
          <span className="text-left">
            <span className="block text-sm font-medium text-text-primary">
              {user.name}
            </span>
            <span className="block text-xs text-text-muted-readable">
              {ROLE_LABEL[user.role]}
            </span>
          </span>
        </button>
      </div>
    </header>
  );
}
