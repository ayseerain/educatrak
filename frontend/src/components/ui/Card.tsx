import * as React from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The shared panel surface (CLINIQ style): white, rounded-md, soft shadow, no outline.
 * Print and forced-colors modes get a real border back, since shadows survive neither.
 * Use this class for any custom container (skeletons included) so every panel matches.
 */
export const CARD_SURFACE =
  "rounded-md bg-white shadow-card forced-colors:border print:border print:border-border print:shadow-none";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(CARD_SURFACE, "p-4", className)} {...props} />;
}

export function CardLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm font-medium text-text-secondary", className)}
      {...props}
    />
  );
}

export function CardValue({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "mt-1 text-xl font-semibold text-text-primary",
        className,
      )}
      {...props}
    />
  );
}

export function CardHelperText({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-1 text-sm text-text-muted-readable", className)}
      {...props}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  titleId?: string;
  /** Rendered as an h2 by default; pass 3 to fit the page outline. */
  headingLevel?: 2 | 3;
  description?: ReactNode;
  /** Leading icon element, shown before the title in brand-green-dark. */
  icon?: ReactNode;
  /** Right-aligned controls (links, filters, counts). */
  actions?: ReactNode;
  className?: string;
}

/** CLINIQ card header: icon + 16px semibold title + optional 12px description, actions on the right. */
export function CardHeader({ title, titleId, headingLevel = 2, description, icon, actions, className }: CardHeaderProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pb-3 pt-5", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {icon && <span className="shrink-0 text-brand-green-dark [&>svg]:h-5 [&>svg]:w-5">{icon}</span>}
        <div className="min-w-0">
          <Heading id={titleId} className="text-base font-semibold text-text-primary">{title}</Heading>
          {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
        </div>
      </div>
      {actions && <div className="no-print flex max-w-full shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}
