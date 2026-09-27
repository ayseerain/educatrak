import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  expiresAt: number | null;
  isExpirationWarningOpen: boolean;
  user: AuthenticatedUser | null;
  login: (username: string, password: string) => LoginResult;
  logout: () => void;
  renewSession: () => void;
}

interface SessionProviderProps extends PropsWithChildren {
  sessionDurationMs?: number;
  warningDurationMs?: number;
}

const DEFAULT_SESSION_DURATION_MS = 30 * 60 * 1000;
const DEFAULT_WARNING_DURATION_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "focus"] as const;

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  sessionDurationMs = DEFAULT_SESSION_DURATION_MS,
  warningDurationMs = DEFAULT_WARNING_DURATION_MS,
}: SessionProviderProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isExpirationWarningOpen, setExpirationWarningOpen] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>({});
  const [lockedUntil, setLockedUntil] = useState<Record<string, number>>({});

  const renewSession = useCallback(() => {
    setExpiresAt(Date.now() + sessionDurationMs);
    setExpirationWarningOpen(false);
  }, [sessionDurationMs]);

  const logout = useCallback(() => {
    setUser(null);
    setExpiresAt(null);
    setExpirationWarningOpen(false);
  }, []);

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
      setExpiresAt(now + sessionDurationMs);
      setExpirationWarningOpen(false);
      return { ok: true };
    },
    [failedAttempts, lockedUntil, sessionDurationMs],
  );

  useEffect(() => {
    if (!user || !expiresAt) return;

    const timer = window.setInterval(() => {
      const now = Date.now();
      const warningStartsAt = expiresAt - Math.min(warningDurationMs, sessionDurationMs);

      if (now >= expiresAt) {
        logout();
        return;
      }

      if (now >= warningStartsAt) {
        setExpirationWarningOpen(true);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expiresAt, logout, sessionDurationMs, user, warningDurationMs]);

  useEffect(() => {
    if (!user || !expiresAt || isExpirationWarningOpen) return;

    function handleActivity() {
      setExpiresAt(Date.now() + sessionDurationMs);
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity);
    }

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
    };
  }, [expiresAt, isExpirationWarningOpen, sessionDurationMs, user]);

  const value = useMemo(
    () => ({
      expiresAt,
      isExpirationWarningOpen,
      user,
      login,
      logout,
      renewSession,
    }),
    [expiresAt, isExpirationWarningOpen, login, logout, renewSession, user],
  );
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
