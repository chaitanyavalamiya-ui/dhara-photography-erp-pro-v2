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

  it('protects GET packages with settings.read or booking create/update', () => {
    expect(source).toMatch(
      /@Get\('packages'\)\s+@RequireAnyPermissions\('settings\.read', 'bookings\.create', 'bookings\.update'\)/,
    );
    expect(source).not.toMatch(/@Get\('packages'\)\s+@ApiOperation/);
  });

  it('protects GET master-data with settings.read or expense/payment operational permissions', () => {
    expect(source).toMatch(
      /@Get\('master-data'\)\s+@RequireAnyPermissions\(\s*'settings\.read',\s*'expenses\.read',\s*'expenses\.create',\s*'expenses\.update',\s*'payments\.create',\s*\)/,
    );
    expect(source).not.toMatch(/@Get\('master-data'\)\s+@ApiOperation/);
  });

  it('keeps package and master-data writes on settings.update', () => {
    expect(source).toMatch(
      /@Post\('packages'\)\s+@RequirePermissions\('settings\.update'\)/,
    );
    expect(source).toMatch(
      /@Patch\('packages\/:id'\)\s+@RequirePermissions\('settings\.update'\)/,
    );
    expect(source).toMatch(
      /@Post\('master-data'\)\s+@RequirePermissions\('settings\.update'\)/,
    );
    expect(source).toMatch(
      /@Patch\('master-data\/:id'\)\s+@RequirePermissions\('settings\.update'\)/,
    );
  });
});
