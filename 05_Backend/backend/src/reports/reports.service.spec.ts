import { readFileSync } from 'fs';
import { join } from 'path';
import { Test } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { REPORT_BOOKING_FILTER } from '../common/utils/financial.utils';

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

describe('ReportsService.getOverview', () => {
  let service: ReportsService;

  const mockPrisma = {
    booking: { aggregate: jest.fn() },
  };

  const mockAccounts = {
    getPeriodSummary: jest.fn(),
  };

  const period = {
    preset: 'this_month',
    label: 'This Month',
    dateFrom: '2026-08-01',
    dateTo: '2026-08-31',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountsService, useValue: mockAccounts },
      ],
    }).compile();
    service = module.get(ReportsService);
  });

  it('maps Accounts album fields onto overview without recomputing profit', async () => {
    mockAccounts.getPeriodSummary.mockResolvedValue({
      period,
      totalInvoiceValue: 100000,
      amountReceived: 80000,
      outstandingAmount: 20000,
      totalExpenses: 30000,
      staffPayments: 5000,
      netProfit: 50000,
      albumOrderValue: 25000,
      albumVendorExpense: 8000,
      albumProfit: 99999,
      bookingsCount: 4,
    });
    mockPrisma.booking.aggregate.mockResolvedValue({
      _sum: { totalAmount: 120000 },
    });

    const query = { preset: 'this_month' as const };
    const result = await service.getOverview('company-1', 'user-1', query);

    expect(mockAccounts.getPeriodSummary).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      query,
    );
    expect(result.albumSales).toBe(25000);
    expect(result.albumVendorExpenses).toBe(8000);
    expect(result.albumProfit).toBe(99999);
    expect(result.netProfit).toBe(50000);
    expect(result.totalBookingValue).toBe(120000);
    expect(result.albumProfit).not.toBe(25000 - 8000);
  });

  it('scopes booking occupancy to the company and excludes cancelled bookings', async () => {
    mockAccounts.getPeriodSummary.mockResolvedValue({
      period,
      totalInvoiceValue: 0,
      amountReceived: 0,
      outstandingAmount: 0,
      totalExpenses: 0,
      staffPayments: 0,
      netProfit: 0,
      albumOrderValue: 0,
      albumVendorExpense: 0,
      albumProfit: 0,
      bookingsCount: 0,
    });
    mockPrisma.booking.aggregate.mockResolvedValue({ _sum: { totalAmount: 0 } });

    await service.getOverview('company-1', 'user-1', { preset: 'this_month' });

    expect(mockPrisma.booking.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          ...REPORT_BOOKING_FILTER,
        }),
      }),
    );
    const where = mockPrisma.booking.aggregate.mock.calls[0][0].where;
    expect(where.status).toEqual({ code: { not: 'cancelled' } });
    expect(where.archivedAt).toBeNull();
    expect(where.isActive).toBe(true);
    expect(where.companyId).not.toBe('company-2');
  });
});
