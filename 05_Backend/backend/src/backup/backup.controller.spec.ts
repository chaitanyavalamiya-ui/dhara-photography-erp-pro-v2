import { readFileSync } from 'fs';
import { join } from 'path';

describe('BackupController authorization', () => {
  const source = readFileSync(join(__dirname, 'backup.controller.ts'), 'utf8');

  it('protects backup and restore mutations with settings.update', () => {
    expect(source).toContain("@Controller('settings/backup')");
    expect(source).toContain("@RequirePermissions('settings.update')");
    expect(source).toContain("@Post('restore')");
    expect(source).toContain("@Post()");
  });

  it('allows settings.read for location and history', () => {
    expect(source).toContain("@Get('location')");
    expect(source).toContain("@Get('history')");
    expect(source).toContain("@RequirePermissions('settings.read')");
  });
});
