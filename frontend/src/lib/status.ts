import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  type LucideIcon,
} from "lucide-react";

export type StatusTone = "success" | "warning" | "error" | "neutral";

export interface StatusPresentation {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
}

export const STATUS_TONE_STYLES: Record<
  StatusTone,
  { badge: string; text: string; soft: string; bar: string; borderLeft: string; surface: string }
> = {
  success: {
    badge: "bg-status-success/10 text-text-primary",
    text: "text-status-success",
    soft: "bg-status-success/15",
    bar: "bg-status-success",
    borderLeft: "border-l-status-success",
    surface: "bg-status-success/5",
  },
  warning: {
    badge: "bg-status-warning/10 text-text-primary",
    text: "text-status-warning",
    soft: "bg-status-warning/15",
    bar: "bg-status-warning",
    borderLeft: "border-l-status-warning",
    surface: "bg-status-warning/5",
  },
  error: {
    badge: "bg-status-error/10 text-text-primary",
    text: "text-status-error",
    soft: "bg-status-error/15",
    bar: "bg-status-error",
    borderLeft: "border-l-status-error",
    surface: "bg-status-error/5",
  },
  neutral: {
    badge: "bg-surface text-text-secondary",
    text: "text-text-secondary",
    soft: "bg-surface",
    bar: "bg-text-muted-readable",
    borderLeft: "border-l-border",
    surface: "bg-surface",
  },
};

const SUCCESS_STATUSES = new Set([
  "active",
  "cleared",
  "current",
  "paid",
  "posted",
  "ready to import",
  "available",
  "complete",
  "completed",
  "recorded",
  "sent",
  "succeeded",
  "valid",
]);

const WARNING_STATUSES = new Set([
  "due soon",
  "pending review",
  "awaiting sign-off",
  "pending accounting review",
  "pending decision",
  "queued",
  "review required",
  "unsigned",
  "void pending",
  "warning",
]);

const ERROR_STATUSES = new Set([
  "error",
  "denied",
  "failed",
  "not cleared",
  "overdue",
]);

const NEUTRAL_STATUSES = new Set([
  "inactive",
  "read-only",
  "unavailable",
  "view only",
  "voided",
]);

export function getStatusPresentation(status: string): StatusPresentation | null {
  const label = status.trim();
  const normalized = normalizeStatus(label);
  const formattedLabel = formatStatusLabel(label);

  if (SUCCESS_STATUSES.has(normalized)) {
    return { label: formattedLabel, tone: "success", icon: CheckCircle2 };
  }

  if (WARNING_STATUSES.has(normalized)) {
    return { label: formattedLabel, tone: "warning", icon: Clock3 };
  }

  if (ERROR_STATUSES.has(normalized)) {
    return { label: formattedLabel, tone: "error", icon: AlertTriangle };
  }

  if (NEUTRAL_STATUSES.has(normalized)) {
    return { label: formattedLabel, tone: "neutral", icon: CircleDashed };
  }

  return null;
}

export function normalizeStatus(status: string) {
  return status.trim().toLowerCase().replace(/_/g, " ");
}

export function formatStatusLabel(status: string): string {
  const normalized = normalizeStatus(status);
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "";
}
