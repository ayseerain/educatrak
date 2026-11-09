import { request } from "@/api/cashierApi";

export interface BackupRecord {
  id: string;
  result: string;
  sizeBytes: number | null;
  error: string | null;
  completedAt: string;
}

export async function listBackupRecords(): Promise<BackupRecord[]> {
  const response = await request<{ data: BackupRecord[] }>("/backups");
  return response.data;
}
