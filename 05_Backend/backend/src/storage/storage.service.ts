import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { isPathInside, resolveUploadsPath } from '../backup/app-paths';

export interface StoredFile {
  storageKey: string;
  absolutePath: string;
}

@Injectable()
export class StorageService {
  private readonly uploadRoot: string;

  constructor(private readonly configService: ConfigService) {
    const configured = this.configService.get<string>('UPLOAD_DIR', 'uploads');
    this.uploadRoot = resolveUploadsPath({
      uploadDir: configured,
      nodeEnv: this.configService.get<string>('NODE_ENV', 'development'),
      cwd: process.cwd(),
    });
  }

  getUploadRoot(): string {
    return this.uploadRoot;
  }

  resolveAbsolutePath(storageKey: string): string {
    if (!storageKey || storageKey.includes('\0') || storageKey.split(/[\\/]/).includes('..')) {
      throw new Error('Invalid storage path.');
    }

    const absolute = resolve(this.uploadRoot, storageKey);
    if (!isPathInside(absolute, this.uploadRoot)) {
      throw new Error('Invalid storage path.');
    }
    return absolute;
  }

  async saveBuffer(storageKey: string, buffer: Buffer): Promise<StoredFile> {
    const absolutePath = this.resolveAbsolutePath(storageKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);

    return { storageKey, absolutePath };
  }

  async readBuffer(storageKey: string): Promise<Buffer> {
    return readFile(this.resolveAbsolutePath(storageKey));
  }

  async deleteFile(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolveAbsolutePath(storageKey));
    } catch {
      // ignore missing files during cleanup
    }
  }

  buildGalleryPhotoKey(galleryId: string, fileName: string): string {
    return join('galleries', galleryId, fileName).replace(/\\/g, '/');
  }
}
