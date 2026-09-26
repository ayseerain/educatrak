interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center rounded-md border border-dashed border-border bg-white p-8 text-center text-sm text-text-muted-readable">
      {message}
    </div>
  );
}
