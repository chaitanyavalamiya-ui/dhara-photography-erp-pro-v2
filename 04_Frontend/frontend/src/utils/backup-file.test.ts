import { afterEach, describe, expect, it, vi } from 'vitest';
import { backupFileNameFromPath, triggerBackupFileDownload } from './backup-file';

describe('backup-file', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('extracts the ZIP name from a Windows backup path', () => {
    expect(backupFileNameFromPath('C:\\Backups\\dhara_erp_20260101.zip')).toBe(
      'dhara_erp_20260101.zip',
    );
  });

  it('triggers a browser download for a backup blob', () => {
    const createObjectURL = vi.fn(() => 'blob:backup');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    triggerBackupFileDownload(new Blob(['zip']), 'dhara_erp.zip');

    expect(createObjectURL).toHaveBeenCalled();
  });
});
