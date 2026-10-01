import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

const MOCK_USERS_BY_ROLE: Record<Role, AuthenticatedUser> = Object.values(MOCK_USERS).reduce(
  (usersByRole, { user }) => ({ ...usersByRole, [user.role]: user }),
  {} as Record<Role, AuthenticatedUser>,
);

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
  switchRole: (role: Role) => void;
}

interface SessionProviderProps extends PropsWithChildren {
  sessionDurationMs?: number;
  warningDurationMs?: number;
}

const DEFAULT_SESSION_DURATION_MS = 30 * 60 * 1000;
const DEFAULT_WARNING_DURATION_MS = 60 * 1000;
const LOCKOUT_DURATION_MS = 30 * 1000;
const ACTIVITY_RENEWAL_THROTTLE_MS = 1000;
const ACTIVITY_EVENTS = [
  "focus",
  "input",
  "keydown",
  "mousedown",
  "pointerdown",
  "scroll",
  "touchstart",
  "wheel",
] as const;

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
  const lastActivityRenewalAt = useRef(0);

  const renewSession = useCallback(() => {
    const now = Date.now();
    lastActivityRenewalAt.current = now;
    setExpiresAt(now + sessionDurationMs);
    setExpirationWarningOpen(false);
  }, [sessionDurationMs]);

  const logout = useCallback(() => {
    lastActivityRenewalAt.current = 0;
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
          const nextLock = now + LOCKOUT_DURATION_MS;
          setLockedUntil((locks) => ({ ...locks, [normalizedUsername]: nextLock }));
          setFailedAttempts((values) => ({ ...values, [normalizedUsername]: 0 }));
          return { ok: false, lockedUntil: nextLock };
        }
        setFailedAttempts((values) => ({ ...values, [normalizedUsername]: attempts }));
        return { ok: false };
      }

      setFailedAttempts((values) => ({ ...values, [normalizedUsername]: 0 }));
      setUser(candidate.user);
      lastActivityRenewalAt.current = now;
      setExpiresAt(now + sessionDurationMs);
      setExpirationWarningOpen(false);
      return { ok: true };
    },
    [failedAttempts, lockedUntil, sessionDurationMs],
  );

  const switchRole = useCallback(
    (role: Role) => {
      setUser(MOCK_USERS_BY_ROLE[role]);
      renewSession();
    },
    [renewSession],
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
    if (!user || !expiresAt) return;
    const currentExpiresAt = expiresAt;

    function handleActivity(event: Event) {
      if (event.type === "focus" && event.target !== window) return;

      const now = Date.now();
      if (now >= currentExpiresAt) return;
      if (now - lastActivityRenewalAt.current < ACTIVITY_RENEWAL_THROTTLE_MS) {
        return;
      }

      lastActivityRenewalAt.current = now;
      setExpiresAt(now + sessionDurationMs);
      setExpirationWarningOpen(false);
    }

    const listenerOptions = { capture: true, passive: true };
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, listenerOptions);
    }

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity, listenerOptions);
      }
    };
  }, [expiresAt, sessionDurationMs, user]);

  const value = useMemo(
    () => ({
      expiresAt,
      isExpirationWarningOpen,
      user,
      login,
      logout,
      renewSession,
      switchRole,
    }),
    [expiresAt, isExpirationWarningOpen, login, logout, renewSession, switchRole, user],
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
