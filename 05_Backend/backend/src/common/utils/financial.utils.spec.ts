import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import {
  allocateNextReceiptNumber,
  assertInvoiceTotalCoversPayments,
  INVOICE_TOTAL_BELOW_PAYMENTS_MESSAGE,
  isReceiptNumberUniqueConflict,
  attachChronologicalRunningBalances,
  computeNewestFirstRunningBalances,
  paginateNewestFirstRunningBalances,
  resolveReportDateRange,
  sortAccountLedgerNewestFirst,
  syncInvoiceAndBookingFinancials,
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

describe('chronological running balance for displayed transactions', () => {
  const at = (iso: string) => new Date(iso);

  function row(
    id: string,
    iso: string,
    type: 'income' | 'expense',
    amount: number,
  ) {
    return {
      id,
      date: at(iso),
      createdAt: at(iso),
      type,
      income: type === 'income' ? amount : 0,
      expense: type === 'expense' ? amount : 0,
    };
  }

  it('increases after income then decreases after expense', () => {
    const shuffled = [row('e1', '2026-08-02T10:00:00.000Z', 'expense', 200), row('i1', '2026-08-01T10:00:00.000Z', 'income', 1000)];
    const display = sortAccountLedgerNewestFirst(shuffled);
    expect(display.map((item) => item.id)).toEqual(['e1', 'i1']);
    expect(attachChronologicalRunningBalances(display)).toEqual([800, 1000]);
  });

  it('accumulates multiple incomes', () => {
    const display = sortAccountLedgerNewestFirst([
      row('i1', '2026-08-01T10:00:00.000Z', 'income', 100),
      row('i2', '2026-08-02T10:00:00.000Z', 'income', 50),
      row('i3', '2026-08-03T10:00:00.000Z', 'income', 25),
    ]);
    expect(attachChronologicalRunningBalances(display)).toEqual([175, 150, 100]);
  });

  it('accumulates multiple expenses from zero', () => {
    const display = sortAccountLedgerNewestFirst([
      row('e1', '2026-08-01T10:00:00.000Z', 'expense', 30),
      row('e2', '2026-08-02T10:00:00.000Z', 'expense', 20),
    ]);
    expect(attachChronologicalRunningBalances(display)).toEqual([-50, -30]);
  });

  it('keeps same-date transactions deterministic', () => {
    const date = at('2026-08-10T00:00:00.000Z');
    const createdAt = at('2026-08-10T09:00:00.000Z');
    const display = sortAccountLedgerNewestFirst([
      { id: 'exp-b', date, createdAt, type: 'expense' as const, income: 0, expense: 30 },
      { id: 'inc-a', date, createdAt, type: 'income' as const, income: 100, expense: 0 },
      { id: 'exp-a', date, createdAt, type: 'expense' as const, income: 0, expense: 20 },
    ]);
    expect(attachChronologicalRunningBalances(display)).toEqual([50, -50, -20]);
  });

  it('attaches chronological balances onto reverse-chronological display', () => {
    const shuffled = [
      row('i2', '2026-08-03T10:00:00.000Z', 'income', 40),
      row('e1', '2026-08-02T10:00:00.000Z', 'expense', 10),
      row('i1', '2026-08-01T10:00:00.000Z', 'income', 100),
    ];
    expect(attachChronologicalRunningBalances(shuffled)).toEqual([130, 90, 100]);
    const display = sortAccountLedgerNewestFirst(shuffled);
    expect(display.map((item) => item.id)).toEqual(['i2', 'e1', 'i1']);
    expect(attachChronologicalRunningBalances(display)).toEqual([130, 90, 100]);
  });

  it('returns an empty list for no transactions', () => {
    expect(attachChronologicalRunningBalances([])).toEqual([]);
  });

  it('recalculates running balance for a filtered income-only list', () => {
    const all = [
      row('i1', '2026-08-01T10:00:00.000Z', 'income', 1000),
      row('e1', '2026-08-02T10:00:00.000Z', 'expense', 400),
      row('i2', '2026-08-03T10:00:00.000Z', 'income', 200),
    ];
    const incomeOnly = sortAccountLedgerNewestFirst(all.filter((item) => item.type === 'income'));
    expect(attachChronologicalRunningBalances(incomeOnly)).toEqual([1200, 1000]);
  });

  it('reconciles the current dataset to Total Income − Total Expenses', () => {
    const dataset = [
      row('i1', '2026-08-01T09:00:00.000Z', 'income', 40000),
      row('e1', '2026-08-04T11:00:00.000Z', 'expense', 20000),
      row('i2', '2026-08-08T12:00:00.000Z', 'income', 25000),
      row('e2', '2026-08-12T15:00:00.000Z', 'expense', 15000),
      row('i3', '2026-08-16T08:00:00.000Z', 'income', 13101),
      row('e3', '2026-08-18T18:00:00.000Z', 'expense', 14112),
    ];
    const totalIncome = dataset.reduce((sum, item) => sum + item.income, 0);
    const totalExpense = dataset.reduce((sum, item) => sum + item.expense, 0);
    expect(totalIncome).toBe(78101);
    expect(totalExpense).toBe(49112);

    const display = sortAccountLedgerNewestFirst(dataset);
    const balances = attachChronologicalRunningBalances(display);
    expect(balances[0]).toBe(28989);
    expect(totalIncome - totalExpense).toBe(28989);
    expect(balances[0]).toBe(totalIncome - totalExpense);
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

describe('syncInvoiceAndBookingFinancials payment coverage', () => {
  const tx = {
    invoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      aggregate: jest.fn(),
    },
    booking: {
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.invoice.update.mockResolvedValue({});
    tx.booking.update.mockResolvedValue({});
  });

  it('rejects an invoice total below the active payment sum', async () => {
    tx.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      bookingId: 'bk-1',
      totalAmount: 4000,
      dueDate: null,
    });
    tx.payment.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });

    await expect(syncInvoiceAndBookingFinancials(tx as never, 'inv-1')).rejects.toThrow(
      INVOICE_TOTAL_BELOW_PAYMENTS_MESSAGE,
    );
    await expect(syncInvoiceAndBookingFinancials(tx as never, 'inv-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.invoice.update).not.toHaveBeenCalled();
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('syncs advance and balance when the invoice total covers active payments', async () => {
    tx.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      bookingId: 'bk-1',
      totalAmount: 10000,
      dueDate: null,
    });
    tx.payment.aggregate.mockResolvedValue({ _sum: { amount: 4000 } });

    await syncInvoiceAndBookingFinancials(tx as never, 'inv-1');

    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: expect.objectContaining({
        status: 'partially_paid',
      }),
    });
    expect(tx.booking.update).toHaveBeenCalledWith({
      where: { id: 'bk-1' },
      data: expect.objectContaining({}),
    });
  });

  it('treats equal total and payment sum as valid', () => {
    expect(() => assertInvoiceTotalCoversPayments(5000, 5000)).not.toThrow();
  });
});
