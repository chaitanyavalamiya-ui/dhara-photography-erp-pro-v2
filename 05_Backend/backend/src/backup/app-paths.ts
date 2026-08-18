import { existsSync, lstatSync, realpathSync, statSync } from 'fs';
import { homedir } from 'os';
import { extname, isAbsolute, join, resolve } from 'path';

export const DHARA_APP_FOLDER = 'DharaPhotographyERP';
export const RESTORE_CONFIRM_PHRASE = 'REPLACE';

export function expandWindowsEnvPath(value: string): string {
  return value.replace(/%([^%]+)%/g, (_, name: string) => process.env[name] ?? '');
}

export function getDharaDataRoot(): string {
  const fromEnv = process.env.DHARA_DATA_ROOT?.trim();
  if (fromEnv) {
    return resolve(expandWindowsEnvPath(fromEnv));
  }
  const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
  return join(localAppData, DHARA_APP_FOLDER);
}

export function getDefaultBackupDir(): string {
  return join(getDharaDataRoot(), 'Backups');
}

export function getPathsConfigFile(): string {
  return join(getDharaDataRoot(), 'Config', 'paths.json');
}

export function resolveRepoRoot(cwd = process.cwd()): string {
  const candidates = [cwd, resolve(cwd, '..'), resolve(cwd, '../..'), resolve(cwd, '../../..')];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, '03_Database', 'scripts', 'backup-db.ps1'))) {
      return candidate;
    }
  }
  throw new Error('Could not locate the Dhara ERP application root.');
}

export function isPathInside(child: string, parent: string): boolean {
  const fullChild = resolve(child).replace(/[\\/]+$/, '').toLowerCase();
  const fullParent = resolve(parent).replace(/[\\/]+$/, '').toLowerCase();
  return fullChild === fullParent || fullChild.startsWith(`${fullParent}\\`) || fullChild.startsWith(`${fullParent}/`);
}

export const BACKUP_FILE_REQUIRED_MESSAGE = 'A valid Dhara ERP .zip backup is required.';
export const BACKUP_FILE_OUTSIDE_DIR_MESSAGE =
  'Backup file must be inside the configured backup folder.';

function canonicalizeExistingPath(pathValue: string): string {
  return realpathSync(pathValue);
}

/**
 * Restore/preview may only target a .zip whose resolved real path stays inside BACKUP_DIR.
 * Relative names are resolved against the backup folder, not process.cwd().
 */
export function resolveSafeBackupZip(backupFile: string, backupDir: string): string {
  const trimmed = backupFile?.trim() ?? '';
  if (!trimmed || trimmed.includes('\0')) {
    throw new Error(BACKUP_FILE_REQUIRED_MESSAGE);
  }

  const backupRoot = resolve(backupDir);
  const candidate = isAbsolute(trimmed) ? resolve(trimmed) : resolve(backupRoot, trimmed);

  if (extname(candidate).toLowerCase() !== '.zip') {
    throw new Error(BACKUP_FILE_REQUIRED_MESSAGE);
  }

  if (!isPathInside(candidate, backupRoot)) {
    throw new Error(BACKUP_FILE_OUTSIDE_DIR_MESSAGE);
  }

  if (!existsSync(candidate)) {
    throw new Error(BACKUP_FILE_REQUIRED_MESSAGE);
  }

  const candidateStat = lstatSync(candidate);
  if (!candidateStat.isFile() && !candidateStat.isSymbolicLink()) {
    throw new Error(BACKUP_FILE_REQUIRED_MESSAGE);
  }

  const realRoot = existsSync(backupRoot) ? canonicalizeExistingPath(backupRoot) : backupRoot;
  const realFile = canonicalizeExistingPath(candidate);

  if (!isPathInside(realFile, realRoot)) {
    throw new Error(BACKUP_FILE_OUTSIDE_DIR_MESSAGE);
  }

  if (!statSync(realFile).isFile() || extname(realFile).toLowerCase() !== '.zip') {
    throw new Error(BACKUP_FILE_REQUIRED_MESSAGE);
  }

  return realFile;
}

/** File-picker results must use the same BACKUP_DIR confinement as preview/restore. */
export function confineBackupBrowsePath(
  backupFile: string | null | undefined,
  backupDir: string,
): string | null {
  if (!backupFile?.trim()) {
    return null;
  }
  return resolveSafeBackupZip(backupFile, backupDir);
}

export function assertBackupDirOutsideApp(backupDir: string, repoRoot: string): void {
  if (isPathInside(backupDir, repoRoot)) {
    throw new Error(
      'Backup folder must be outside the application/repository directory.',
    );
  }
}

export function resolveUploadsPath(options: {
  uploadDir?: string;
  nodeEnv?: string;
  cwd?: string;
}): string {
  const uploadDir = options.uploadDir?.trim() || 'uploads';
  if (/^[A-Za-z]:[\\/]/.test(uploadDir) || uploadDir.startsWith('\\\\')) {
    return resolve(uploadDir);
  }
  if ((options.nodeEnv ?? process.env.NODE_ENV) === 'production') {
    return join(getDharaDataRoot(), 'Uploads');
  }
  return resolve(options.cwd ?? process.cwd(), uploadDir);
}
