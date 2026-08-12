import { apiClient, ApiResponse } from './api-client';

export interface UserRoleSummary {
  id: string;
  code: string;
  name: string;
  isPrimary: boolean;
}

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  roles: UserRoleSummary[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface RoleOption {
  id: string;
  code: string;
  name: string;
  hierarchyRank: number;
}

export interface PaginatedUsers {
  items: AppUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  roleIds: string[];
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
  roleIds?: string[];
}

export const usersService = {
  async list(params: Record<string, unknown> = {}): Promise<PaginatedUsers> {
    const { data } = await apiClient.get<ApiResponse<PaginatedUsers>>('/users', { params });
    return data.data;
  },

  async getById(id: string): Promise<AppUser> {
    const { data } = await apiClient.get<ApiResponse<AppUser>>(`/users/${id}`);
    return data.data;
  },

  async getRoles(): Promise<RoleOption[]> {
    const { data } = await apiClient.get<ApiResponse<RoleOption[]>>('/users/roles');
    return data.data;
  },

  async create(payload: CreateUserPayload): Promise<AppUser> {
    const { data } = await apiClient.post<ApiResponse<AppUser>>('/users', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateUserPayload): Promise<AppUser> {
    const { data } = await apiClient.patch<ApiResponse<AppUser>>(`/users/${id}`, payload);
    return data.data;
  },

  async archive(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};
