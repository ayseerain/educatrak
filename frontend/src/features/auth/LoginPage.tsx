import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { en } from "@/i18n/en";

const loginSchema = z.object({
  username: z.string().trim().min(1, en.login.usernameRequired),
  password: z.string().min(1, en.login.passwordRequired),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function formatWait(lockUntil: number) {
  const minutes = Math.max(1, Math.ceil((lockUntil - Date.now()) / 60000));
  return en.login.locked.replace("{minutes}", String(minutes));
}

export function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useSession();
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginFormValues>({
    defaultValues: { username: "", password: "" },
  });
  const usernameField = register("username");
  const passwordField = register("password");
  const [authError, setAuthError] = useState("");
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
        setAuthError("");
      } else {
        setAuthError(formatWait(lockedUntil));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  function submit(values: LoginFormValues) {
    setAuthError("");
    const parsed = loginSchema.safeParse(values);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (path === "username" || path === "password") {
          setError(path, { message: issue.message });
        }
      }
      return;
    }

    const result = login(parsed.data.username, parsed.data.password);
    if (result.ok) return;
    if (result.lockedUntil) {
      setLockedUntil(result.lockedUntil);
      setAuthError(formatWait(result.lockedUntil));
      return;
    }
    setAuthError(en.login.invalidCredentials);
  }

  const disabled = Boolean(lockedUntil && lockedUntil > Date.now()) || isSubmitting;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <section className="w-full max-w-md rounded-lg border border-border bg-white p-8 shadow-card" aria-labelledby="login-title">
        <div className="mb-8 text-center">
          <div className="mb-5 flex items-center justify-center gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-green-dark font-bold text-white">EK</span>
            <span className="text-xl font-semibold text-brand-green-dark">{en.app.name}</span>
          </div>
          <h1 id="login-title" className="text-2xl font-semibold text-text-primary">{en.login.title}</h1>
          <p className="mt-2 text-sm text-text-secondary">{en.login.subtitle}</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-text-primary">{en.login.username}</label>
            <input
              id="username"
              autoComplete="username"
              aria-invalid={Boolean(errors.username)}
              aria-describedby={errors.username ? "username-error" : undefined}
              className="h-11 w-full rounded-md border border-border bg-white px-3 text-base focus-visible:border-brand-green-dark"
              disabled={disabled}
              {...usernameField}
              ref={(element) => {
                usernameField.ref(element);
                usernameRef.current = element;
              }}
            />
            {errors.username?.message && (
              <p id="username-error" className="mt-2 text-sm text-status-error">
                {errors.username.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-text-primary">{en.login.password}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="h-11 w-full rounded-md border border-border bg-white px-3 text-base focus-visible:border-brand-green-dark"
              disabled={disabled}
              {...passwordField}
            />
            {errors.password?.message && (
              <p id="password-error" className="mt-2 text-sm text-status-error">
                {errors.password.message}
              </p>
            )}
          </div>
          {authError && <p role="alert" className="rounded-md border border-[#F3C2C2] bg-[#FBEAEA] p-3 text-sm text-status-error">{authError}</p>}
          <Button type="submit" className="w-full" disabled={disabled}>{en.login.submit}</Button>
        </form>

        <p className="mt-6 text-xs leading-5 text-text-muted-readable">{en.login.mockHint}</p>
      </section>
    </main>
  );
}
