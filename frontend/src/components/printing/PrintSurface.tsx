import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders a print-only document as a direct child of <body>, outside the fixed,
 * scrolling app shell, so browsers paginate it normally. Hidden on screen.
 */
export function PrintSurface({ className, children }: { className?: string; children: ReactNode }) {
  return createPortal(<section aria-hidden="true" className={className ? `print-root ${className}` : "print-root"}>{children}</section>, document.body);
}
