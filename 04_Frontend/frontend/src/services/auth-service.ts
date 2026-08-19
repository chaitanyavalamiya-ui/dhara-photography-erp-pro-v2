import { apiClient, ApiResponse } from './api-client';
import { AuthUser } from '@/stores/auth-store';

export interface LoginRequest {
  companyCode: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
    return data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async getProfile(): Promise<AuthUser> {
    const { data } = await apiClient.get<ApiResponse<AuthUser>>('/auth/me');
    return data.data;
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
      '/auth/change-password',
      payload,
    );
    return data.data;
  },
};

export const healthService = {
  async check(): Promise<HealthResponse> {
    const { data } = await apiClient.get<ApiResponse<HealthResponse>>('/health');
    return data.data;
  },
};
