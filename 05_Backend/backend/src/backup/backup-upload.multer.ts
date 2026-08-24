import { tmpdir } from 'os';
import { diskStorage } from 'multer';

export const MAX_BACKUP_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024;

export function createBackupUploadMulterOptions() {
  return {
    storage: diskStorage({
      destination: (_req: unknown, _file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) => {
        callback(null, tmpdir());
      },
      filename: (_req: unknown, _file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
        callback(null, `dhara-restore-upload-${Date.now()}.zip`);
      },
    }),
    limits: {
      fileSize: MAX_BACKUP_UPLOAD_BYTES,
      files: 1,
    },
    fileFilter: (
      _req: unknown,
      file: { originalname: string },
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!file.originalname.toLowerCase().endsWith('.zip')) {
        callback(new Error('A valid Dhara ERP .zip backup is required.'), false);
        return;
      }
      callback(null, true);
    },
  };
}
