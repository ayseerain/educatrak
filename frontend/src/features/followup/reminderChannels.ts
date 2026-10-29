export type ReminderChannel = "email" | "sms";

/** One dropdown instead of two checkboxes, so a reminder always has at least one channel. */
export const REMINDER_CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "email,sms", label: "Email and SMS" },
];

export function channelsValue(channels: readonly ReminderChannel[]): string {
  return (["email", "sms"] as const).filter((channel) => channels.includes(channel)).join(",");
}

export function channelsFromValue(value: string): ReminderChannel[] {
  return value.split(",") as ReminderChannel[];
}

/** Clicking anywhere on a selectable row toggles it, except on the row's own controls and links. */
export function isRowControlClick(target: EventTarget): boolean {
  return target instanceof Element && target.closest("input, a, button, label, select") !== null;
}
