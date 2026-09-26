/**
 * All date/time display goes through this module so formatting stays
 * consistent and pinned to Asia/Manila, regardless of the host machine's
 * local timezone.
 */
const TIME_ZONE = "Asia/Manila";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** e.g. "Sep 21, 2026" */
export function formatDate(value: Date | string): string {
  return DATE_FORMATTER.format(new Date(value));
}

/** e.g. "Sep 21, 2026, 3:45 PM" */
export function formatDateTime(value: Date | string): string {
  return DATE_TIME_FORMATTER.format(new Date(value));
}

/** e.g. "3:45 PM" */
export function formatTime(value: Date | string): string {
  return TIME_FORMATTER.format(new Date(value));
}

export function nowInManila(): Date {
  return new Date();
}
