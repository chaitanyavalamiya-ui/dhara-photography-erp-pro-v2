import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtempSync, symlinkSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AuditService } from '../audit/audit.service';
import { BackupService } from './backup.service';
import { BACKUP_FILE_OUTSIDE_DIR_MESSAGE, BACKUP_FILE_REQUIRED_MESSAGE } from './app-paths';

describe('BackupService', () => {
  const tmpBackupDir = mkdtempSync(join(tmpdir(), 'dhara-history-'));

  const mockPrisma = {
    user: {
      findFirst: jest.fn().mockResolvedValue({
        userRoles: [{ role: { code: 'owner' } }],
      }),
    },
  };

  const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

  const service = new BackupService(
    {
      get: jest.fn((key: string) => (key === 'BACKUP_DIR' ? tmpBackupDir : undefined)),
    } as unknown as ConfigService,
    mockAudit as unknown as AuditService,
    mockPrisma as never,
  );

  afterEach(() => {
    jest.restoreAllMocks();
    mockAudit.log.mockClear();
  });

  it('audits backup create with a UUID recordId instead of the file path', async () => {
    const zip = join(tmpBackupDir, 'created.zip');
    jest
      .spyOn(service as unknown as { runScript: (...args: unknown[]) => Promise<unknown> }, 'runScript')
      .mockResolvedValue({
        success: true,
        backupFile: zip,
        sizeBytes: 2048,
        uploadFileCount: 3,
      });

    await service.createBackup('company-1', 'user-1');

    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'backup_create',
        recordId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        ),
        newValue: expect.objectContaining({ backupFile: zip, sizeBytes: 2048 }),
      }),
    );
  });

  it('rejects restore without the REPLACE confirmation phrase', async () => {
    await expect(
      service.restoreBackup('company-1', 'user-1', join(tmpBackupDir, 'demo.zip'), 'yes'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('rejects restore when the actor is not the studio owner', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({
      userRoles: [{ role: { code: 'admin' } }],
    });
    const zip = join(tmpBackupDir, 'owner-check.zip');
    writeFileSync(zip, 'zip');

    await expect(
      service.restoreBackup('company-1', 'admin-1', zip, 'REPLACE'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    try {
      unlinkSync(zip);
    } catch {
      // ignore
    }
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

  it('saves an uploaded zip inside BACKUP_DIR without restoring', () => {
    const source = join(tmpdir(), `dhara-upload-${Date.now()}.zip`);
    writeFileSync(source, 'zip-bytes');

    const saved = service.saveUploadedBackup({
      path: source,
      originalname: 'studio-backup.zip',
    } as Express.Multer.File);

    expect(saved.path.toLowerCase().startsWith(tmpBackupDir.toLowerCase())).toBe(true);
    expect(existsSync(saved.path)).toBe(true);
    expect(service.getDownloadPath(saved.path).toLowerCase()).toBe(saved.path.toLowerCase());
  });

  it('rejects downloading a zip outside BACKUP_DIR', () => {
    const outside = join(mkdtempSync(join(tmpdir(), 'dhara-dl-out-')), 'outside.zip');
    writeFileSync(outside, 'zip');
    expect(() => service.getDownloadPath(outside)).toThrow(BACKUP_FILE_OUTSIDE_DIR_MESSAGE);
  });

  it('rejects a missing upload file', () => {
    expect(() => service.saveUploadedBackup(undefined)).toThrow(BACKUP_FILE_REQUIRED_MESSAGE);
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
