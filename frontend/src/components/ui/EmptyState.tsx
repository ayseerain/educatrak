import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message: string;
}

/** Calm "nothing here" message (CLINIQ style). It explains why a section is empty; it isn't an error. */
export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-md bg-white px-4 py-8 text-center">
      <Inbox aria-hidden="true" className="h-5 w-5 text-text-secondary" />
      <p className="text-sm font-semibold text-text-primary">{message}</p>
    </div>
  );
}
