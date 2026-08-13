import { readFileSync } from 'fs';
import { join } from 'path';

describe('Accounts and expenses permission guards', () => {
  it('requires accounts.read on accounts endpoints', () => {
    const source = readFileSync(join(__dirname, '../accounts/accounts.controller.ts'), 'utf8');
    expect(source).toContain("@RequirePermissions('accounts.read')");
    expect(source).not.toContain("@RequirePermissions('accounts.update')");
  });

  it('requires expenses.create/update and payments.create/update on mutations', () => {
    const expenses = readFileSync(join(__dirname, '../expenses/expenses.controller.ts'), 'utf8');
    const payments = readFileSync(join(__dirname, '../payments/payments.controller.ts'), 'utf8');
    expect(expenses).toContain("@RequirePermissions('expenses.create')");
    expect(expenses).toContain("@RequirePermissions('expenses.update')");
    expect(payments).toContain("@RequirePermissions('payments.create')");
    expect(payments).toContain("@RequirePermissions('payments.update')");
  });

  it('requires reports.read on reports endpoints', () => {
    const source = readFileSync(join(__dirname, '../reports/reports.controller.ts'), 'utf8');
    expect(source).toContain("@RequirePermissions('reports.read')");
  });
});
