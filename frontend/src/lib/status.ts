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
    badge: "bg-white text-status-success",
    text: "text-status-success",
    soft: "bg-[#E0F2E4]",
    bar: "bg-status-success",
    borderLeft: "border-l-status-success",
    surface: "bg-[#F4FAF5]",
  },
  warning: {
    badge: "bg-white text-status-warning",
    text: "text-status-warning",
    soft: "bg-[#FBEEDC]",
    bar: "bg-status-warning",
    borderLeft: "border-l-status-warning",
    surface: "bg-[#FFF9F0]",
  },
  error: {
    badge: "bg-white text-status-error",
    text: "text-status-error",
    soft: "bg-[#FDE7E7]",
    bar: "bg-status-error",
    borderLeft: "border-l-status-error",
    surface: "bg-[#FFF4F4]",
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
  "posted",
  "ready to import",
  "sent",
  "succeeded",
  "valid",
]);

const WARNING_STATUSES = new Set([
  "due soon",
  "pending review",
  "queued",
  "unsigned",
  "void pending",
  "warning",
]);

const ERROR_STATUSES = new Set([
  "error",
  "failed",
  "not cleared",
  "overdue",
]);

const NEUTRAL_STATUSES = new Set([
  "inactive",
  "unavailable",
  "voided",
]);

export function getStatusPresentation(status: string): StatusPresentation | null {
  const label = status.trim();
  const normalized = normalizeStatus(label);

  if (SUCCESS_STATUSES.has(normalized)) {
    return { label, tone: "success", icon: CheckCircle2 };
  }

  if (WARNING_STATUSES.has(normalized)) {
    return { label, tone: "warning", icon: Clock3 };
  }

  if (ERROR_STATUSES.has(normalized)) {
    return { label, tone: "error", icon: AlertTriangle };
  }

  if (NEUTRAL_STATUSES.has(normalized)) {
    return { label, tone: "neutral", icon: CircleDashed };
  }

  return null;
}

export function normalizeStatus(status: string) {
  return status.trim().toLowerCase().replace(/_/g, " ");
}
