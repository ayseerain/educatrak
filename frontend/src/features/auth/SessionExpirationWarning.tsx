import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { en } from "@/i18n/en";

function formatRemaining(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    const template =
      minutes === 1 ? en.session.minuteRemaining : en.session.minutesRemaining;
    return template.replace("{minutes}", String(minutes));
  }

  const template =
    seconds === 1 ? en.session.secondRemaining : en.session.secondsRemaining;
  return template.replace("{seconds}", String(seconds));
}

export function SessionExpirationWarning() {
  const {
    expiresAt,
    isExpirationWarningOpen,
    logout,
    renewSession,
    user,
  } = useSession();
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!isExpirationWarningOpen || !expiresAt) return;
    const currentExpiresAt = expiresAt;

    function updateRemaining() {
      setRemainingMs(Math.max(0, currentExpiresAt - Date.now()));
    }

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, isExpirationWarningOpen]);

  if (!user) return null;

  return (
    <Dialog.Root open={isExpirationWarningOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-text-primary/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)] focus:outline-none"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="flex gap-4">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-status-warning bg-surface text-status-warning"
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                {en.session.title}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-text-secondary">
                {en.session.description.replace(
                  "{time}",
                  formatRemaining(remainingMs),
                )}
              </Dialog.Description>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={logout}>
              {en.session.signOutNow}
            </Button>
            <Button type="button" onClick={renewSession}>
              {en.session.staySignedIn}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
