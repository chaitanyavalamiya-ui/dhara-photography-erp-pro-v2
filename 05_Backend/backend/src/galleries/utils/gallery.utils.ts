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
export const GALLERY_PHOTO_PAGE_DEFAULT = 40;
export const GALLERY_PHOTO_PAGE_MAX = 100;

export const STUDIO_ORIGINAL_PERMISSIONS = [
  'gallery.create',
  'gallery.update',
  'gallery.archive',
] as const;

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export function canAccessOriginalPhoto(
  permissions: string[] | undefined,
  allowClientDownload: boolean,
): boolean {
  if (allowClientDownload) {
    return true;
  }

  return (permissions ?? []).some((permission) =>
    (STUDIO_ORIGINAL_PERMISSIONS as readonly string[]).includes(permission),
  );
}

export function detectImageMimeFromMagicBytes(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'image/gif';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

export function assertValidUploadFile(file: {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}): void {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw new Error(`Unsupported file type: ${file.originalname}`);
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES || file.buffer.length > MAX_UPLOAD_FILE_SIZE_BYTES) {
    throw new Error(`File too large: ${file.originalname}`);
  }

  const detected = detectImageMimeFromMagicBytes(file.buffer);
  if (!detected || detected !== file.mimetype) {
    throw new Error(`File content does not match an allowed image type: ${file.originalname}`);
  }
}

export function toDateOnlyLabel(value?: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}
