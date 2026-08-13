import { apiClient, ApiResponse } from './api-client';
import {
  GALLERY_UPLOAD_TIMEOUT_MS,
  galleryFileTooLargeMessage,
  isGalleryUploadOversize,
} from '@/utils/gallery-upload';

export type GalleryStatus = 'draft' | 'active' | 'client_review' | 'approved' | 'delivered';

export interface GalleryPhoto {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  sortOrder: number;
  clientSelected: boolean;
  clientSelectionNotes?: string | null;
  createdAt: string;
}

export interface PaginatedGalleryPhotos {
  items: GalleryPhoto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Gallery {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  bookingId: string;
  bookingNumber: string;
  eventType?: string | null;
  eventDate?: string | null;
  description?: string | null;
  status: GalleryStatus;
  allowClientDownload: boolean;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
  photos?: GalleryPhoto[];
}

export interface PaginatedGalleries {
  items: Gallery[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateGalleryPayload {
  bookingId: string;
  name: string;
  eventType?: string;
  eventDate?: string;
  description?: string;
  status?: GalleryStatus;
}

export const GALLERY_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'client_review', label: 'Client Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'delivered', label: 'Delivered' },
] as const;

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000/api/v1';

export function canViewOriginalPhoto(
  allowClientDownload: boolean,
  hasPermission: (permission: string) => boolean,
): boolean {
  if (allowClientDownload) {
    return true;
  }

  return (
    hasPermission('gallery.create') ||
    hasPermission('gallery.update') ||
    hasPermission('gallery.archive')
  );
}

export const galleriesService = {
  async list(params: Record<string, unknown> = {}): Promise<PaginatedGalleries> {
    const { data } = await apiClient.get<ApiResponse<PaginatedGalleries>>('/galleries', { params });
    return data.data;
  },

  async getById(id: string): Promise<Gallery> {
    const { data } = await apiClient.get<ApiResponse<Gallery>>(`/galleries/${id}`);
    return data.data;
  },

  async create(payload: CreateGalleryPayload): Promise<Gallery> {
    const { data } = await apiClient.post<ApiResponse<Gallery>>('/galleries', payload);
    return data.data;
  },

  async archive(id: string): Promise<void> {
    await apiClient.delete(`/galleries/${id}`);
  },

  async listPhotos(
    galleryId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<PaginatedGalleryPhotos> {
    const { data } = await apiClient.get<ApiResponse<PaginatedGalleryPhotos>>(
      `/galleries/${galleryId}/photos`,
      { params },
    );
    return data.data;
  },

  async uploadPhoto(
    galleryId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<GalleryPhoto> {
    if (isGalleryUploadOversize(file)) {
      throw new Error(galleryFileTooLargeMessage());
    }

    const formData = new FormData();
    formData.append('files', file);

    const { data } = await apiClient.post<ApiResponse<GalleryPhoto[]>>(
      `/galleries/${galleryId}/photos`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: GALLERY_UPLOAD_TIMEOUT_MS,
        onUploadProgress: (event) => {
          if (!onProgress || !event.total) return;
          onProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
    );

    const photo = data.data[0];
    if (!photo) {
      throw new Error('Upload did not return a photo record.');
    }
    return photo;
  },

  async uploadPhotos(
    galleryId: string,
    files: File[],
    onProgress?: (percent: number) => void,
  ): Promise<GalleryPhoto[]> {
    const created: GalleryPhoto[] = [];
    for (const file of files) {
      created.push(await this.uploadPhoto(galleryId, file, onProgress));
    }
    return created;
  },

  async deletePhoto(galleryId: string, photoId: string): Promise<void> {
    await apiClient.delete(`/galleries/${galleryId}/photos/${photoId}`);
  },

  getPhotoUrl(galleryId: string, photoId: string, variant: 'thumbnail' | 'original' = 'thumbnail'): string {
    return `${API_BASE_URL}/galleries/${galleryId}/photos/${photoId}/file?variant=${variant}`;
  },
};
