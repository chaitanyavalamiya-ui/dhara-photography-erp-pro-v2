import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtempSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AuditService } from '../audit/audit.service';
import { BackupService } from './backup.service';

describe('BackupService', () => {
  const tmpBackupDir = mkdtempSync(join(tmpdir(), 'dhara-history-'));

  const service = new BackupService(
    {
      get: jest.fn((key: string) => (key === 'BACKUP_DIR' ? tmpBackupDir : undefined)),
    } as unknown as ConfigService,
    { log: jest.fn() } as unknown as AuditService,
  );

  it('rejects restore without the REPLACE confirmation phrase', async () => {
    await expect(
      service.restoreBackup('company-1', 'user-1', join(tmpBackupDir, 'demo.zip'), 'yes'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists backup history without deleting existing ZIP files', () => {
    const first = join(tmpBackupDir, 'dhara_erp_20260101_010101.zip');
    const second = join(tmpBackupDir, 'dhara_erp_20260102_010101.zip');
    writeFileSync(first, 'zip-one');
    writeFileSync(second, 'zip-two');

    const items = service.listHistory();
    expect(items).toHaveLength(2);
    expect(existsSync(first)).toBe(true);
    expect(existsSync(second)).toBe(true);
    expect(items.every((item) => item.status === 'available')).toBe(true);
  });

  it('rejects changing the backup location into the application directory', () => {
    expect(() => service.setLocation(process.cwd())).toThrow(BadRequestException);
  });
});
