import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { AuthenticatedUser, Role } from "@/lib/types";

const MOCK_USERS: Record<string, { password: string; user: AuthenticatedUser }> = {
  "sample.cashier": {
    password: "SamplePass123!",
    user: { id: "user-cashier", name: "Casey Cashier (sample)", role: "cashier" },
  },
  "sample.accounting": {
    password: "SamplePass123!",
    user: { id: "user-accounting", name: "Avery Accounting (sample)", role: "accounting" },
  },
  "sample.admin": {
    password: "SamplePass123!",
    user: { id: "user-admin", name: "Alex Administrator (sample)", role: "administrator" },
  },
  "sample.auditor": {
    password: "SamplePass123!",
    user: { id: "user-auditor", name: "Arden Auditor (sample)", role: "auditor" },
  },
  "sample.registrar": {
    password: "SamplePass123!",
    user: { id: "user-registrar", name: "Riley Registrar (sample)", role: "registrar" },
  },
};

interface LoginResult {
  ok: boolean;
  lockedUntil?: number;
}

interface SessionContextValue {
  user: AuthenticatedUser | null;
  login: (username: string, password: string) => LoginResult;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>({});
  const [lockedUntil, setLockedUntil] = useState<Record<string, number>>({});

  const login = useCallback(
    (username: string, password: string): LoginResult => {
      const normalizedUsername = username.trim().toLowerCase();
      const now = Date.now();
      const currentLock = lockedUntil[normalizedUsername] ?? 0;

      if (currentLock > now) return { ok: false, lockedUntil: currentLock };

      const candidate = MOCK_USERS[normalizedUsername];
      if (!candidate || candidate.password !== password) {
        const attempts = (failedAttempts[normalizedUsername] ?? 0) + 1;
        if (attempts >= 3) {
          const nextLock = now + 5 * 60 * 1000;
          setLockedUntil((locks) => ({ ...locks, [normalizedUsername]: nextLock }));
          setFailedAttempts((values) => ({ ...values, [normalizedUsername]: 0 }));
          return { ok: false, lockedUntil: nextLock };
        }
        setFailedAttempts((values) => ({ ...values, [normalizedUsername]: attempts }));
        return { ok: false };
      }

      setFailedAttempts((values) => ({ ...values, [normalizedUsername]: 0 }));
      setUser(candidate.user);
      return { ok: true };
    },
    [failedAttempts, lockedUntil],
  );

  const value = useMemo(() => ({ user, login, logout: () => setUser(null) }), [login, user]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}

export function roleLabel(role: Role) {
  return {
    cashier: "Cashier",
    accounting: "Accounting Officer",
    administrator: "Administrator",
    auditor: "Auditor",
    registrar: "Registrar",
  }[role];
}
