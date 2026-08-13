export const MAX_GALLERY_UPLOAD_FILE_SIZE_BYTES = 200 * 1024 * 1024;
export const MAX_GALLERY_UPLOAD_FILE_SIZE_MB = MAX_GALLERY_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024);
export const GALLERY_UPLOAD_TIMEOUT_MS = 30 * 60 * 1000;

export function galleryFileTooLargeMessage(): string {
  return `File is too large. Maximum allowed size is ${MAX_GALLERY_UPLOAD_FILE_SIZE_MB} MB.`;
}

export function isGalleryUploadOversize(file: Pick<File, 'size'>): boolean {
  return file.size > MAX_GALLERY_UPLOAD_FILE_SIZE_BYTES;
}

export type GalleryUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface GalleryUploadItem {
  id: string;
  file: File;
  status: GalleryUploadStatus;
  progress: number;
  error?: string;
}
