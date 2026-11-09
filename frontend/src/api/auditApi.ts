import { request } from "@/api/cashierApi";

export interface AuditEntry {
  id: string;
  actor: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurredAt: string;
}

export interface AuditFilters {
  user?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  entityType?: string;
  entityId?: string;
  page?: number;
  perPage?: number;
}

export async function listAuditEntries(filters: AuditFilters = {}): Promise<{
  data: AuditEntry[];
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
}> {
  const query = new URLSearchParams();
  if (filters.user) query.set("user", filters.user);
  if (filters.action) query.set("action", filters.action);
  if (filters.dateFrom) query.set("date_from", filters.dateFrom);
  if (filters.dateTo) query.set("date_to", filters.dateTo);
  if (filters.entityType) query.set("entity_type", filters.entityType);
  if (filters.entityId) query.set("entity_id", filters.entityId);
  if (filters.page) query.set("page", String(filters.page));
  query.set("per_page", String(filters.perPage ?? 10));
  const result = await request<{
    data: AuditEntry[];
    meta: { currentPage: number; lastPage: number; total: number; perPage: number };
  }>(`/audit-log${query.size ? `?${query}` : ""}`);
  return { ...result, ...result.meta };
}
