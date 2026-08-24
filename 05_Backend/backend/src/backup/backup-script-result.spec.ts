import { normalizeBackupScriptResult } from './backup-script-result';

describe('normalizeBackupScriptResult', () => {
  it('maps PowerShell PascalCase backup fields to camelCase', () => {
    const result = normalizeBackupScriptResult({
      Success: true,
      BackupFile: 'C:\\Backups\\dhara_erp.zip',
      SizeBytes: 4096,
      Message: 'ok',
    });

    expect(result.success).toBe(true);
    expect(result.backupFile).toBe('C:\\Backups\\dhara_erp.zip');
    expect(result.sizeBytes).toBe(4096);
    expect(result.message).toBe('ok');
  });
});
