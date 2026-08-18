import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { AuditService } from '../audit/audit.service';
import {
  assertBackupDirOutsideApp,
  expandWindowsEnvPath,
  getDefaultBackupDir,
  getPathsConfigFile,
  RESTORE_CONFIRM_PHRASE,
  resolveRepoRoot,
  confineBackupBrowsePath,
  resolveSafeBackupZip,
} from './app-paths';
import { isSuccessfulRestore, restoreFailureUserMessage } from './restore-outcomes';

export interface BackupScriptResult {
  success?: boolean;
  message?: string;
  backupFile?: string;
  sizeBytes?: number;
  createdAt?: string;
  uploadFileCount?: number;
  databaseName?: string;
  backupFormatVersion?: string;
  integrity?: string;
  valid?: boolean;
  applicationName?: string;
  warning?: string;
  confirmPhrase?: string;
  verified?: boolean;
  outcome?: string;
  originalDatabaseRecovered?: boolean;
  safetySnapshotPath?: string;
}

@Injectable()
export class BackupService {
  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  getLocation(repoRoot = resolveRepoRoot()): { backupDir: string; defaultBackupDir: string } {
    return {
      backupDir: this.resolveBackupDir(repoRoot),
      defaultBackupDir: getDefaultBackupDir(),
    };
  }

