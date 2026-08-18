import { readFileSync } from 'fs';
import { join } from 'path';

describe('PaymentsController authorization', () => {
  const source = readFileSync(join(__dirname, 'payments.controller.ts'), 'utf8');

  it('enforces payments.update on payment void', () => {
    expect(source).toContain("@Post(':id/void')");
    expect(source).toMatch(
      /@Post\(':id\/void'\)[\s\S]*?@RequirePermissions\('payments\.update'\)[\s\S]*?async void\(/,
    );
  });

  it('does not authorize void with invoices.update', () => {
    const voidBlock = source.slice(source.indexOf("@Post(':id/void')"));
    expect(voidBlock).not.toContain('invoices.update');
  });
});
