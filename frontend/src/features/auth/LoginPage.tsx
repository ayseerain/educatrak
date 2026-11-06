import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { z } from "zod";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { en } from "@/i18n/en";

const loginSchema = z.object({
  username: z.string().trim().min(1, en.login.usernameRequired),
  password: z.string().min(1, en.login.passwordRequired),
  rememberMe: z.boolean(),
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
    defaultValues: { username: "", password: "", rememberMe: false },
  });
  const usernameField = register("username");
  const passwordField = register("password");
  const [authError, setAuthError] = useState("");
  const [lockedUntil, setLockedUntil] = useState<number>();
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordHelpOpen, setIsForgotPasswordHelpOpen] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);

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

    const result = await login(parsed.data.username, parsed.data.password, parsed.data.rememberMe);
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
    <main className="flex min-h-[100dvh] bg-white">
      {/* ponytail: radius is in bounding-box units (~12px at 1240x925), so it stretches slightly on unusual aspect ratios. Switch to a ResizeObserver-built path() if that shows. */}
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <clipPath id="login-art-clip" clipPathUnits="objectBoundingBox">
          <path d="M0.01,0 L0.99,0 Q1,0 0.999,0.013 L0.926,0.987 Q0.925,1 0.915,1 L0.01,1 Q0,1 0,0.987 L0,0.013 Q0,0 0.01,0 Z" />
        </clipPath>
      </svg>
      <section
        className="grid w-full bg-white p-1.5 lg:grid-cols-[2fr_1fr]"
        aria-labelledby="login-title"
      >
        <div className="relative hidden overflow-hidden rounded-lg bg-brand-green-dark lg:block lg:[clip-path:url(#login-art-clip)]">
          <img
            src="/loginpage_bg.jpg"
            alt="Mendez Christian Academy campus"
            width={1392}
            height={768}
            {...highPriorityImageProps}
            className="absolute inset-0 h-full w-full scale-105 object-cover object-[50%_40%] blur-[3px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-green-dark/75 via-brand-green-dark/30 to-brand-green-dark/45"
          />
          <div className="relative z-10 flex h-full flex-col p-8 text-white lg:p-10">
            <div className="animate-login-brand-in flex w-fit items-center gap-6 text-left [text-shadow:0_1px_8px_rgb(0_0_0/0.35)]">
              <img
                src="/mendez-christian-academy-seal.png"
                alt="Mendez Christian Academy seal"
                className="h-24 w-24 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="text-[48px] font-semibold leading-none tracking-[-0.025em]">{en.app.name}</p>
                <p className="ml-[2px] mt-1 text-base leading-6 text-white/85">{en.app.tagline}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[590px] flex-col px-7 py-8 sm:px-12 lg:px-14 lg:py-10">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-[400px]">
              <div className="mb-12 text-center">
                <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
                <img
                  src="/mendez-christian-academy-seal.png"
                  alt="Mendez Christian Academy seal"
                  className="h-[72px] w-[72px] shrink-0 object-contain"
                />
                <div>
                  <p className="text-[32px] font-semibold leading-tight tracking-tight text-brand-green-dark">{en.app.name}</p>
                  <p className="mt-1 text-[13px] leading-5 text-text-secondary">{en.app.tagline}</p>
                </div>
              </div>
                <h1 id="login-title" className="text-[42px] font-semibold leading-none tracking-[-0.035em] text-text-primary">{en.login.title}</h1>
              </div>

              <form className="space-y-7" onSubmit={handleSubmit(submit)} noValidate>
                <div>
                  <label htmlFor="username" className="mb-3 block text-sm font-medium text-text-primary">{en.login.username}</label>
                  <div className="group relative">
                    <UserRound
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary transition-[color,transform] duration-150 motion-reduce:transition-none group-focus-within:scale-110 group-focus-within:text-brand-green-dark"
                    />
                    <input
                      id="username"
                      autoComplete="username"
                      aria-invalid={Boolean(errors.username)}
                      aria-describedby={errors.username ? "username-error" : undefined}
                      className="h-11 w-full rounded-md border border-border bg-white px-10 text-base transition-[border-color,box-shadow] duration-150 hover:border-brand-green focus-visible:border-brand-green-dark focus-visible:shadow-[0_0_0_3px_rgb(3_153_53_/_0.12)] motion-reduce:transition-none disabled:cursor-not-allowed"
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
                  <label htmlFor="password" className="mb-3 block text-sm font-medium text-text-primary">{en.login.password}</label>
                  <div className="group relative">
                    <LockKeyhole
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary transition-[color,transform] duration-150 motion-reduce:transition-none group-focus-within:scale-110 group-focus-within:text-brand-green-dark"
                    />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? "password-error" : undefined}
                      className="h-11 w-full rounded-md border border-border bg-white px-10 pr-12 text-base transition-[border-color,box-shadow] duration-150 hover:border-brand-green focus-visible:border-brand-green-dark focus-visible:shadow-[0_0_0_3px_rgb(3_153_53_/_0.12)] motion-reduce:transition-none disabled:cursor-not-allowed"
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
                      {showPassword ? <EyeOff className="animate-login-icon-swap h-4 w-4" aria-hidden="true" /> : <Eye className="animate-login-icon-swap h-4 w-4" aria-hidden="true" />}
                    </Button>
                  </div>
                  <div className="mt-4 flex min-h-11 items-center justify-between gap-4">
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text-primary">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-border text-brand-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark disabled:cursor-not-allowed"
                        disabled={disabled}
                        {...register("rememberMe")}
                      />
                      {en.login.rememberMe}
                    </label>
                    <div className="text-right">
                      <Button
                        variant="ghost"
                        type="button"
                        className="px-1 text-sm text-brand-green-dark hover:text-brand-green"
                        aria-expanded={isForgotPasswordHelpOpen}
                        aria-controls="forgot-password-help"
                        onClick={() => setIsForgotPasswordHelpOpen((current) => !current)}
                      >
                        {en.login.forgotPassword}
                      </Button>
                    </div>
                  </div>
                  {isForgotPasswordHelpOpen && (
                    <p id="forgot-password-help" role="status" className="mt-2 text-left text-sm text-text-secondary">
                      {en.login.forgotPasswordHelp}
                    </p>
                  )}
                  {errors.password?.message && (
                    <p id="password-error" role="alert" className="mt-2 text-sm text-status-error">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                {authError && <p role="alert" className="rounded-md border border-[#F3C2C2] bg-[#FBEAEA] p-3 text-sm text-status-error">{authError}</p>}
                <Button type="submit" className="w-full transition-transform active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100" disabled={disabled}>{en.login.submit}</Button>
              </form>

            </div>
          </div>
          <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <span
                role="img"
                aria-label={en.login.edukadosLogoPlaceholder}
                className="flex h-5 w-5 items-center justify-center rounded-sm bg-brand-green-dark text-[11px] font-bold leading-none text-white"
              >
                E
              </span>
              <span>{en.login.poweredBy}</span>
              <span className="font-semibold text-text-primary">{en.login.edukados}</span>
            </div>
            <span aria-hidden="true" className="hidden h-4 w-px bg-border sm:block" />
            <Button
              variant="ghost"
              size="sm"
              className="min-h-control px-1 text-xs font-semibold underline decoration-brand-green-dark/40 underline-offset-2 hover:text-brand-green"
              aria-haspopup="dialog"
              aria-expanded={isPrivacyPolicyOpen}
              onClick={() => setIsPrivacyPolicyOpen(true)}
            >
              {en.login.privacyPolicy}
            </Button>
          </footer>
          <Dialog.Root open={isPrivacyPolicyOpen} onOpenChange={setIsPrivacyPolicyOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-text-primary/40" />
              <Dialog.Content
                aria-describedby="privacy-policy-description"
                className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-6 shadow-raised"
              >
                <Dialog.Title className="text-lg font-semibold text-text-primary">{en.login.privacyPolicy}</Dialog.Title>
                <Dialog.Description id="privacy-policy-description" className="mt-2 text-sm leading-6 text-text-secondary">
                  {en.login.privacyPolicyNotice}
                </Dialog.Description>
                <p className="mt-4 text-sm leading-6 text-text-secondary">{en.login.privacyPolicyContact}</p>
                <div className="mt-6 flex justify-end">
                  <Dialog.Close asChild>
                    <Button variant="secondary">{en.login.closePrivacyPolicy}</Button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </section>
    </main>
  );
}
