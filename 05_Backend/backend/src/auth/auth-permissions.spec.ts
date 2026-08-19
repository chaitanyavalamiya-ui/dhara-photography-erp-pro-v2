import { extractPermissions, isCompanyAccessActive, isUserAccessActive } from './auth-permissions';

describe('auth-permissions', () => {
  it('extracts only granted and active permission codes', () => {
    expect(
      extractPermissions([
        {
          role: {
            permissions: [
              { isGranted: true, permission: { code: 'users.read', isActive: true } },
              { isGranted: true, permission: { code: 'users.update', isActive: false } },
              { isGranted: false, permission: { code: 'users.archive', isActive: true } },
            ],
          },
        },
      ]),
    ).toEqual(['users.read']);
  });

  it('treats inactive or archived company/user access as inactive', () => {
    expect(isCompanyAccessActive({ isActive: true, archivedAt: null })).toBe(true);
    expect(isCompanyAccessActive({ isActive: false, archivedAt: null })).toBe(false);
    expect(isCompanyAccessActive({ isActive: true, archivedAt: new Date() })).toBe(false);
    expect(isUserAccessActive(null)).toBe(false);
    expect(isUserAccessActive({ isActive: true, archivedAt: null })).toBe(true);
  });
});
