export const GALLERY_STATUS_CODES = [
  'draft',
  'active',
  'client_review',
  'approved',
  'delivered',
] as const;

export type GalleryStatusCode = (typeof GALLERY_STATUS_CODES)[number];

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const MAX_UPLOAD_FILE_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 20;

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export function toDateOnlyLabel(value?: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}
