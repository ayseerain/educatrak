import { request } from "@/api/cashierApi";

/** School, receipt and email settings (API contract rows 69–70). Unset keys are null. */
export interface SystemSettings {
  schoolName: string | null;
  schoolAddress: string | null;
  receiptTitle: "Official Receipt" | "Acknowledgment Receipt" | null;
  paperSize: "Letter" | "A4" | null;
  emailSenderName: string | null;
  emailSenderAddress: string | null;
  emailDailySendLimit: number | null;
  nextReceiptSequence: number | null;
  nextReceiptNumber: string | null;
}

/** Writable fields in request (snake_case) form. The next receipt number is read-only. */
export interface SystemSettingsPatch {
  school_name?: string | null;
  school_address?: string | null;
  receipt_title?: "Official Receipt" | "Acknowledgment Receipt";
  paper_size?: "Letter" | "A4";
  email_sender_name?: string | null;
  email_sender_address?: string | null;
  email_daily_send_limit?: number;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  return (await request<{ data: SystemSettings }>("/settings/system")).data;
}

export async function updateSystemSettings(patch: SystemSettingsPatch): Promise<SystemSettings> {
  return (await request<{ data: SystemSettings }>("/settings/system", { method: "PATCH", body: JSON.stringify(patch) })).data;
}
