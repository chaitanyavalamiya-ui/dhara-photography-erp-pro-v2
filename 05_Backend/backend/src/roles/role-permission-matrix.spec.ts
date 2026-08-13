import { readFileSync } from 'fs';
import { join } from 'path';

describe('Role permission matrix', () => {
  const seed = readFileSync(
    join(__dirname, '../../../../03_Database/seeds/seed.ts'),
    'utf8',
  );

  it('defines Owner, Admin, Manager, Staff, and Viewer', () => {
    expect(seed).toContain("code: 'owner'");
    expect(seed).toContain("code: 'admin'");
    expect(seed).toContain("code: 'manager'");
    expect(seed).toContain("code: 'staff'");
    expect(seed).toContain("code: 'viewer'");
  });

  it('does not give Viewer create/update/archive/manage permissions', () => {
    const viewerBlock = seed.slice(seed.indexOf('viewer: [') , seed.indexOf('};', seed.indexOf('viewer: [')));
    expect(viewerBlock).not.toContain('.create');
    expect(viewerBlock).not.toContain('.update');
    expect(viewerBlock).not.toContain('.archive');
    expect(viewerBlock).not.toContain('users.manage');
    expect(viewerBlock).not.toContain('roles.manage');
    expect(viewerBlock).toContain('clients.read');
    expect(viewerBlock).toContain('accounts.read');
    expect(viewerBlock).toContain('reports.read');
  });

  it('gives Admin all permissions except roles.manage', () => {
    expect(seed).toContain("!p.code.startsWith('roles.manage')");
  });

  it('gives Staff create on clients/bookings/payments/expenses but not archive', () => {
    const staffBlock = seed.slice(seed.indexOf('staff: ['), seed.indexOf('viewer: ['));
    expect(staffBlock).toContain("'clients.create'");
    expect(staffBlock).toContain("'payments.create'");
    expect(staffBlock).toContain("'expenses.create'");
    expect(staffBlock).not.toContain('clients.archive');
    expect(staffBlock).not.toContain('users.manage');
  });
});
