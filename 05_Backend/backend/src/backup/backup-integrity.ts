import { createHash } from 'crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export const BACKUP_FORMAT_VERSION = '1.0';
export const BACKUP_APPLICATION_NAME = 'Dhara Photography ERP Pro';

export interface BackupManifest {
  applicationName: string;
  backupFormatVersion: string;
  createdAt: string;
  databaseName: string;
  schemas?: string[];
  uploadFileCount: number;
  checksumAlgorithm: string;
  checksumsFile: string;
  checksumsSha256: string;
}

export function sha256File(filePath: string): string {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

export function listFilesRecursive(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const results: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results.sort();
}

export function parseChecksumsFile(contents: string): Array<{ hash: string; relativePath: string }> {
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([a-fA-F0-9]{64})\s{2}(.+)$/);
      if (!match) {
        throw new Error('Checksum file is invalid.');
      }
      return { hash: match[1].toLowerCase(), relativePath: match[2].trim() };
    });
}

export function validateBackupPayload(stagingDir: string): BackupManifest {
  const databaseSql = join(stagingDir, 'database.sql');
  const manifestPath = join(stagingDir, 'manifest.json');
  const checksumsFile = join(stagingDir, 'checksums.sha256');
  const uploadsDir = join(stagingDir, 'uploads');

  if (!existsSync(databaseSql) || !statSync(databaseSql).isFile()) {
    throw new Error('Backup is missing database.sql');
  }
  if (!existsSync(manifestPath)) {
    throw new Error('Backup is missing manifest.json');
  }
  if (!existsSync(checksumsFile)) {
    throw new Error('Backup is missing checksums.sha256');
  }
  if (!existsSync(uploadsDir) || !statSync(uploadsDir).isDirectory()) {
    throw new Error('Backup is missing uploads/ folder');
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as BackupManifest;
  if (manifest.applicationName !== BACKUP_APPLICATION_NAME) {
    throw new Error('Backup manifest application name is invalid.');
  }
  if (!manifest.backupFormatVersion) {
    throw new Error('Backup manifest is missing backupFormatVersion.');
  }
  if (!manifest.databaseName) {
    throw new Error('Backup manifest is missing database name.');
  }
  if (manifest.checksumAlgorithm !== 'SHA-256') {
    throw new Error('Unsupported checksum algorithm.');
  }

  const checksumsHash = sha256File(checksumsFile);
  if (manifest.checksumsSha256.toLowerCase() !== checksumsHash) {
    throw new Error('checksums.sha256 integrity check failed.');
  }

  const checksums = parseChecksumsFile(readFileSync(checksumsFile, 'utf8'));
  for (const entry of checksums) {
    const full = join(stagingDir, ...entry.relativePath.split('/'));
    if (!existsSync(full)) {
      throw new Error(`Backup file listed in checksums is missing: ${entry.relativePath}`);
    }
    if (sha256File(full) !== entry.hash) {
      throw new Error(`Checksum mismatch for ${entry.relativePath}`);
    }
  }

  const uploadCount = listFilesRecursive(uploadsDir).length;
  if (uploadCount !== Number(manifest.uploadFileCount)) {
    throw new Error('Upload file count does not match the manifest.');
  }

  return manifest;
}
