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
  login: (username: string, password: string, rememberMe?: boolean) => LoginResult | Promise<LoginResult>;
  logout: () => void;
  renewSession: () => void;
  switchRole: (role: Role) => Promise<boolean>;
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

// Mock mode only: keeps the signed-in development user across a page refresh for this tab.
// Live mode never uses it; the Laravel cookie session is restored from /api/auth/me instead.
const MOCK_SESSION_KEY = "educatrak.mockSession";

interface StoredMockSession {
  user: AuthenticatedUser;
  expiresAt: number;
}

function readMockSession(): StoredMockSession | null {
  if (isLiveCashierApiEnabled()) return null;
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(MOCK_SESSION_KEY) ?? "null") as StoredMockSession | null;
    if (!stored?.user?.id || !stored.user.role || !(stored.expiresAt > Date.now())) return null;
    return stored;
  } catch {
    return null;
  }
}

export function SessionProvider({
  children,
  sessionDurationMs = DEFAULT_SESSION_DURATION_MS,
  warningDurationMs = DEFAULT_WARNING_DURATION_MS,
}: SessionProviderProps) {
  const [restoredMockSession] = useState(readMockSession);
  const [user, setUser] = useState<AuthenticatedUser | null>(restoredMockSession?.user ?? null);
  const [expiresAt, setExpiresAt] = useState<number | null>(restoredMockSession?.expiresAt ?? null);
  const [rememberMockSession, setRememberMockSession] = useState(Boolean(restoredMockSession));
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
    setRememberMockSession(false);
    setExpirationWarningOpen(false);
    setSessionRestoreError(null);
  }, []);

  const login = useCallback(
    async (username: string, password: string, rememberMe = false): Promise<LoginResult> => {
      if (isLiveCashierApiEnabled()) {
        try {
          const liveUser = await signInWithLiveApi(username, password, rememberMe);
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
      setRememberMockSession(rememberMe);
      lastActivityRenewalAt.current = now;
      setExpiresAt(now + sessionDurationMs);
      setExpirationWarningOpen(false);
      return { ok: true };
    },
    [failedAttempts, lockedUntil, sessionDurationMs],
  );

  const switchRole = useCallback(
    async (role: Role): Promise<boolean> => {
      if (isLiveCashierApiEnabled()) {
        // A live-data account switch is only a local development aid. It uses
        // the regular Laravel sign-in route, so the backend continues to
        // establish the session and enforce each account's permissions.
        if (!import.meta.env.DEV) return false;

        const { LIVE_DEMO_CREDENTIALS } = await import("./liveDemoAccounts");
        const credentials = LIVE_DEMO_CREDENTIALS[role];
        try {
          const liveUser = await signInWithLiveApi(credentials.username, credentials.password);
          const now = Date.now();
          setUser(liveUser);
          lastActivityRenewalAt.current = now;
          setExpiresAt(now + sessionDurationMs);
          setExpirationWarningOpen(false);
          return true;
        } catch {
          return false;
        }
      }

      const { MOCK_USERS_BY_ROLE } = await import("./mockSession");
      setUser(MOCK_USERS_BY_ROLE[role]);
      renewSession();
      return true;
    },
    [renewSession, sessionDurationMs],
  );

  const changeOwnPassword = useCallback(async (currentPassword: string, password: string) => {
    if (isLiveCashierApiEnabled()) {
      const updatedUser = await changeLivePassword(currentPassword, password);
      setUser(updatedUser);
      renewSession();
      return;
    }
    setUser((currentUser) => currentUser ? { ...currentUser, mustChangePassword: false } : currentUser);
  }, [renewSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isLiveCashierApiEnabled()) return;
    try {
      if (user && expiresAt && rememberMockSession) {
        window.sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify({ user, expiresAt } satisfies StoredMockSession));
      } else {
        window.sessionStorage.removeItem(MOCK_SESSION_KEY);
      }
    } catch {
      // Without browser storage, a refresh simply returns to the sign-in screen.
    }
  }, [expiresAt, rememberMockSession, user]);

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
