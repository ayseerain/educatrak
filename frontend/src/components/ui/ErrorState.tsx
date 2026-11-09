import { OctagonAlert, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { en } from "@/i18n/en";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/** Failed-to-load message with an optional retry (CLINIQ style). Plain language only. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-md border border-status-error bg-white px-4 py-6 text-center"
    >
      <OctagonAlert aria-hidden="true" className="h-5 w-5 text-status-error" />
      <p className="text-sm font-semibold text-text-primary">{message}</p>
      {onRetry && (
        <Button variant="primary" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          {en.states.retry}
        </Button>
      )}
    </div>
  );
}
