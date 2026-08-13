import { readFileSync } from 'fs';
import { join } from 'path';

describe('UsersController unlock endpoint', () => {
  const source = readFileSync(join(__dirname, 'users.controller.ts'), 'utf8');

  it('exposes POST /users/:id/unlock protected by users.manage', () => {
    expect(source).toContain("@Post(':id/unlock')");
    expect(source).toContain("@RequirePermissions('users.manage')");
    expect(source).toContain('async unlock(');
  });
});
