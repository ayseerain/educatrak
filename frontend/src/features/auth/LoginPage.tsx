import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
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
  const remainingMs = Math.max(0, lockUntil - Date.now());
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));

  if (seconds < 60) {
    const template = seconds === 1 ? en.login.secondWait : en.login.secondsWait;
    return en.login.locked.replace("{time}", template.replace("{seconds}", String(seconds)));
  }

  const minutes = Math.ceil(seconds / 60);
  const template = minutes === 1 ? en.login.minuteWait : en.login.minutesWait;
  return en.login.locked.replace("{time}", template.replace("{minutes}", String(minutes)));
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
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordHelpOpen, setIsForgotPasswordHelpOpen] = useState(false);

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

  async function submit(values: LoginFormValues) {
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

    const result = await login(parsed.data.username, parsed.data.password);
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
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-10 sm:px-8">
      <section
        className="grid w-full max-w-7xl overflow-hidden rounded-lg border border-border bg-white shadow-[0_18px_50px_rgba(0,0,0,0.12)] lg:min-h-[680px] lg:grid-cols-[1.1fr_0.9fr]"
        aria-labelledby="login-title"
      >
        <div className="relative hidden overflow-hidden border-r border-white/15 bg-brand-green-dark/90 p-10 text-white backdrop-blur-sm lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden="true"
            className="absolute inset-x-[-12%] top-28 h-28 -rotate-6 bg-brand-green/75"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-[-12%] top-52 h-28 rotate-6 bg-brand-green-light/65"
          />
          <div className="relative flex items-center gap-5 text-left">
            <img
              src="/mendez-christian-academy-seal.png"
              alt="Mendez Christian Academy seal"
              className="h-20 w-20 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="text-[44px] font-semibold leading-none tracking-[-0.025em]">{en.app.name}</p>
              <p className="ml-[2px] mt-0.5 text-xs leading-4 text-white/85">{en.app.tagline}</p>
            </div>
          </div>

          <div className="relative max-w-sm">
            <p className="text-lg font-semibold leading-7">{en.login.mockHint}</p>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-12 sm:px-12 lg:px-16">
          <div className="w-full max-w-xl">
            <div className="mb-6 text-center lg:text-left">
              <div className="mb-5 flex items-center justify-center gap-4 lg:hidden">
                <img
                  src="/mendez-christian-academy-seal.png"
                  alt="Mendez Christian Academy seal"
                  className="h-20 w-20 shrink-0 object-contain"
                />
                <div className="text-left">
                  <p className="text-[44px] font-semibold leading-none tracking-[-0.025em] text-brand-green-dark">{en.app.name}</p>
                  <p className="ml-[2px] mt-0.5 text-xs leading-4 text-text-secondary">{en.app.tagline}</p>
                </div>
              </div>
              <h1 id="login-title" className="text-2xl font-semibold text-text-primary">{en.login.title}</h1>
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
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className="h-11 w-full rounded-md border border-border bg-white px-3 pr-12 text-base focus-visible:border-brand-green-dark"
                    disabled={disabled}
                    {...passwordField}
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-brand-green-dark hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark disabled:pointer-events-none disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => setShowPassword((current) => !current)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? en.login.hidePassword : en.login.showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
                {errors.password?.message && (
                  <p id="password-error" className="mt-2 text-sm text-status-error">
                    {errors.password.message}
                  </p>
                )}
              </div>
              {authError && <p role="alert" className="rounded-md border border-[#F3C2C2] bg-[#FBEAEA] p-3 text-sm text-status-error">{authError}</p>}
              <Button type="submit" className="w-full" disabled={disabled}>{en.login.submit}</Button>
            </form>

            <div className="mt-5 text-center lg:text-left">
              <button
                type="button"
                className="inline-flex min-h-control items-center text-sm font-medium text-brand-green-dark underline underline-offset-4 hover:text-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"
                aria-expanded={isForgotPasswordHelpOpen}
                aria-controls="forgot-password-help"
                onClick={() => setIsForgotPasswordHelpOpen((current) => !current)}
              >
                {en.login.forgotPassword}
              </button>
              {isForgotPasswordHelpOpen && (
                <p id="forgot-password-help" role="status" className="mt-2 text-sm text-text-secondary">
                  {en.login.forgotPasswordHelp}
                </p>
              )}
            </div>

            <p className="mt-6 text-xs leading-5 text-text-muted-readable lg:hidden">{en.login.mockHint}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
