import { apiClient, ApiResponse } from './api-client';

export interface RoleSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  hierarchyRank: number;
  isSystem: boolean;
  permissionCount: number;
  isEditable: boolean;
}

export interface PermissionItem {
  id: string;
  code: string;
  module: string;
  action: string;
  group: string;
  label: string;
  isGranted: boolean;
}

export interface PermissionGroup {
  group: string;
  permissions: PermissionItem[];
}

export interface RoleDetail extends RoleSummary {
  permissionGroups: PermissionGroup[];
  grantedPermissionCodes: string[];
}

export const rolesService = {
  async list(): Promise<RoleSummary[]> {
    const { data } = await apiClient.get<ApiResponse<RoleSummary[]>>('/roles');
    return data.data;
  },

  async getById(id: string): Promise<RoleDetail> {
    const { data } = await apiClient.get<ApiResponse<RoleDetail>>(`/roles/${id}`);
    return data.data;
  },

  async updatePermissions(id: string, permissionCodes: string[]): Promise<RoleDetail> {
    const { data } = await apiClient.patch<ApiResponse<RoleDetail>>(`/roles/${id}/permissions`, {
      permissionCodes,
    });
    return data.data;
  },
};
