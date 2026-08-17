import { readFileSync } from 'fs';
import { join } from 'path';

describe('ClientsController restore endpoint', () => {
  const source = readFileSync(join(__dirname, 'clients.controller.ts'), 'utf8');

  it('exposes POST /clients/:id/restore protected by clients.archive', () => {
    expect(source).toContain("@Post(':id/restore')");
    expect(source).toContain("@RequirePermissions('clients.archive')");
    expect(source).toContain('async restore(');
  });

  it('delegates archive to ClientsService', () => {
    expect(source).toContain('this.clientsService.archive(');
    expect(source).toContain("@RequirePermissions('clients.update')");
    expect(source).toContain("@RequirePermissions('clients.create')");
    expect(source).toContain("@RequirePermissions('clients.read')");
  });
});
