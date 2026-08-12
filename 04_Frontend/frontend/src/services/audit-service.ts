import { apiClient, ApiResponse } from './api-client';

export interface AuditLogEntry {
  id: string;
  module: string;
  action: string;
  recordType: string;
  recordId: string;
  actorUserId: string | null;
  actorName: string | null;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const auditService = {
  async list(params: Record<string, unknown> = {}): Promise<PaginatedAuditLogs> {
    const { data } = await apiClient.get<ApiResponse<PaginatedAuditLogs>>('/audit/logs', {
      params,
    });
    return data.data;
  },
};
