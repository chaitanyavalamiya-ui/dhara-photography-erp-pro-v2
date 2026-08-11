import { apiClient, ApiResponse } from './api-client';

export type MasterDataCategory = 'expense_category' | 'payment_mode';

export interface MasterDataItem {
  id: string;
  category: MasterDataCategory;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
}

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

export interface CreateMasterDataPayload {
  category: MasterDataCategory;
  code: string;
  label: string;
  sortOrder?: number;
}

export interface UpdateMasterDataPayload {
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CompanyProfile {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface PackageItem {
  serviceRateId: string;
  serviceName: string;
  unit: string;
  quantity: number;
  days: number;
}

export interface StudioPackage {
  id: string;
  code: string;
  label: string;
  description: string | null;
  defaultPrice: number;
  offerPrice: number | null;
  sortOrder: number;
  isActive: boolean;
  items: PackageItem[];
  updatedAt: string;
}

export interface CreatePackagePayload {
  code: string;
  label: string;
  description?: string;
  defaultPrice: number;
  offerPrice?: number;
  sortOrder?: number;
  items: Array<{ serviceRateId: string; quantity?: number; days?: number }>;
}

export interface UpdatePackagePayload {
  label?: string;
  description?: string;
  defaultPrice?: number;
  offerPrice?: number;
  sortOrder?: number;
  isActive?: boolean;
  items?: Array<{ serviceRateId: string; quantity?: number; days?: number }>;
}

export const settingsService = {
  async getCompanyProfile(): Promise<CompanyProfile> {
    const { data } = await apiClient.get<ApiResponse<CompanyProfile>>('/settings/company');
    return data.data;
  },

  async updateCompanyProfile(payload: { name: string }): Promise<CompanyProfile> {
    const { data } = await apiClient.patch<ApiResponse<CompanyProfile>>(
      '/settings/company',
      payload,
    );
    return data.data;
  },

  async getPackages(includeInactive = false): Promise<StudioPackage[]> {
    const { data } = await apiClient.get<ApiResponse<StudioPackage[]>>('/settings/packages', {
      params: { includeInactive },
    });
    return data.data;
  },

  async createPackage(payload: CreatePackagePayload): Promise<StudioPackage> {
    const { data } = await apiClient.post<ApiResponse<StudioPackage>>('/settings/packages', payload);
    return data.data;
  },

  async updatePackage(id: string, payload: UpdatePackagePayload): Promise<StudioPackage> {
    const { data } = await apiClient.patch<ApiResponse<StudioPackage>>(
      `/settings/packages/${id}`,
      payload,
    );
    return data.data;
  },

  async getMasterData(
    category: MasterDataCategory,
    includeInactive = false,
  ): Promise<MasterDataItem[]> {
    const { data } = await apiClient.get<ApiResponse<MasterDataItem[]>>('/settings/master-data', {
      params: { category, includeInactive },
    });
    return data.data;
  },

  async createMasterData(payload: CreateMasterDataPayload): Promise<MasterDataItem> {
    const { data } = await apiClient.post<ApiResponse<MasterDataItem>>(
      '/settings/master-data',
      payload,
    );
    return data.data;
  },

  async updateMasterData(id: string, payload: UpdateMasterDataPayload): Promise<MasterDataItem> {
    const { data } = await apiClient.patch<ApiResponse<MasterDataItem>>(
      `/settings/master-data/${id}`,
      payload,
    );
    return data.data;
  },

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
