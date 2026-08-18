import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  BACKUP_FILE_OUTSIDE_DIR_MESSAGE,
  BACKUP_FILE_REQUIRED_MESSAGE,
  confineBackupBrowsePath,
  resolveSafeBackupZip,
} from './app-paths';

describe('resolveSafeBackupZip', () => {
  const backupDir = mkdtempSync(join(tmpdir(), 'dhara-safe-backup-'));
  const nestedDir = join(backupDir, 'nested');
  const validZip = join(backupDir, 'ok.zip');
  const nestedZip = join(nestedDir, 'nested-ok.zip');

  beforeAll(() => {
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(validZip, 'zip-bytes');
    writeFileSync(nestedZip, 'nested-zip-bytes');
  });

  it('accepts a valid backup inside BACKUP_DIR', () => {
    expect(resolveSafeBackupZip(validZip, backupDir).toLowerCase()).toBe(validZip.toLowerCase());
  });

  it('accepts a filename relative to BACKUP_DIR', () => {
    expect(resolveSafeBackupZip('ok.zip', backupDir).toLowerCase()).toBe(validZip.toLowerCase());
  });

  it('accepts a nested valid backup inside BACKUP_DIR', () => {
    expect(resolveSafeBackupZip(nestedZip, backupDir).toLowerCase()).toBe(nestedZip.toLowerCase());
    expect(resolveSafeBackupZip(join('nested', 'nested-ok.zip'), backupDir).toLowerCase()).toBe(
      nestedZip.toLowerCase(),
    );
  });

  it('rejects an absolute path outside BACKUP_DIR', () => {
    const outside = join(mkdtempSync(join(tmpdir(), 'dhara-outside-')), 'escape.zip');
    writeFileSync(outside, 'nope');
    expect(() => resolveSafeBackupZip(outside, backupDir)).toThrow(BACKUP_FILE_OUTSIDE_DIR_MESSAGE);
  });

  it('rejects ../ path traversal', () => {
    const outsideDir = mkdtempSync(join(tmpdir(), 'dhara-sibling-'));
    const outsideZip = join(outsideDir, 'escape.zip');
    writeFileSync(outsideZip, 'nope');
    expect(() => resolveSafeBackupZip(join('..', '..', 'escape.zip'), backupDir)).toThrow(
      BACKUP_FILE_OUTSIDE_DIR_MESSAGE,
    );
    expect(() => resolveSafeBackupZip(join(backupDir, '..', 'escape.zip'), backupDir)).toThrow(
      BACKUP_FILE_OUTSIDE_DIR_MESSAGE,
    );
  });

  it('rejects an invalid extension', () => {
    const txt = join(backupDir, 'notes.txt');
    writeFileSync(txt, 'not-a-zip');
    expect(() => resolveSafeBackupZip(txt, backupDir)).toThrow(BACKUP_FILE_REQUIRED_MESSAGE);
  });

  it('rejects a missing file inside BACKUP_DIR', () => {
    expect(() => resolveSafeBackupZip(join(backupDir, 'missing.zip'), backupDir)).toThrow(
      BACKUP_FILE_REQUIRED_MESSAGE,
    );
  });

  it('rejects a symlink that escapes BACKUP_DIR', () => {
    const outsideDir = mkdtempSync(join(tmpdir(), 'dhara-symlink-src-'));
    const outsideZip = join(outsideDir, 'secret.zip');
    writeFileSync(outsideZip, 'secret');
    const link = join(backupDir, 'alias.zip');

    try {
      symlinkSync(outsideZip, link);
    } catch {
      return;
    }

    expect(() => resolveSafeBackupZip(link, backupDir)).toThrow(BACKUP_FILE_OUTSIDE_DIR_MESSAGE);
  });
});

describe('confineBackupBrowsePath', () => {
  const backupDir = mkdtempSync(join(tmpdir(), 'dhara-browse-backup-'));
  const validZip = join(backupDir, 'ok.zip');

  beforeAll(() => {
    writeFileSync(validZip, 'zip-bytes');
  });

  it('accepts a valid backup inside BACKUP_DIR', () => {
    expect(confineBackupBrowsePath(validZip, backupDir)?.toLowerCase()).toBe(validZip.toLowerCase());
  });

  it('returns null when the picker is cancelled', () => {
    expect(confineBackupBrowsePath(null, backupDir)).toBeNull();
    expect(confineBackupBrowsePath('  ', backupDir)).toBeNull();
  });

  it('rejects an absolute path outside BACKUP_DIR', () => {
    const outside = join(mkdtempSync(join(tmpdir(), 'dhara-browse-out-')), 'escape.zip');
    writeFileSync(outside, 'nope');
    expect(() => confineBackupBrowsePath(outside, backupDir)).toThrow(BACKUP_FILE_OUTSIDE_DIR_MESSAGE);
  });

  it('rejects ../ path traversal', () => {
    expect(() => confineBackupBrowsePath(join(backupDir, '..', 'escape.zip'), backupDir)).toThrow(
      BACKUP_FILE_OUTSIDE_DIR_MESSAGE,
    );
  });

  it('rejects a symlink that escapes BACKUP_DIR', () => {
    const outsideDir = mkdtempSync(join(tmpdir(), 'dhara-browse-symlink-'));
    const outsideZip = join(outsideDir, 'secret.zip');
    writeFileSync(outsideZip, 'secret');
    const link = join(backupDir, 'alias.zip');

    try {
      symlinkSync(outsideZip, link);
    } catch {
      return;
    }

    expect(() => confineBackupBrowsePath(link, backupDir)).toThrow(BACKUP_FILE_OUTSIDE_DIR_MESSAGE);
  });
});
