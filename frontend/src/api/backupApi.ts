import { request } from "@/api/cashierApi";

export interface BackupRecord {
  id: string;
  trigger?: "scheduled" | "manual" | null;
  result: string;
  sizeBytes: number | null;
  checksumSha256?: string | null;
  error: string | null;
  startedAt?: string | null;
  completedAt: string;
}

/** Server-side backup executor status. `manualBackupAvailable` is a configuration check, not proof of a good backup. */
export interface BackupStatus {
  manualBackupAvailable: boolean;
  unavailableReason: string | null;
  dailyAt: string;
  timezone: string;
  rotationEnabled: boolean;
  destinationFreeBytes: number | null;
  restoreTestRecorded: boolean;
}

export async function listBackupRecords(): Promise<BackupRecord[]> {
  return (await getBackupOverview()).records;
}

export async function getBackupOverview(): Promise<{ records: BackupRecord[]; status: BackupStatus | null }> {
  const response = await request<{ data: BackupRecord[]; meta?: BackupStatus }>("/backups");
  return { records: response.data, status: response.meta ?? null };
}

export async function runManualBackup(): Promise<BackupRecord> {
  const response = await request<{ data: BackupRecord }>("/backups", { method: "POST" });
  return response.data;
}
