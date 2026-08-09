import { apiClient, ApiResponse } from './api-client';

export interface SettingsServiceRate {
  id: string;
  code: string;
  name: string;
  category: string;
  defaultRate: number;
  unit: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
}

export interface UpdateServiceRatePayload {
  defaultRate: number;
  isActive?: boolean;
}

export const settingsService = {
  async getServiceRates(): Promise<SettingsServiceRate[]> {
    const { data } = await apiClient.get<ApiResponse<SettingsServiceRate[]>>(
      '/settings/service-rates',
    );
    return data.data;
  },

  async updateServiceRate(
    id: string,
    payload: UpdateServiceRatePayload,
  ): Promise<SettingsServiceRate> {
    const { data } = await apiClient.patch<ApiResponse<SettingsServiceRate>>(
      `/settings/service-rates/${id}`,
      payload,
    );
    return data.data;
  },
};
