import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveRepoRoot } from './app-paths';

describe('backup-uploads swap strategy', () => {
  it('copies to uploads.incoming before renaming the live folder', () => {
    const common = readFileSync(
      join(resolveRepoRoot(), '03_Database', 'scripts', 'backup-common.ps1'),
      'utf8',
    );
    const incomingIndex = common.indexOf('Copy-Item -Path $BackupUploads -Destination $incoming');
    const renameLiveIndex = common.indexOf('Rename-Item -Path $UploadsTarget -NewName (Split-Path $previous -Leaf)');
    const completeAfterVerify = common.indexOf('Complete-DharaUploadsSwap');
    expect(incomingIndex).toBeGreaterThan(0);
    expect(renameLiveIndex).toBeGreaterThan(incomingIndex);
    expect(common).toContain('function Undo-DharaUploadsSwap');
    expect(completeAfterVerify).toBeGreaterThan(0);
  });
});
