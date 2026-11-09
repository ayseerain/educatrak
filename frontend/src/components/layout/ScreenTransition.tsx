import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { FormSkeleton, HeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

/** Long enough to read as a deliberate load, short enough not to slow the cashier down. */
const SKELETON_MS = 250;

type ScreenShape = "dashboard" | "detail" | "form" | "table";

/** Location state set by `ViewTabs` links: switching a view tab fades only, without the skeleton. */
export interface ViewTabState {
  viewTab?: boolean;
}

function shapeFor(pathname: string): ScreenShape {
  if (pathname === "/") return "dashboard";
  if (/\/(new|edit|print)$|^\/(settings|profile|import|admin\/backup|admin\/roles)/.test(pathname)) return "form";
  if (/^\/(students|accounts|payments|reports\/student)\/[^/]+$/.test(pathname)) return "detail";
  return "table";
}

function ScreenSkeleton({ shape }: { shape: ScreenShape }) {
  return (
    <div aria-hidden="true" className="space-y-4">
      {shape !== "dashboard" && <HeaderSkeleton />}
      {(shape === "dashboard" || shape === "detail") && <StatCardsSkeleton />}
      {shape === "form" ? <FormSkeleton /> : <TableSkeleton columns={shape === "dashboard" ? 3 : 5} rows={shape === "table" ? 8 : 4} />}
    </div>
  );
}

/**
 * Every screen switch (route or previewed role) shows a skeleton shaped like the screen, then fades
 * the screen in, instead of swapping abruptly or flashing a one-frame loading state. The new screen
 * mounts underneath straight away, so its own data loads while the skeleton shows.
 */
export function ScreenTransition({ screenKey, children }: { screenKey: string; children: ReactNode }) {
  const location = useLocation();
  const viewTab = (location.state as ViewTabState | null)?.viewTab === true;
  const [shownKey, setShownKey] = useState<string | null>(null);
  const loading = shownKey !== screenKey && !viewTab;
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shownKey === screenKey || viewTab) return;
    const timer = window.setTimeout(() => setShownKey(screenKey), SKELETON_MS);
    return () => window.clearTimeout(timer);
  }, [screenKey, shownKey, viewTab]);

  // A view tab switch skips the skeleton; settle the key before paint so nothing flashes.
  useLayoutEffect(() => {
    if (viewTab && shownKey !== screenKey) setShownKey(screenKey);
  }, [screenKey, shownKey, viewTab]);

  useLayoutEffect(() => {
    if (shownKey === null || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    contentRef.current?.animate?.(
      [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }],
      { duration: 200, easing: "ease-out" },
    );
  }, [shownKey]);

  return (
    <div className="relative" aria-busy={loading}>
      {loading && (
        <div className="absolute inset-x-0 top-0 z-10 bg-surface">
          <p role="status" className="sr-only">Loading screen…</p>
          <ScreenSkeleton shape={shapeFor(location.pathname)} />
        </div>
      )}
      <div ref={contentRef} className={loading ? "pointer-events-none opacity-0" : undefined}>
        {children}
      </div>
    </div>
  );
}
