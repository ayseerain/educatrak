import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { z } from "zod";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { en } from "@/i18n/en";

const loginSchema = z.object({
  username: z.string().trim().min(1, en.login.usernameRequired),
  password: z.string().min(1, en.login.passwordRequired),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const highPriorityImageProps = { fetchpriority: "high" } as Record<string, string>;

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
    <main className="flex min-h-[100dvh] items-center justify-center bg-surface p-4 sm:p-6 lg:p-8">
      <section
        className="grid w-full max-w-[1120px] overflow-hidden rounded-xl bg-white p-1.5 lg:min-h-[620px] lg:grid-cols-[53fr_47fr]"
        aria-labelledby="login-title"
      >
        <div className="relative hidden min-h-[620px] overflow-hidden rounded-lg lg:block">
          <img
            src="/loginpage_bg.jpg"
            alt="Mendez Christian Academy campus"
            width={1392}
            height={768}
            {...highPriorityImageProps}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-black/45"
          />
          <div className="relative z-10 flex h-full flex-col justify-between p-8 text-white lg:p-10">
            <div className="flex max-w-sm items-center gap-4 rounded-md bg-brand-green-dark p-5 text-left">
              <img
                src="/mendez-christian-academy-seal.png"
                alt="Mendez Christian Academy seal"
                className="h-16 w-16 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="text-[38px] font-semibold leading-none tracking-[-0.025em]">{en.app.name}</p>
                <p className="ml-[2px] mt-0.5 text-xs leading-4 text-white/85">{en.app.tagline}</p>
              </div>
            </div>
            {import.meta.env.DEV && (
              <p className="max-w-sm text-lg font-semibold leading-7">{en.login.mockHint}</p>
            )}
          </div>
        </div>

        <div className="flex min-h-[590px] flex-col px-7 py-8 sm:px-12 lg:px-14 lg:py-10">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-[330px]">
              <div className="mb-9 text-center">
                <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
                <img
                  src="/mendez-christian-academy-seal.png"
                  alt="Mendez Christian Academy seal"
                  className="h-12 w-12 shrink-0 object-contain"
                />
                <div>
                  <p className="text-xl font-semibold leading-tight tracking-tight text-brand-green-dark">{en.app.name}</p>
                  <p className="mt-0.5 text-xs leading-4 text-text-secondary">{en.app.tagline}</p>
                </div>
              </div>
                <h1 id="login-title" className="text-[42px] font-semibold leading-none tracking-[-0.035em] text-text-primary">{en.login.title}</h1>
                <p className="mt-3 text-sm text-text-secondary">Use your EducaTrak account to continue.</p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
                <div>
                  <label htmlFor="username" className="mb-2 block text-sm font-medium text-text-primary">{en.login.username}</label>
                  <div className="relative">
                    <UserRound
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
                    />
                    <input
                      id="username"
                      autoComplete="username"
                      aria-invalid={Boolean(errors.username)}
                      aria-describedby={errors.username ? "username-error" : undefined}
                      className="h-11 w-full rounded-md border border-border bg-white px-10 text-base transition-colors duration-150 hover:border-brand-green focus-visible:border-brand-green-dark motion-reduce:transition-none disabled:cursor-not-allowed"
                      disabled={disabled}
                      {...usernameField}
                      ref={(element) => {
                        usernameField.ref(element);
                        usernameRef.current = element;
                      }}
                    />
                  </div>
                  {errors.username?.message && (
                    <p id="username-error" role="alert" className="mt-2 text-sm text-status-error">
                      {errors.username.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-text-primary">{en.login.password}</label>
                  <div className="relative">
                    <LockKeyhole
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
                    />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? "password-error" : undefined}
                      className="h-11 w-full rounded-md border border-border bg-white px-10 pr-12 text-base transition-colors duration-150 hover:border-brand-green focus-visible:border-brand-green-dark motion-reduce:transition-none disabled:cursor-not-allowed"
                      disabled={disabled}
                      {...passwordField}
                    />
                    <Button
                      variant="ghost"
                      type="button"
                      className="absolute right-0 top-1/2 h-11 w-11 min-h-0 -translate-y-1/2 rounded-md px-0"
                      disabled={disabled}
                      onClick={() => setShowPassword((current) => !current)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? en.login.hidePassword : en.login.showPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </Button>
                  </div>
                  {errors.password?.message && (
                    <p id="password-error" role="alert" className="mt-2 text-sm text-status-error">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                {authError && <p role="alert" className="rounded-md border border-[#F3C2C2] bg-[#FBEAEA] p-3 text-sm text-status-error">{authError}</p>}
                <Button type="submit" className="w-full" disabled={disabled}>{en.login.submit}</Button>
              </form>

              <div className="mt-3 text-right">
                <Button
                  variant="ghost"
                  type="button"
                  className="px-1 text-sm underline decoration-brand-green-dark/40 underline-offset-4 hover:text-brand-green"
                  aria-expanded={isForgotPasswordHelpOpen}
                  aria-controls="forgot-password-help"
                  onClick={() => setIsForgotPasswordHelpOpen((current) => !current)}
                >
                  {en.login.forgotPassword}
                </Button>
                {isForgotPasswordHelpOpen && (
                  <p id="forgot-password-help" role="status" className="mt-2 text-left text-sm text-text-secondary">
                    {en.login.forgotPasswordHelp}
                  </p>
                )}
              </div>

              {import.meta.env.DEV && (
                <p className="mt-6 text-xs leading-5 text-text-muted-readable">{en.login.mockHint}</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
