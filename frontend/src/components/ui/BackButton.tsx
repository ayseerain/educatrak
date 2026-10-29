import { ChevronLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";

interface BackButtonProps {
  /** Where to go when this screen was opened directly (no in-app history). */
  fallback?: string;
  /** Always go to this screen instead of history back; the label may then name it. */
  to?: string;
  label?: string;
  className?: string;
}

/**
 * The one Back control (CLINIQ back-navigation pattern): a quiet text link with a chevron that sits
 * top-left of the page content, above the header card. It never competes with the page's primary
 * action and never prints. History back when there is in-app history, otherwise `fallback`.
 */
export function BackButton({ fallback, to, label = "Back", className }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const classes = cn(
    "group no-print -mb-2 inline-flex min-h-control cursor-pointer items-center self-start rounded-md pr-2 text-sm font-semibold text-text-secondary transition-colors hover:text-brand-green-dark motion-reduce:transition-none",
    className,
  );
  const content = (
    <span className="inline-flex items-center gap-1 border-b border-transparent group-hover:border-current">
      <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      {label}
    </span>
  );

  if (to) {
    return <Link to={to} className={classes}>{content}</Link>;
  }

  function goBack() {
    if (location.key !== "default") {
      navigate(-1);
      return;
    }
    navigate(fallback ?? "/");
  }

  return <button type="button" className={classes} onClick={goBack}>{content}</button>;
}
