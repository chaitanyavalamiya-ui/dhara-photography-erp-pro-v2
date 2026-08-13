import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  assertBackupDirOutsideApp,
  expandWindowsEnvPath,
  isPathInside,
  resolveRepoRoot,
  RESTORE_CONFIRM_PHRASE,
} from './app-paths';

describe('app-paths', () => {
  it('rejects a backup directory inside the application/repository folder', () => {
    const repoRoot = resolveRepoRoot();
    expect(() => assertBackupDirOutsideApp(join(repoRoot, 'Backups'), repoRoot)).toThrow(
      /outside the application/,
    );
  });

  it('allows a backup directory outside the application folder', () => {
    const repoRoot = resolveRepoRoot();
    const outside = mkdtempSync(join(tmpdir(), 'dhara-backups-'));
    expect(() => assertBackupDirOutsideApp(outside, repoRoot)).not.toThrow();
    expect(isPathInside(outside, repoRoot)).toBe(false);
  });

  it('uses REPLACE as the restore confirmation phrase', () => {
    expect(RESTORE_CONFIRM_PHRASE).toBe('REPLACE');
  });

  it('expands %LOCALAPPDATA% style backup paths', () => {
    process.env.LOCALAPPDATA = 'C:\\Users\\Studio\\AppData\\Local';
    expect(expandWindowsEnvPath('%LOCALAPPDATA%\\DharaPhotographyERP\\Backups')).toBe(
      'C:\\Users\\Studio\\AppData\\Local\\DharaPhotographyERP\\Backups',
    );
  });
});
