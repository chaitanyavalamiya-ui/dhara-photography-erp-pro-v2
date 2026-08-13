import { apiClient, ApiResponse } from './api-client';

export type AlbumType = 'standard' | 'premium' | 'luxury' | 'royal';
export type AlbumStatus =
  | 'pending'
  | 'designing'
  | 'printing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface AlbumPhoto {
  id: string;
  galleryPhotoId: string;
  galleryId: string;
  originalName: string;
  mimeType: string;
  sortOrder: number;
  notes?: string | null;
  available: boolean;
  createdAt: string;
}

export interface Album {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  bookingId: string;
  bookingNumber: string;
  galleryId?: string | null;
  galleryName?: string | null;
  galleryArchived?: boolean;
  albumType: AlbumType;
  albumPrice: number;
  pageCount: number;
  selectedPhotoCount: number;
  vendorExpense: number;
  vendorExpenseId?: string | null;
  profit: number;
  status: AlbumStatus;
  orderDate?: string | null;
  expectedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  vendorName?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  photos?: AlbumPhoto[];
}

export interface PaginatedAlbums {
  items: Album[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateAlbumPayload {
  bookingId: string;
  galleryId?: string;
  name: string;
  albumType?: AlbumType;
  albumPrice?: number;
  pageCount?: number;
  status?: AlbumStatus;
  orderDate?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  vendorName?: string;
  vendorExpense?: number;
  notes?: string;
}

export interface UpdateAlbumPayload {
  galleryId?: string | null;
  name?: string;
  albumType?: AlbumType;
  albumPrice?: number;
  pageCount?: number;
  status?: AlbumStatus;
  orderDate?: string | null;
  expectedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  vendorName?: string | null;
  vendorExpense?: number;
  notes?: string | null;
}

export const ALBUM_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'royal', label: 'Royal' },
] as const;

export const ALBUM_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'designing', label: 'Designing' },
  { value: 'printing', label: 'Printing' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export const albumsService = {
  async list(params: Record<string, unknown> = {}): Promise<PaginatedAlbums> {
    const { data } = await apiClient.get<ApiResponse<PaginatedAlbums>>('/albums', { params });
    return data.data;
  },

  async getById(id: string): Promise<Album> {
    const { data } = await apiClient.get<ApiResponse<Album>>(`/albums/${id}`);
    return data.data;
  },

  async create(payload: CreateAlbumPayload): Promise<Album> {
    const { data } = await apiClient.post<ApiResponse<Album>>('/albums', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateAlbumPayload): Promise<Album> {
    const { data } = await apiClient.patch<ApiResponse<Album>>(`/albums/${id}`, payload);
    return data.data;
  },

  async archive(id: string): Promise<void> {
    await apiClient.delete(`/albums/${id}`);
  },

  async listPhotos(id: string): Promise<AlbumPhoto[]> {
    const { data } = await apiClient.get<ApiResponse<AlbumPhoto[]>>(`/albums/${id}/photos`);
    return data.data;
  },

  async addPhotos(id: string, galleryPhotoIds: string[]): Promise<AlbumPhoto[]> {
    const { data } = await apiClient.post<ApiResponse<AlbumPhoto[]>>(
      `/albums/${id}/photos`,
      { galleryPhotoIds },
    );
    return data.data;
  },

  async removePhoto(id: string, galleryPhotoId: string): Promise<void> {
    await apiClient.delete(`/albums/${id}/photos/${galleryPhotoId}`);
  },

  async selectAllPhotos(id: string): Promise<AlbumPhoto[]> {
    const { data } = await apiClient.post<ApiResponse<AlbumPhoto[]>>(
      `/albums/${id}/photos/select-all`,
    );
    return data.data;
  },

  async clearAllPhotos(id: string): Promise<void> {
    await apiClient.delete(`/albums/${id}/photos`);
  },
};
