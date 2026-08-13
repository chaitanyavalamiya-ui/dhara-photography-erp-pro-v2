import { readFileSync } from 'fs';
import { join } from 'path';

describe('SettingsController permission guards', () => {
  const source = readFileSync(join(__dirname, 'settings.controller.ts'), 'utf8');

  it('protects company profile and service-rate writes', () => {
    expect(source).toContain("@RequirePermissions('settings.read')");
    expect(source).toContain("@RequirePermissions('settings.update')");
    expect(source).toContain("@Patch('service-rates/:id')");
    expect(source).toContain("@Patch('company')");
  });
});
