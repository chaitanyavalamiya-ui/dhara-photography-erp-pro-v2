import { Prisma } from '@prisma/client';
import {
  allocateNextReceiptNumber,
  isReceiptNumberUniqueConflict,
  computeNewestFirstRunningBalances,
  paginateNewestFirstRunningBalances,
  resolveReportDateRange,
  sortAccountLedgerNewestFirst,
} from './financial.utils';

describe('financial.utils receipt numbers', () => {
  it('allocates RCPT-000001 then increments the suffix', () => {
    expect(allocateNextReceiptNumber(null)).toBe('RCPT-000001');
    expect(allocateNextReceiptNumber('RCPT-000009')).toBe('RCPT-000010');
  });

  it('detects receipt number unique conflicts', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['company_id', 'receipt_number'] },
    });
    expect(isReceiptNumberUniqueConflict(error)).toBe(true);
    expect(isReceiptNumberUniqueConflict(new Error('nope'))).toBe(false);
  });
});

describe('account ledger running balances', () => {
  it('starts page 1 at period net and walks backward', () => {
    const entries = [
      { income: 100, expense: 0 },
      { income: 50, expense: 0 },
      { income: 0, expense: 30 },
    ];
    expect(paginateNewestFirstRunningBalances(entries, 1, 10)).toEqual([120, 20, -30]);
  });

  it('continues the running balance across pages', () => {
    const entries = [
      { income: 100, expense: 0 },
      { income: 50, expense: 0 },
      { income: 0, expense: 30 },
    ];
    expect(paginateNewestFirstRunningBalances(entries, 2, 1)).toEqual([20]);
  });

  it('computes every running balance for mixed income, expense, and a single staff payment', () => {
    const day = (hour: number) => new Date(`2026-08-10T${String(hour).padStart(2, '0')}:00:00.000Z`);

    const shuffled = [
      {
        id: 'staff-1',
        date: day(12),
        createdAt: day(12),
        type: 'expense' as const,
        income: 0,
        expense: 150,
        description: 'Staff Payment — Asha',
      },
      {
        id: 'income-2',
        date: day(16),
        createdAt: day(16),
        type: 'income' as const,
        income: 500,
        expense: 0,
        description: 'Payment RCPT-000002',
      },
      {
        id: 'income-1',
        date: day(8),
        createdAt: day(8),
        type: 'income' as const,
        income: 1000,
        expense: 0,
        description: 'Payment RCPT-000001',
      },
      {
        id: 'expense-2',
        date: day(18),
        createdAt: day(18),
        type: 'expense' as const,
        income: 0,
        expense: 50,
        description: 'Props',
      },
      {
        id: 'expense-1',
        date: day(10),
        createdAt: day(10),
        type: 'expense' as const,
        income: 0,
        expense: 200,
        description: 'Travel',
      },
    ];

    const entries = sortAccountLedgerNewestFirst(shuffled);

    expect(entries.map((row) => row.id)).toEqual([
      'expense-2',
      'income-2',
      'staff-1',
      'expense-1',
      'income-1',
    ]);
    expect(entries.filter((row) => row.description.startsWith('Staff Payment'))).toHaveLength(1);
    expect(entries.filter((row) => row.type === 'expense')).toHaveLength(3);

    const runningBalances = computeNewestFirstRunningBalances(entries);

    expect(runningBalances).toEqual([1100, 1150, 650, 800, 1000]);

    const chronological = [...entries].reverse();
    const chronologicalBalances = [...runningBalances].reverse();
    let previous = 0;
    chronological.forEach((row, index) => {
      previous = Number((previous + row.income - row.expense).toFixed(2));
      expect(chronologicalBalances[index]).toBe(previous);
    });

    expect(paginateNewestFirstRunningBalances(entries, 2, 2)).toEqual([650, 800]);
  });

  it('keeps same-day order deterministic by createdAt, type, and id', () => {
    const date = new Date('2026-08-10T00:00:00.000Z');
    const createdAt = new Date('2026-08-10T09:00:00.000Z');

    const entries = sortAccountLedgerNewestFirst([
      { id: 'exp-b', date, createdAt, type: 'expense' as const, income: 0, expense: 30 },
      { id: 'inc-a', date, createdAt, type: 'income' as const, income: 100, expense: 0 },
      { id: 'exp-a', date, createdAt, type: 'expense' as const, income: 0, expense: 20 },
    ]);

    expect(entries.map((row) => row.id)).toEqual(['inc-a', 'exp-b', 'exp-a']);
    expect(computeNewestFirstRunningBalances(entries)).toEqual([50, -50, -20]);
  });
});

describe('resolveReportDateRange studio timezone', () => {
  it('uses Asia/Kolkata for today when UTC is still the previous date', () => {
    const now = new Date('2026-08-16T20:00:00.000Z');
    const range = resolveReportDateRange('today', undefined, undefined, now);

    expect(range.dateFrom).toBe('2026-08-17');
    expect(range.dateTo).toBe('2026-08-17');
  });
});
