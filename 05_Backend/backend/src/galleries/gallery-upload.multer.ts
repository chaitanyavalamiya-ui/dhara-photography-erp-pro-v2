import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  getGalleryUploadTempDir,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_UPLOAD_FILES_PER_REQUEST,
  sanitizeFileName,
} from './utils/gallery.utils';

export function ensureGalleryUploadTempDir(): string {
  const destination = getGalleryUploadTempDir();
  mkdirSync(destination, { recursive: true });
  return destination;
}

export function createGalleryUploadMulterOptions() {
  const destination = ensureGalleryUploadTempDir();

  return {
    storage: diskStorage({
      destination: (_req, _file, callback) => callback(null, destination),
      filename: (_req, file, callback) => {
        callback(null, `${randomUUID()}-${sanitizeFileName(file.originalname)}`);
      },
    }),
    limits: {
      fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
      files: MAX_UPLOAD_FILES_PER_REQUEST,
    },
    fileFilter: (
      _req: unknown,
      file: { originalname: string; mimetype: string },
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
        callback(new Error(`Unsupported file type: ${file.originalname}`), false);
        return;
      }
      callback(null, true);
    },
  };
}
