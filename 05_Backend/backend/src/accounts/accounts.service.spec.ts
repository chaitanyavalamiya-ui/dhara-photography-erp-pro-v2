import { readFileSync } from 'fs';
import { join } from 'path';
import { Test } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AccountsService read paths do not mutate payments', () => {
  const source = readFileSync(join(__dirname, 'accounts.service.ts'), 'utf8');

  it('does not call advance-payment backfill from dashboard or period summary', () => {
    expect(source).not.toContain('backfillAdvancePayments');
    expect(source).not.toContain('PaymentsService');
    expect(source).not.toContain('this.prisma.payment.create');
    expect(source).not.toContain('$transaction');
  });
});

describe('AccountsService.getDashboard', () => {
  let service: AccountsService;

  const mockPrisma = {
    invoice: { aggregate: jest.fn() },
    payment: { aggregate: jest.fn(), create: jest.fn() },
    expense: { aggregate: jest.fn() },
    album: { aggregate: jest.fn() },
    masterData: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.invoice.aggregate.mockResolvedValue({
      _sum: { totalAmount: 100000, outstandingAmount: 40000 },
    });
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 60000 } });
    mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 15000 } });
    mockPrisma.album.aggregate.mockResolvedValue({
      _sum: { albumPrice: 25000, vendorExpense: 8000 },
    });
    mockPrisma.masterData.findFirst.mockResolvedValue(null);

    const module = await Test.createTestingModule({
      providers: [AccountsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(AccountsService);
  });

  it('aggregates existing data without creating payment rows', async () => {
    const first = await service.getDashboard('company-1', 'user-1');
    const second = await service.getDashboard('company-1', 'user-1');

    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(first).toMatchObject({
      totalRevenue: 100000,
      amountReceived: 60000,
      outstandingAmount: 40000,
      totalExpenses: 15000,
      netProfit: 45000,
      totalAlbumOrderValue: 25000,
      totalAlbumVendorExpense: 8000,
      totalAlbumProfit: 17000,
    });
    expect(second).toEqual(first);
  });
});

describe('AccountsService.getPeriodSummary', () => {
  let service: AccountsService;

  const mockPrisma = {
    invoice: { aggregate: jest.fn() },
    payment: { aggregate: jest.fn(), create: jest.fn() },
    expense: { aggregate: jest.fn() },
    album: { aggregate: jest.fn() },
    booking: { count: jest.fn() },
    masterData: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.invoice.aggregate.mockResolvedValue({
      _sum: { totalAmount: 50000, outstandingAmount: 10000 },
    });
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 20000 } });
    mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });
    mockPrisma.album.aggregate.mockResolvedValue({
      _sum: { albumPrice: 0, vendorExpense: 0 },
    });
    mockPrisma.booking.count.mockResolvedValue(2);
    mockPrisma.masterData.findFirst.mockResolvedValue(null);

    const module = await Test.createTestingModule({
      providers: [AccountsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(AccountsService);
  });

  it('does not insert payments when reading a period summary twice', async () => {
    const query = { dateFrom: '2026-08-01', dateTo: '2026-08-31' };
    const first = await service.getPeriodSummary('company-1', 'user-1', query);
    const second = await service.getPeriodSummary('company-1', 'user-1', query);

    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(first).toMatchObject({
      totalInvoiceValue: 50000,
      amountReceived: 20000,
      outstandingAmount: 10000,
      totalExpenses: 5000,
      netProfit: 15000,
      bookingsCount: 2,
    });
    expect(second).toEqual(first);
  });
});
