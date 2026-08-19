import { apiClient, ApiResponse } from './api-client';

export const EQUIPMENT_CONDITIONS = ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'] as const;
export const EQUIPMENT_TRACKING_TYPES = ['bulk', 'serialized'] as const;

export interface EquipmentCategory {
  id: string;
  category: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
}

export interface EquipmentItem {
  id: string;
  code: string;
  name: string;
  category: string;
  trackingType: 'bulk' | 'serialized' | string;
  serialNumber?: string | null;
  totalQuantity: number;
  availableQuantity: number;
  onShootQuantity: number;
  missingQuantity: number;
  underRepairQuantity: number;
  status: string;
  condition: string;
  notes?: string | null;
  specifications?: Record<string, string | number> | null;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentHistoryRow {
  id: string;
  action: string;
  quantity: number;
  conditionOut?: string | null;
  conditionIn?: string | null;
  bookingNumber?: string | null;
  staffName?: string | null;
  notes?: string | null;
  occurredAt: string;
}

export interface EquipmentDetail extends EquipmentItem {
  history: EquipmentHistoryRow[];
}

export interface EquipmentIssueItem {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentCode: string;
  category: string;
  serialNumber?: string | null;
  quantityIssued: number;
  quantityReturned: number;
  missingQuantity: number;
  damagedQuantity: number;
  conditionOut: string;
  conditionIn?: string | null;
  returnStatus: string;
  notes?: string | null;
}

export interface EquipmentIssueSummary {
  totalIssued: number;
  totalReturned: number;
  totalMissing: number;
  totalDamaged: number;
}

export interface EquipmentIssue {
  id: string;
  issueNumber: string;
  bookingId: string;
  bookingNumber: string;
  clientName: string;
  eventType?: string | null;
  eventDate?: string | null;
  staffId: string;
  staffName: string;
  issuedAt: string;
  status: string;
  notes?: string | null;
  items: EquipmentIssueItem[];
  summary: EquipmentIssueSummary;
}

export interface EquipmentDashboard {
  onShoot: number;
  withStaff: number;
  missing: number;
  damaged: number;
  underRepair: number;
  available: number;
}

export interface BookingEquipmentOverview {
  used: Array<{ category: string; name: string; quantity: number }>;
  summary: EquipmentIssueSummary;
  issues: EquipmentIssue[];
}

export interface StaffEquipmentSummary {
  staffId: string;
  staffName: string;
  totalIssues: number;
  currentlyHolding: number;
  returned: number;
  missing: number;
  damaged: number;
  issues: EquipmentIssue[];
}

export interface CreateEquipmentPayload {
  code: string;
  name: string;
  category: string;
  trackingType?: string;
  serialNumber?: string;
  totalQuantity?: number;
  condition?: string;
  notes?: string;
  specifications?: Record<string, string | number> | null;
}

export interface UpdateEquipmentPayload {
  name?: string;
  code?: string;
  category?: string;
  serialNumber?: string;
  totalQuantity?: number;
  condition?: string;
  notes?: string;
  specifications?: Record<string, string | number> | null;
}

export interface CreateIssuePayload {
  bookingId: string;
  staffId: string;
  notes?: string;
  items: Array<{
    equipmentId: string;
    quantityIssued: number;
    conditionOut: string;
    notes?: string;
  }>;
}

export interface CreateReturnPayload {
  notes?: string;
  items: Array<{
    issueItemId: string;
    quantityReturned: number;
    quantityMissing?: number;
    conditionIn: string;
    notes?: string;
  }>;
}

export const equipmentService = {
  async list(params: Record<string, string | number | undefined> = {}) {
    const { data } = await apiClient.get<
      ApiResponse<{ items: EquipmentItem[]; total: number; page: number; limit: number; totalPages: number }>
    >('/equipment', { params });
    return data.data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get<ApiResponse<EquipmentDetail>>(`/equipment/${id}`);
    return data.data;
  },

  async create(payload: CreateEquipmentPayload) {
    const { data } = await apiClient.post<ApiResponse<EquipmentItem>>('/equipment', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateEquipmentPayload) {
    const { data } = await apiClient.patch<ApiResponse<EquipmentItem>>(`/equipment/${id}`, payload);
    return data.data;
  },

  async archive(id: string) {
    const { data } = await apiClient.delete<ApiResponse<{ message: string }>>(`/equipment/${id}`);
    return data.data;
  },

  async getDashboard() {
    const { data } = await apiClient.get<ApiResponse<EquipmentDashboard>>('/equipment/dashboard');
    return data.data;
  },

  async listIssues(params: { bookingId?: string; staffId?: string; status?: string } = {}) {
    const { data } = await apiClient.get<ApiResponse<EquipmentIssue[]>>('/equipment/issues', { params });
    return data.data;
  },

  async getIssue(issueId: string) {
    const { data } = await apiClient.get<ApiResponse<EquipmentIssue>>(`/equipment/issues/${issueId}`);
    return data.data;
  },

  async createIssue(payload: CreateIssuePayload) {
    const { data } = await apiClient.post<ApiResponse<EquipmentIssue>>('/equipment/issues', payload);
    return data.data;
  },

  async returnIssue(issueId: string, payload: CreateReturnPayload) {
    const { data } = await apiClient.post<ApiResponse<EquipmentIssue>>(
      `/equipment/issues/${issueId}/returns`,
      payload,
    );
    return data.data;
  },

  async getBookingOverview(bookingId: string) {
    const { data } = await apiClient.get<ApiResponse<BookingEquipmentOverview>>(
      `/equipment/bookings/${bookingId}`,
    );
    return data.data;
  },

  async getStaffSummary(staffId: string) {
    const { data } = await apiClient.get<ApiResponse<StaffEquipmentSummary>>(
      `/equipment/staff/${staffId}`,
    );
    return data.data;
  },

  async listCategories(includeInactive = false) {
    const { data } = await apiClient.get<ApiResponse<EquipmentCategory[]>>('/equipment/categories', {
      params: { includeInactive },
    });
    return data.data;
  },

  async createCategory(payload: { label: string; code?: string; sortOrder?: number }) {
    const { data } = await apiClient.post<ApiResponse<EquipmentCategory>>('/equipment/categories', payload);
    return data.data;
  },

  async updateCategory(
    id: string,
    payload: { label?: string; sortOrder?: number; isActive?: boolean },
  ) {
    const { data } = await apiClient.patch<ApiResponse<EquipmentCategory>>(
      `/equipment/categories/${id}`,
      payload,
    );
    return data.data;
  },
};
