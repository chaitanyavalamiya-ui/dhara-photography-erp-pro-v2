import { apiClient, ApiResponse } from './api-client';

export interface Client {
  id: string;
  clientNumber: string;
  fullName: string;
  mobile: string;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  dateOfBirth?: string | null;
  anniversaryDate?: string | null;
  notes?: string | null;
  status: string;
  isActive: boolean;
  archivedAt?: string | null;
  totalBookings: number;
  totalAmount: number;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFormData {
  fullName: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  dateOfBirth?: string;
  anniversaryDate?: string;
  notes?: string;
}

export interface PaginatedClients {
  items: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpcomingClientEvent {
  clientId: string;
  clientName: string;
  mobile: string;
  eventType: 'birthday' | 'anniversary';
  eventDate: string;
  daysUntil: number;
}

export type ClientSortField =
  | 'fullName'
  | 'mobile'
  | 'email'
  | 'city'
  | 'createdAt'
  | 'totalBookings'
  | 'totalAmount'
  | 'outstandingBalance';

export interface ListClientsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  sortBy?: ClientSortField;
  sortOrder?: 'asc' | 'desc';
}

export const clientsService = {
  async list(params: ListClientsParams = {}): Promise<PaginatedClients> {
    const { data } = await apiClient.get<ApiResponse<PaginatedClients>>('/clients', { params });
    return data.data;
  },

  async getById(id: string): Promise<Client> {
    const { data } = await apiClient.get<ApiResponse<Client>>(`/clients/${id}`);
    return data.data;
  },

  async getUpcomingEvents(): Promise<UpcomingClientEvent[]> {
    const { data } = await apiClient.get<ApiResponse<UpcomingClientEvent[]>>(
      '/clients/upcoming-events',
    );
    return data.data;
  },

  async create(payload: ClientFormData): Promise<Client> {
    const { data } = await apiClient.post<ApiResponse<Client>>('/clients', payload);
    return data.data;
  },

  async update(id: string, payload: Partial<ClientFormData>): Promise<Client> {
    const { data } = await apiClient.patch<ApiResponse<Client>>(`/clients/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/clients/${id}`);
  },

  async restore(id: string): Promise<Client> {
    const { data } = await apiClient.post<ApiResponse<Client>>(`/clients/${id}/restore`);
    return data.data;
  },
};
