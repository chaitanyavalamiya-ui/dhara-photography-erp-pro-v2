import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveRepoRoot } from './app-paths';

describe('restore database safety snapshot', () => {
  it('dumps the current database before drop/create and recovers from that snapshot on failure', () => {
    const repoRoot = resolveRepoRoot();
    const common = readFileSync(join(repoRoot, '03_Database', 'scripts', 'backup-common.ps1'), 'utf8');
    const restore = readFileSync(join(repoRoot, '03_Database', 'scripts', 'restore-db.ps1'), 'utf8');

    expect(common).toContain('function New-DharaDatabaseSafetySnapshot');
    expect(common).toContain('function Restore-DharaDatabaseFromSqlDump');
    expect(common).toContain('Invoke-PgDumpSafe');

    const snapshotIndex = restore.indexOf('New-DharaDatabaseSafetySnapshot');
    const resetIndex = restore.indexOf('Reset-DharaDatabase');
    const recoverIndex = restore.indexOf('Restore-DharaDatabaseFromSqlDump');
    expect(snapshotIndex).toBeGreaterThan(0);
    expect(resetIndex).toBeGreaterThan(snapshotIndex);
    expect(recoverIndex).toBeGreaterThan(resetIndex);
    expect(restore).toContain('restore_failed_original_recovered');
    expect(restore).toContain('restore_failed_manual_recovery_required');
    expect(restore).toContain('restore_succeeded');
    expect(restore).toContain('$databaseReplaceStarted = $true');
  });
});
