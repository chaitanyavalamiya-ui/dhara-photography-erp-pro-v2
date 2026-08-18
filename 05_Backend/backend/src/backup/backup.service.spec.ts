import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtempSync, symlinkSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AuditService } from '../audit/audit.service';
import { BackupService } from './backup.service';
import { BACKUP_FILE_OUTSIDE_DIR_MESSAGE } from './app-paths';

describe('BackupService', () => {
  const tmpBackupDir = mkdtempSync(join(tmpdir(), 'dhara-history-'));

  const service = new BackupService(
    {
      get: jest.fn((key: string) => (key === 'BACKUP_DIR' ? tmpBackupDir : undefined)),
    } as unknown as ConfigService,
    { log: jest.fn() } as unknown as AuditService,
  );

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it('rejects restore preview of a zip outside BACKUP_DIR', async () => {
    const outside = join(mkdtempSync(join(tmpdir(), 'dhara-out-')), 'outside.zip');
    writeFileSync(outside, 'zip');
    await expect(service.previewRestore(outside)).rejects.toThrow(/inside the configured backup folder/);
  });

  it('rejects a browsed backup path outside BACKUP_DIR', async () => {
    const outside = join(mkdtempSync(join(tmpdir(), 'dhara-browse-out-')), 'outside.zip');
    writeFileSync(outside, 'zip');
    jest.spyOn(service as unknown as { runScript: (...args: unknown[]) => Promise<unknown> }, 'runScript').mockResolvedValue({
      success: true,
      backupFile: outside,
    });

    await expect(service.browseBackupFile()).rejects.toThrow(BACKUP_FILE_OUTSIDE_DIR_MESSAGE);
  });

  it('returns a browsed backup that stays inside BACKUP_DIR', async () => {
    const inside = join(tmpBackupDir, 'picked.zip');
    writeFileSync(inside, 'zip');
    jest.spyOn(service as unknown as { runScript: (...args: unknown[]) => Promise<unknown> }, 'runScript').mockResolvedValue({
      success: true,
      backupFile: inside,
    });

    await expect(service.browseBackupFile()).resolves.toEqual({
      path: expect.stringMatching(/picked\.zip$/i),
    });
  });

  it('rejects a browsed ../ traversal path', async () => {
    jest.spyOn(service as unknown as { runScript: (...args: unknown[]) => Promise<unknown> }, 'runScript').mockResolvedValue({
      success: true,
      backupFile: join(tmpBackupDir, '..', 'escape.zip'),
    });

    await expect(service.browseBackupFile()).rejects.toThrow(BACKUP_FILE_OUTSIDE_DIR_MESSAGE);
  });

  it('does not list a symlink that escapes BACKUP_DIR', () => {
    const outsideDir = mkdtempSync(join(tmpdir(), 'dhara-list-symlink-'));
    const outsideZip = join(outsideDir, 'secret.zip');
    writeFileSync(outsideZip, 'secret');
    const link = join(tmpBackupDir, 'alias.zip');

    try {
      symlinkSync(outsideZip, link);
    } catch {
      return;
    }

    const items = service.listHistory();
    expect(items.some((item) => item.fileName === 'alias.zip')).toBe(false);
    expect(items.every((item) => item.path.toLowerCase().startsWith(tmpBackupDir.toLowerCase()))).toBe(
      true,
    );
  });
});
