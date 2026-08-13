import { mkdtempSync } from 'fs';
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

  it('resolves keys inside the upload root', () => {
    const absolute = service.resolveAbsolutePath('galleries/abc/photo.jpg');
    expect(absolute.startsWith(uploadRoot)).toBe(true);
  });
});
