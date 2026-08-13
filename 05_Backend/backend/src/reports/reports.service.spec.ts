import { readFileSync } from 'fs';
import { join } from 'path';

describe('ReportsService uses accounts calculations', () => {
  const source = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8');

  it('reuses accounts period summary for dashboard, overview, and profit', () => {
    expect(source).toContain('this.accountsService.getPeriodSummary');
    expect(source).toContain('this.accountsService.getProfitLoss');
    expect(source).toContain('this.accountsService.getIncome');
    expect(source).toContain('this.accountsService.getTransactions');
  });

  it('excludes cancelled bookings from report occupancy filters', () => {
    expect(source).toContain('REPORT_BOOKING_FILTER');
    expect(source).not.toContain('ACTIVE_BOOKING_FILTER');
  });
});
