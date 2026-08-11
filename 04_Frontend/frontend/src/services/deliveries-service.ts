import { apiClient, ApiResponse } from './api-client';

export type DeliverableType =
  | 'album'
  | 'mini_album'
  | 'calendar'
  | 'pendrive'
  | 'hard_disk'
  | 'soft_copy'
  | 'video'
  | 'reels'
  | 'other';

export type DeliveryStatus = 'pending' | 'ready' | 'delivered';

export interface DeliveryItem {
  id: string;
  clientId: string;
  clientName: string;
  bookingId: string;
  bookingNumber: string;
  albumId: string | null;
  albumName: string | null;
  deliverableType: DeliverableType;
  deliverableTypeLabel: string;
  title: string;
  status: DeliveryStatus;
  statusLabel: string;
  expectedDate: string | null;
  deliveredDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedDeliveries {
  items: DeliveryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateDeliveryPayload {
  bookingId: string;
  albumId?: string;
  deliverableType: DeliverableType;
  title?: string;
  status?: DeliveryStatus;
  expectedDate?: string;
  deliveredDate?: string;
  notes?: string;
}

export interface UpdateDeliveryPayload {
  albumId?: string | null;
  deliverableType?: DeliverableType;
  title?: string;
  status?: DeliveryStatus;
  expectedDate?: string | null;
  deliveredDate?: string | null;
  notes?: string;
}

export const DELIVERABLE_TYPE_OPTIONS = [
  { value: 'album', label: 'Album' },
  { value: 'mini_album', label: 'Mini Album' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'pendrive', label: 'Pendrive' },
  { value: 'hard_disk', label: 'Hard Disk' },
  { value: 'soft_copy', label: 'Soft Copy / All Photos' },
  { value: 'video', label: 'Video' },
  { value: 'reels', label: 'Reels' },
  { value: 'other', label: 'Other' },
] as const;

export const DELIVERY_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
] as const;

export const deliveriesService = {
  async list(params: Record<string, unknown> = {}): Promise<PaginatedDeliveries> {
    const { data } = await apiClient.get<ApiResponse<PaginatedDeliveries>>('/deliveries', {
      params,
    });
    return data.data;
  },

  async getById(id: string): Promise<DeliveryItem> {
    const { data } = await apiClient.get<ApiResponse<DeliveryItem>>(`/deliveries/${id}`);
    return data.data;
  },

  async create(payload: CreateDeliveryPayload): Promise<DeliveryItem> {
    const { data } = await apiClient.post<ApiResponse<DeliveryItem>>('/deliveries', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateDeliveryPayload): Promise<DeliveryItem> {
    const { data } = await apiClient.patch<ApiResponse<DeliveryItem>>(`/deliveries/${id}`, payload);
    return data.data;
  },

  async archive(id: string): Promise<void> {
    await apiClient.delete(`/deliveries/${id}`);
  },
};
