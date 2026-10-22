import { useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StudentSearchField } from "@/features/students/StudentSearchField";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import type { AuthenticatedUser, Role } from "@/lib/types";
import { en } from "@/i18n/en";

const ROLE_LABEL: Record<Role, string> = {
  cashier: "Cashier",
  accounting: "Accounting",
  administrator: "Administrator",
  auditor: "Auditor",
  registrar: "Registrar",
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "administrator", label: ROLE_LABEL.administrator },
  { value: "cashier", label: ROLE_LABEL.cashier },
  { value: "accounting", label: ROLE_LABEL.accounting },
  { value: "auditor", label: ROLE_LABEL.auditor },
  { value: "registrar", label: ROLE_LABEL.registrar },
];

interface HeaderProps {
  user: AuthenticatedUser;
  onLogout: () => void;
  onRoleChange: (role: Role) => void;
}

export function Header({ user, onLogout, onRoleChange }: HeaderProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleRoleChange(role: Role) {
    onRoleChange(role);
    navigate("/");
  }

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-3 border-b border-border bg-white px-4 py-2 md:flex-nowrap md:justify-between md:px-6">
      <div className="order-2 w-full md:order-1 md:w-80 md:max-w-full">
        <StudentSearchField
          id="global-search"
          label={en.header.searchPlaceholder}
          value={query}
          onChange={setQuery}
          placeholder={en.header.searchPlaceholder}
          labelClassName="sr-only"
          inputClassName="h-11 rounded-md border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:border-brand-green"
        />
      </div>

      <div className="order-1 ml-auto flex items-center gap-2 md:order-2 md:ml-0 md:gap-4">
        <DropdownSelect
          aria-label={en.header.previewRole}
          value={user.role}
          options={ROLE_OPTIONS}
          onChange={handleRoleChange}
          className="!h-11 min-w-36 border-dashed bg-surface"
          contentClassName="min-w-44"
        />
        <button
          type="button"
          aria-label={en.header.profileMenu}
          className="flex min-h-control items-center gap-3 rounded-md px-2 py-1 hover:bg-surface"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green-light text-sm font-semibold text-brand-green-dark"
          >
            {initials}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium text-text-primary">
              {user.name}
            </span>
            <span className="block text-xs text-text-muted-readable">
              {ROLE_LABEL[user.role]}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-control items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium text-text-primary hover:bg-surface"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {en.header.signOut}
        </button>
      </div>
    </header>
  );
}
