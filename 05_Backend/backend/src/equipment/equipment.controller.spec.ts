import { readFileSync } from 'fs';
import { join } from 'path';

describe('EquipmentController permissions', () => {
  const source = readFileSync(join(__dirname, 'equipment.controller.ts'), 'utf8');

  it('requires equipment.read on queries and specialized permissions on mutations', () => {
    expect(source).toContain("@RequirePermissions('equipment.read')");
    expect(source).toContain("@RequirePermissions('equipment.write')");
    expect(source).toContain("@RequirePermissions('equipment.issue')");
    expect(source).toContain("@RequirePermissions('equipment.return')");
  });
});
