import { Fragment, useEffect, useState, type ReactNode } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { isLiveCashierApiEnabled } from "@/api/cashierApi";
import { mockApiDelay, subscribeToMockState } from "@/api/mock";

type MockLoadState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

/**
 * Gives every development route one asynchronous entry point to the central
 * mock database. This keeps the development experience honest: URL-controlled
 * latency and failures apply before any screen reads its derived mock records.
 */
export function MockDatabaseProvider({ children }: { children: ReactNode }) {
  const enabled = !isLiveCashierApiEnabled();
  const [attempt, setAttempt] = useState(0);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<MockLoadState>({ status: "loading" });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setState({ status: "loading" });
    void mockApiDelay()
      .then(() => {
        if (active) setState({ status: "ready" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "The development mock database could not be loaded.",
        });
      });

    return () => {
      active = false;
    };
  }, [attempt, enabled]);

  useEffect(() => enabled ? subscribeToMockState(() => setRevision((value) => value + 1)) : undefined, [enabled]);

  if (!enabled) return <>{children}</>;
  if (state.status === "ready") {
    const emptyRequested = typeof window !== "undefined"
      && new URLSearchParams(window.location.search).get("mock") === "empty";
    return emptyRequested
      ? <main className="mx-auto flex min-h-screen max-w-3xl items-center p-6"><EmptyState message="No development data is available for this preview." /></main>
      : <Fragment key={revision}>{children}</Fragment>;
  }
  if (state.status === "error") {
    return <ErrorState message={state.message} onRetry={() => setAttempt((value) => value + 1)} />;
  }
  return <LoadingState message="Loading development data…" layout="page" />;
}
