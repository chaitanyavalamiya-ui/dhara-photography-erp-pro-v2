import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveRepoRoot } from './app-paths';

describe('backup archive format', () => {
  it('uses .NET ZipFile Zip64 instead of Compress-Archive', () => {
    const common = readFileSync(
      join(resolveRepoRoot(), '03_Database', 'scripts', 'backup-common.ps1'),
      'utf8',
    );
    expect(common).toContain('[System.IO.Compression.ZipFile]::CreateFromDirectory');
    expect(common).toContain('ZIP64');
    expect(common).not.toMatch(/^\s*Compress-Archive/m);
  });
});
