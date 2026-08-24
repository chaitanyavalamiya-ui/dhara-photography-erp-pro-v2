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

function pickField(parsed: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(parsed, name) && parsed[name] !== undefined) {
      return parsed[name];
    }
  }

  const byLower = new Map(Object.entries(parsed).map(([key, value]) => [key.toLowerCase(), value]));
  for (const name of names) {
    if (byLower.has(name.toLowerCase())) {
      return byLower.get(name.toLowerCase());
    }
  }

  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function normalizeBackupScriptResult(parsed: unknown): BackupScriptResult {
  const record = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};

  return {
    ...(record as BackupScriptResult),
    success: asBoolean(pickField(record, 'success')),
    backupFile: asString(pickField(record, 'backupFile')),
    sizeBytes: asNumber(pickField(record, 'sizeBytes')),
    createdAt: asString(pickField(record, 'createdAt')),
    uploadFileCount: asNumber(pickField(record, 'uploadFileCount')),
    databaseName: asString(pickField(record, 'databaseName')),
    backupFormatVersion: asString(pickField(record, 'backupFormatVersion')),
    integrity: asString(pickField(record, 'integrity')),
    valid: asBoolean(pickField(record, 'valid')),
    applicationName: asString(pickField(record, 'applicationName')),
    warning: asString(pickField(record, 'warning')),
    confirmPhrase: asString(pickField(record, 'confirmPhrase')),
    verified: asBoolean(pickField(record, 'verified')),
    outcome: asString(pickField(record, 'outcome')),
    originalDatabaseRecovered: asBoolean(pickField(record, 'originalDatabaseRecovered')),
    safetySnapshotPath: asString(pickField(record, 'safetySnapshotPath')),
    message: asString(pickField(record, 'message')),
  };
}
