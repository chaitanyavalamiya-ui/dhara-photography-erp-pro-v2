import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  const uploadRoot = mkdtempSync(join(tmpdir(), 'dhara-uploads-'));
  const service = new StorageService({
    get: (_key: string, fallback?: string) => {
      if (_key === 'UPLOAD_DIR') return uploadRoot;
      if (_key === 'NODE_ENV') return 'test';
      return fallback;
    },
  } as ConfigService);

  it('rejects path traversal keys', () => {
    expect(() => service.resolveAbsolutePath('../secret.txt')).toThrow('Invalid storage path.');
    expect(() => service.resolveAbsolutePath('galleries/../../etc/passwd')).toThrow(
      'Invalid storage path.',
    );
  });

  it('rejects NUL characters in storage keys', () => {
    expect(() => service.resolveAbsolutePath('galleries/ab\0c.jpg')).toThrow('Invalid storage path.');
  });

  it('resolves keys inside the upload root', () => {
    const absolute = service.resolveAbsolutePath('galleries/abc/photo.jpg');
    expect(absolute.startsWith(uploadRoot)).toBe(true);
  });

  it('moves a file from disk without loading the original into saveBuffer', async () => {
    const sourceDir = mkdtempSync(join(tmpdir(), 'dhara-src-'));
    const sourcePath = join(sourceDir, 'original.jpg');
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    writeFileSync(sourcePath, bytes);

    const stored = await service.saveFromPath('galleries/g1/photo.jpg', sourcePath);
    expect(readFileSync(stored.absolutePath).equals(bytes)).toBe(true);
    expect(existsSync(sourcePath)).toBe(false);
  });
});
