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
import { CashierApiError, changeLivePassword, getLiveSession, isLiveCashierApiEnabled, signInWithLiveApi, signOutFromLiveApi } from "@/api/cashierApi";

interface LoginResult {
  ok: boolean;
  lockedUntil?: number;
}

interface SessionContextValue {
  expiresAt: number | null;
  isRestoringSession: boolean;
  sessionRestoreError: string | null;
  isExpirationWarningOpen: boolean;
  user: AuthenticatedUser | null;
  login: (username: string, password: string) => LoginResult | Promise<LoginResult>;
  logout: () => void;
  renewSession: () => void;
  switchRole: (role: Role) => void;
  retrySessionRestore: () => void;
  changeOwnPassword: (currentPassword: string, password: string) => Promise<void>;
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
  const [isRestoringSession, setIsRestoringSession] = useState(isLiveCashierApiEnabled());
  const [sessionRestoreError, setSessionRestoreError] = useState<string | null>(null);
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

  const restoreSession = useCallback(async () => {
    if (!isLiveCashierApiEnabled()) {
      setIsRestoringSession(false);
      return;
    }

    setIsRestoringSession(true);
    setSessionRestoreError(null);
    try {
      const liveUser = await getLiveSession();
      if (liveUser) {
        const now = Date.now();
        setUser(liveUser);
        lastActivityRenewalAt.current = now;
        setExpiresAt(now + sessionDurationMs);
      }
    } catch (error) {
      setSessionRestoreError(error instanceof Error ? error.message : "The session could not be restored.");
    } finally {
      setIsRestoringSession(false);
    }
  }, [sessionDurationMs]);

  const logout = useCallback(() => {
    if (isLiveCashierApiEnabled()) {
      void signOutFromLiveApi();
    }
    lastActivityRenewalAt.current = 0;
    setUser(null);
    setExpiresAt(null);
    setExpirationWarningOpen(false);
    setSessionRestoreError(null);
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      if (isLiveCashierApiEnabled()) {
        try {
          const liveUser = await signInWithLiveApi(username, password);
          const now = Date.now();
          setUser(liveUser);
          lastActivityRenewalAt.current = now;
          setExpiresAt(now + sessionDurationMs);
          setExpirationWarningOpen(false);

          return { ok: true };
        } catch (error) {
          if (error instanceof CashierApiError && error.status === 429 && error.retryAfterSeconds !== undefined) {
            return { ok: false, lockedUntil: Date.now() + Math.max(1, error.retryAfterSeconds) * 1000 };
          }
          return { ok: false };
        }
      }

      if (!import.meta.env.DEV) return { ok: false };

      const normalizedUsername = username.trim().toLowerCase();
      const now = Date.now();
      const currentLock = lockedUntil[normalizedUsername] ?? 0;

      if (currentLock > now) return { ok: false, lockedUntil: currentLock };

      const { MOCK_USERS } = await import("./mockSession");
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
      if (!import.meta.env.DEV || isLiveCashierApiEnabled()) return;
      void import("./mockSession").then(({ MOCK_USERS_BY_ROLE }) => {
        setUser(MOCK_USERS_BY_ROLE[role]);
        renewSession();
      });
    },
    [renewSession],
  );

  const changeOwnPassword = useCallback(async (currentPassword: string, password: string) => {
    if (isLiveCashierApiEnabled()) {
      const updatedUser = await changeLivePassword(currentPassword, password);
      setUser(updatedUser);
      renewSession();
      return;
    }
    if (!import.meta.env.DEV) throw new Error("Password changes require the authenticated server session.");
    setUser((currentUser) => currentUser ? { ...currentUser, mustChangePassword: false } : currentUser);
  }, [renewSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

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
      isRestoringSession,
      sessionRestoreError,
      isExpirationWarningOpen,
      user,
      login,
      logout,
      renewSession,
      switchRole,
      retrySessionRestore: restoreSession,
      changeOwnPassword,
    }),
    [changeOwnPassword, expiresAt, isExpirationWarningOpen, isRestoringSession, login, logout, renewSession, restoreSession, sessionRestoreError, switchRole, user],
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
    super_admin: "Super Admin",
    cashier: "Cashier",
    accounting: "Accounting Officer",
    administrator: "Administrator",
    auditor: "Auditor",
    registrar: "Registrar",
  }[role];
}
