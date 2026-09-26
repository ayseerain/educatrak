import { Button } from "./Button";
import { en } from "@/i18n/en";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-md border border-border bg-white p-6"
    >
      <p className="flex items-center gap-2 text-sm text-status-error">
        <span aria-hidden="true">×</span>
        <span>{message}</span>
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {en.states.retry}
        </Button>
      )}
    </div>
  );
}
