import { createHash } from 'crypto';
import { mkdtempSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  BACKUP_APPLICATION_NAME,
  BACKUP_FORMAT_VERSION,
  sha256File,
  validateBackupPayload,
} from './backup-integrity';

function sha256(contents: string | Buffer): string {
  return createHash('sha256').update(contents).digest('hex');
}

function writeValidBackup(stagingDir: string): void {
  mkdirSync(join(stagingDir, 'uploads', 'galleries'), { recursive: true });
  writeFileSync(join(stagingDir, 'database.sql'), 'SELECT 1;');
  writeFileSync(join(stagingDir, 'uploads', 'galleries', 'photo.jpg'), 'photo-bytes');

  const checksums = [
    `${sha256File(join(stagingDir, 'database.sql'))}  database.sql`,
    `${sha256File(join(stagingDir, 'uploads', 'galleries', 'photo.jpg'))}  uploads/galleries/photo.jpg`,
    '',
  ].join('\n');
  writeFileSync(join(stagingDir, 'checksums.sha256'), checksums);

  const manifest = {
    applicationName: BACKUP_APPLICATION_NAME,
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    databaseName: 'dhara_erp',
    schemas: ['master', 'transaction', 'audit', 'system'],
    uploadFileCount: 1,
    checksumAlgorithm: 'SHA-256',
    checksumsFile: 'checksums.sha256',
    checksumsSha256: sha256File(join(stagingDir, 'checksums.sha256')),
  };
  writeFileSync(join(stagingDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

describe('backup-integrity', () => {
  it('accepts a valid backup payload with matching SHA-256 checksums', () => {
    const stagingDir = mkdtempSync(join(tmpdir(), 'dhara-backup-valid-'));
    writeValidBackup(stagingDir);
    const manifest = validateBackupPayload(stagingDir);
    expect(manifest.applicationName).toBe(BACKUP_APPLICATION_NAME);
    expect(manifest.uploadFileCount).toBe(1);
  });

  it('rejects a backup missing database.sql', () => {
    const stagingDir = mkdtempSync(join(tmpdir(), 'dhara-backup-nodb-'));
    writeValidBackup(stagingDir);
    unlinkSync(join(stagingDir, 'database.sql'));
    expect(() => validateBackupPayload(stagingDir)).toThrow('Backup is missing database.sql');
  });

  it('rejects a corrupt checksum', () => {
    const stagingDir = mkdtempSync(join(tmpdir(), 'dhara-backup-corrupt-'));
    writeValidBackup(stagingDir);
    writeFileSync(join(stagingDir, 'database.sql'), 'SELECT 2;');
    expect(() => validateBackupPayload(stagingDir)).toThrow(/Checksum mismatch/);
  });

  it('rejects a tampered checksums file', () => {
    const stagingDir = mkdtempSync(join(tmpdir(), 'dhara-backup-tamper-'));
    writeValidBackup(stagingDir);
    writeFileSync(join(stagingDir, 'checksums.sha256'), `${sha256('nope')}  database.sql\n`);
    expect(() => validateBackupPayload(stagingDir)).toThrow('checksums.sha256 integrity check failed.');
  });
});
