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

export interface BackupLocation {
  backupDir: string;
  defaultBackupDir: string;
}

export interface BackupHistoryItem {
  fileName: string;
  path: string;
  sizeBytes: number;
  modifiedAt: string;
  status: string;
}

export interface BackupRunResult {
  success: boolean;
  backupFile?: string;
  sizeBytes?: number;
  createdAt?: string;
  uploadFileCount?: number;
  databaseName?: string;
  message?: string;
  verified?: boolean;
  valid?: boolean;
  applicationName?: string;
  backupFormatVersion?: string;
  warning?: string;
  integrity?: string;
  outcome?: string;
  originalDatabaseRecovered?: boolean;
  safetySnapshotPath?: string;
}

const backupRequestConfig = { timeout: 30 * 60 * 1000 };

export const backupService = {
  async getLocation(): Promise<BackupLocation> {
    const { data } = await apiClient.get<ApiResponse<BackupLocation>>('/settings/backup/location');
    return data.data;
  },

  async setLocation(backupDir: string): Promise<BackupLocation> {
    const { data } = await apiClient.patch<ApiResponse<BackupLocation>>('/settings/backup/location', {
      backupDir,
    });
    return data.data;
  },

  async listHistory(): Promise<BackupHistoryItem[]> {
    const { data } = await apiClient.get<ApiResponse<{ items: BackupHistoryItem[] }>>(
      '/settings/backup/history',
    );
    return data.data.items;
  },

  async createBackup(): Promise<BackupRunResult> {
    const { data } = await apiClient.post<ApiResponse<BackupRunResult>>(
      '/settings/backup',
      {},
      backupRequestConfig,
    );
    return data.data;
  },

  async browseBackup(): Promise<{ path: string | null }> {
    const { data } = await apiClient.post<ApiResponse<{ path: string | null }>>(
      '/settings/backup/restore/browse',
      {},
      backupRequestConfig,
    );
    return data.data;
  },

  async previewRestore(backupFile: string): Promise<BackupRunResult> {
    const { data } = await apiClient.post<ApiResponse<BackupRunResult>>(
      '/settings/backup/restore/preview',
      { backupFile },
      backupRequestConfig,
    );
    return data.data;
  },

  async restoreBackup(backupFile: string, confirmPhrase: string): Promise<BackupRunResult> {
    const { data } = await apiClient.post<ApiResponse<BackupRunResult>>(
      '/settings/backup/restore',
      { backupFile, confirmPhrase },
      backupRequestConfig,
    );
    return data.data;
  },
};
