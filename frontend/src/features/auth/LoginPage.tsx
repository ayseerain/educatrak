import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { en } from "@/i18n/en";

function formatWait(lockUntil: number) {
  const minutes = Math.max(1, Math.ceil((lockUntil - Date.now()) / 60000));
  return en.login.locked.replace("{minutes}", String(minutes));
}

export function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useSession();
  const usernameRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [lockedUntil, setLockedUntil] = useState<number>();

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!user) return;
    navigate("/", { replace: true });
  }, [navigate, user]);

  useEffect(() => {
    if (!lockedUntil) return;
    const timer = window.setInterval(() => {
      if (lockedUntil <= Date.now()) {
        setLockedUntil(undefined);
        setError("");
      } else {
        setError(formatWait(lockedUntil));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const result = login(username, password);
    if (result.ok) return;
    if (result.lockedUntil) {
      setLockedUntil(result.lockedUntil);
      setError(formatWait(result.lockedUntil));
      return;
    }
    setError(en.login.invalidCredentials);
  }

  const disabled = Boolean(lockedUntil && lockedUntil > Date.now());

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <section className="w-full max-w-md rounded-lg border border-border bg-white p-8 shadow-card" aria-labelledby="login-title">
        <div className="mb-8">
          <div className="mb-5 flex items-center gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-green-dark font-bold text-white">EK</span>
            <span className="text-xl font-semibold text-brand-green-dark">{en.app.name}</span>
          </div>
          <h1 id="login-title" className="text-2xl font-semibold text-text-primary">{en.login.title}</h1>
          <p className="mt-2 text-sm text-text-secondary">{en.login.subtitle}</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-text-primary">{en.login.username}</label>
            <input ref={usernameRef} id="username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="h-11 w-full rounded-md border border-border bg-white px-3 text-base focus-visible:border-brand-green-dark" disabled={disabled} required />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-text-primary">{en.login.password}</label>
            <input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-md border border-border bg-white px-3 text-base focus-visible:border-brand-green-dark" disabled={disabled} required />
          </div>
          {error && <p role="alert" className="rounded-md border border-[#F3C2C2] bg-[#FBEAEA] p-3 text-sm text-status-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={disabled}>{en.login.submit}</Button>
        </form>

        <p className="mt-6 text-xs leading-5 text-text-muted-readable">{en.login.mockHint}</p>
      </section>
    </main>
  );
}
