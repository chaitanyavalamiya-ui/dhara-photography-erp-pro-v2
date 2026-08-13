import { existsSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';

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
