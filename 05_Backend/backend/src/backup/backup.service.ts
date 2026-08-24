import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertBackupDirOutsideApp,
  BACKUP_FILE_REQUIRED_MESSAGE,
  confineBackupBrowsePath,
  expandWindowsEnvPath,
  getDefaultBackupDir,
  getPathsConfigFile,
  RESTORE_CONFIRM_PHRASE,
  resolveRepoRoot,
  resolveSafeBackupZip,
} from './app-paths';
import { isSuccessfulRestore, restoreFailureUserMessage } from './restore-outcomes';
import { BackupScriptResult, normalizeBackupScriptResult } from './backup-script-result';

export type { BackupScriptResult } from './backup-script-result';

@Injectable()
export class BackupService {
  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
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
      recordId: randomUUID(),
      newValue: {
        backupFile: result.backupFile,
        sizeBytes: result.sizeBytes,
        uploadFileCount: result.uploadFileCount,
      },
      ipAddress,
    });

    return result;
  }

  getDownloadPath(backupFile: string): string {
    return this.assertBackupFile(backupFile);
  }

  saveUploadedBackup(file?: Express.Multer.File): { path: string; fileName: string } {
    if (!file?.path || !existsSync(file.path)) {
      throw new BadRequestException(BACKUP_FILE_REQUIRED_MESSAGE);
    }

    const originalName = basename(file.originalname || '').trim();
    if (!originalName.toLowerCase().endsWith('.zip')) {
      throw new BadRequestException(BACKUP_FILE_REQUIRED_MESSAGE);
    }

    const backupDir = this.resolveBackupDir(resolveRepoRoot());
    mkdirSync(backupDir, { recursive: true });

    const safeBase = originalName.replace(/[^\w.\-]+/g, '_');
    const dest = join(backupDir, `uploaded_${Date.now()}_${safeBase}`);
    try {
      renameSync(file.path, dest);
    } catch {
      copyFileSync(file.path, dest);
      unlinkSync(file.path);
    }

    const path = this.assertBackupFile(dest);
    return { path, fileName: basename(path) };
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

    await this.assertOwnerCanRestore(companyId, actorUserId);

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
      recordId: randomUUID(),
      newValue: {
        backupFile: safePath,
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
          const parsed = normalizeBackupScriptResult(JSON.parse(jsonText));
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

  private async assertOwnerCanRestore(companyId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId, isActive: true, archivedAt: null },
      select: {
        userRoles: {
          select: { role: { select: { code: true } } },
        },
      },
    });

    const isOwner = Boolean(user?.userRoles.some((assignment) => assignment.role.code === 'owner'));
    if (!isOwner) {
      throw new ForbiddenException('Only the studio owner can restore a backup.');
    }
  }
}