  setLocation(
    backupDir: string,
    repoRoot = resolveRepoRoot(),
  ): { backupDir: string; defaultBackupDir: string } {
    const resolved = resolve(expandWindowsEnvPath(backupDir.trim()));
    try {
      assertBackupDirOutsideApp(resolved, repoRoot);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    const configFile = getPathsConfigFile();
    mkdirSync(dirname(configFile), { recursive: true });
    writeFileSync(configFile, JSON.stringify({ backupDir: resolved }, null, 2), 'utf8');
    return this.getLocation(repoRoot);
  }

  listHistory(repoRoot = resolveRepoRoot()): Array<{
    fileName: string;
    path: string;
    sizeBytes: number;
    modifiedAt: string;
    status: string;
  }> {
    const backupDir = this.resolveBackupDir(repoRoot);
    if (!existsSync(backupDir)) {
      return [];
    }

    return readdirSync(backupDir)
      .map((fileName) => {
        try {
          const path = resolveSafeBackupZip(join(backupDir, fileName), backupDir);
          const stat = statSync(path);
          return {
            fileName,
            path,
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            status: 'available',
          };
        } catch {
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  }

  async createBackup(
    companyId: string,
    actorUserId: string,
    ipAddress?: string,
  ): Promise<BackupScriptResult> {
    const result = await this.runScript('backup-db.ps1', ['-JsonOutput']);
    if (!result.success) {
      throw new BadRequestException(result.message || 'Backup failed.');
    }

    await this.auditService.log({
      companyId,
      actorUserId,
      module: 'settings',
      action: 'backup_create',
      recordType: 'backup',
      recordId: result.backupFile ?? 'backup',
      newValue: {
        sizeBytes: result.sizeBytes,
        uploadFileCount: result.uploadFileCount,
      },
      ipAddress,
    });

    return result;
  }

  async previewRestore(backupFile: string): Promise<BackupScriptResult> {
    const safePath = this.assertBackupFile(backupFile);
    const result = await this.runScript('restore-db.ps1', [
      '-JsonOutput',
      '-ValidateOnly',
      '-BackupFile',
      safePath,
    ]);
    if (!result.success && result.valid !== true) {
      throw new BadRequestException(result.message || 'Backup validation failed.');
    }
    return result;
  }

  async restoreBackup(
    companyId: string,
    actorUserId: string,
    backupFile: string,
    confirmPhrase: string,
    ipAddress?: string,
  ): Promise<BackupScriptResult> {
    if (confirmPhrase !== RESTORE_CONFIRM_PHRASE) {
      throw new BadRequestException('Restore confirmation phrase did not match.');
    }

    const safePath = this.assertBackupFile(backupFile);
    const result = await this.runScript('restore-db.ps1', [
      '-JsonOutput',
      '-SkipPrompt',
      '-ConfirmPhrase',
      RESTORE_CONFIRM_PHRASE,
      '-BackupFile',
      safePath,
    ]);
    if (!isSuccessfulRestore(result)) {
      throw new BadRequestException(
        this.sanitizeError(restoreFailureUserMessage(result) || 'Restore failed.'),
      );
    }

    await this.auditService.log({
      companyId,
      actorUserId,
      module: 'settings',
      action: 'backup_restore',
      recordType: 'backup',
      recordId: safePath,
      newValue: {
        verified: result.verified,
        uploadFileCount: result.uploadFileCount,
        outcome: result.outcome,
      },
      ipAddress,
    });

    return result;
  }

  async browseBackupFile(): Promise<{ path: string | null }> {
    const script = join(resolveRepoRoot(), '03_Database', 'scripts', 'select-backup.ps1');
    if (!existsSync(script)) {
      throw new BadRequestException('Backup file picker is not available.');
    }
    const result = await this.runScript('select-backup.ps1', ['-JsonOutput']);
    try {
      return {
        path: confineBackupBrowsePath(
          result.backupFile ?? null,
          this.resolveBackupDir(resolveRepoRoot()),
        ),
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  private resolveBackupDir(repoRoot: string): string {
    const fromEnv = this.configService.get<string>('BACKUP_DIR')?.trim();
    if (fromEnv) {
      const resolved = resolve(expandWindowsEnvPath(fromEnv));
      assertBackupDirOutsideApp(resolved, repoRoot);
      return resolved;
    }

    const configFile = getPathsConfigFile();
    if (existsSync(configFile)) {
      try {
        const parsed = JSON.parse(readFileSync(configFile, 'utf8')) as { backupDir?: string };
        if (parsed.backupDir) {
          const resolved = resolve(expandWindowsEnvPath(parsed.backupDir));
          assertBackupDirOutsideApp(resolved, repoRoot);
          return resolved;
        }
      } catch {
        // fall through to default
      }
    }

    const fallback = getDefaultBackupDir();
    assertBackupDirOutsideApp(fallback, repoRoot);
    return fallback;
  }

  private assertBackupFile(backupFile: string): string {
    try {
      return resolveSafeBackupZip(backupFile, this.resolveBackupDir(resolveRepoRoot()));
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  private runScript(scriptName: string, args: string[]): Promise<BackupScriptResult> {
    const repoRoot = resolveRepoRoot();
    const script = join(repoRoot, '03_Database', 'scripts', scriptName);
    const envFile = join(repoRoot, '.env');

    return new Promise((resolvePromise, reject) => {
      const child = spawn(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-EnvFile', envFile, ...args],
        {
          cwd: repoRoot,
          windowsHide: true,
        },
      );

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });
      child.on('error', reject);
      child.on('close', (code) => {
        const jsonText = this.extractJson(stdout);
        if (!jsonText) {
          reject(new BadRequestException(this.sanitizeError(stderr || 'Backup script produced no result.')));
          return;
        }
        try {
          const parsed = JSON.parse(jsonText) as BackupScriptResult;
          if (code !== 0 && parsed.success === false) {
            resolvePromise(parsed);
            return;
          }
          resolvePromise(parsed);
        } catch {
          reject(new BadRequestException(this.sanitizeError(stderr || 'Backup script returned invalid JSON.')));
        }
      });
    });
  }

  private extractJson(stdout: string): string | null {
    const trimmed = stdout.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    return trimmed.slice(start, end + 1);
  }

  private sanitizeError(message: string): string {
    return message
      .replace(/postgresql:\/\/[^@\s]+@/gi, 'postgresql://****@')
      .replace(/Password=[^\s;]+/gi, 'Password=****')
      .replace(/PGPASSWORD[^\s]*/gi, 'PGPASSWORD=****');
  }
}
