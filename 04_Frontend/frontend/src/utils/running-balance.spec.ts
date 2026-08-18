import { describe, expect, it } from 'vitest';
import {
  attachChronologicalRunningBalances,
  computeNewestFirstRunningBalances,
  sortLedgerNewestFirst,
  withLedgerRunningBalances,
} from './running-balance';

describe('accounts transaction running balance', () => {
  it('verifies every running balance for mixed income, expense, and one staff payment', () => {
    const shuffled = [
      {
        id: 'staff-1',
        date: '2026-08-10T12:00:00.000Z',
        createdAt: '2026-08-10T12:00:00.000Z',
        type: 'expense' as const,
        income: 0,
        expense: 150,
        description: 'Staff Payment — Asha',
      },
      {
        id: 'income-2',
        date: '2026-08-10T16:00:00.000Z',
        createdAt: '2026-08-10T16:00:00.000Z',
        type: 'income' as const,
        income: 500,
        expense: 0,
        description: 'Payment RCPT-000002',
      },
      {
        id: 'income-1',
        date: '2026-08-10T08:00:00.000Z',
        createdAt: '2026-08-10T08:00:00.000Z',
        type: 'income' as const,
        income: 1000,
        expense: 0,
        description: 'Payment RCPT-000001',
      },
      {
        id: 'expense-2',
        date: '2026-08-10T18:00:00.000Z',
        createdAt: '2026-08-10T18:00:00.000Z',
        type: 'expense' as const,
        income: 0,
        expense: 50,
        description: 'Props',
      },
      {
        id: 'expense-1',
        date: '2026-08-10T10:00:00.000Z',
        createdAt: '2026-08-10T10:00:00.000Z',
        type: 'expense' as const,
        income: 0,
        expense: 200,
        description: 'Travel',
      },
    ];

    const entries = sortLedgerNewestFirst(shuffled);
    const staffRows = entries.filter((row) => row.description.startsWith('Staff Payment'));

    expect(staffRows).toHaveLength(1);
    expect(staffRows[0]?.type).toBe('expense');
    expect(staffRows[0]?.expense).toBe(150);
    expect(staffRows[0]?.income).toBe(0);
    expect(entries.filter((row) => row.type === 'expense')).toHaveLength(3);

    const runningBalances = computeNewestFirstRunningBalances(entries);

    expect(entries.map((row, index) => ({
      id: row.id,
      income: row.income,
      expense: row.expense,
      runningBalance: runningBalances[index],
    }))).toEqual([
      { id: 'expense-2', income: 0, expense: 50, runningBalance: 1100 },
      { id: 'income-2', income: 500, expense: 0, runningBalance: 1150 },
      { id: 'staff-1', income: 0, expense: 150, runningBalance: 650 },
      { id: 'expense-1', income: 0, expense: 200, runningBalance: 800 },
      { id: 'income-1', income: 1000, expense: 0, runningBalance: 1000 },
    ]);

    let previous = 0;
    [...entries].reverse().forEach((row, index) => {
      previous = Number((previous + row.income - row.expense).toFixed(2));
      expect([...runningBalances].reverse()[index]).toBe(previous);
    });

    const totalIncome = entries.reduce((sum, row) => sum + row.income, 0);
    const totalExpense = entries.reduce((sum, row) => sum + row.expense, 0);
    expect(totalIncome).toBe(1500);
    expect(totalExpense).toBe(400);
    expect(runningBalances[0]).toBe(totalIncome - totalExpense);
  });
});

describe('chronological running balance for displayed transactions', () => {
  function row(
    id: string,
    date: string,
    type: 'income' | 'expense',
    amount: number,
  ) {
    return {
      id,
      date,
      createdAt: date,
      type,
      income: type === 'income' ? amount : 0,
      expense: type === 'expense' ? amount : 0,
    };
  }

  it('increases after income then decreases after expense', () => {
    const display = sortLedgerNewestFirst([
      row('e1', '2026-08-02T10:00:00.000Z', 'expense', 200),
      row('i1', '2026-08-01T10:00:00.000Z', 'income', 1000),
    ]);
    expect(attachChronologicalRunningBalances(display)).toEqual([800, 1000]);
  });

  it('accumulates multiple incomes', () => {
    const display = sortLedgerNewestFirst([
      row('i1', '2026-08-01T10:00:00.000Z', 'income', 100),
      row('i2', '2026-08-02T10:00:00.000Z', 'income', 50),
      row('i3', '2026-08-03T10:00:00.000Z', 'income', 25),
    ]);
    expect(attachChronologicalRunningBalances(display)).toEqual([175, 150, 100]);
  });

  it('accumulates multiple expenses from zero', () => {
    const display = sortLedgerNewestFirst([
      row('e1', '2026-08-01T10:00:00.000Z', 'expense', 30),
      row('e2', '2026-08-02T10:00:00.000Z', 'expense', 20),
    ]);
    expect(attachChronologicalRunningBalances(display)).toEqual([-50, -30]);
  });

  it('keeps same-date transactions deterministic', () => {
    const date = '2026-08-10T00:00:00.000Z';
    const createdAt = '2026-08-10T09:00:00.000Z';
    const display = sortLedgerNewestFirst([
      { id: 'exp-b', date, createdAt, type: 'expense' as const, income: 0, expense: 30 },
      { id: 'inc-a', date, createdAt, type: 'income' as const, income: 100, expense: 0 },
      { id: 'exp-a', date, createdAt, type: 'expense' as const, income: 0, expense: 20 },
    ]);
    expect(attachChronologicalRunningBalances(display)).toEqual([50, -50, -20]);
  });

  it('attaches chronological balances onto reverse-chronological display', () => {
    const unordered = [
      row('i1', '2026-08-01T10:00:00.000Z', 'income', 100),
      row('i2', '2026-08-03T10:00:00.000Z', 'income', 40),
      row('e1', '2026-08-02T10:00:00.000Z', 'expense', 10),
    ];
    expect(attachChronologicalRunningBalances(unordered)).toEqual([100, 130, 90]);

    const display = sortLedgerNewestFirst(unordered);
    expect(display.map((item) => item.id)).toEqual(['i2', 'e1', 'i1']);
    expect(attachChronologicalRunningBalances(display)).toEqual([130, 90, 100]);
  });

  it('returns an empty list for no transactions', () => {
    expect(attachChronologicalRunningBalances([])).toEqual([]);
    expect(withLedgerRunningBalances([])).toEqual([]);
  });

  it('recalculates running balance for a filtered income-only list', () => {
    const all = [
      row('i1', '2026-08-01T10:00:00.000Z', 'income', 1000),
      row('e1', '2026-08-02T10:00:00.000Z', 'expense', 400),
      row('i2', '2026-08-03T10:00:00.000Z', 'income', 200),
    ];
    const incomeOnly = sortLedgerNewestFirst(all.filter((item) => item.type === 'income'));
    expect(attachChronologicalRunningBalances(incomeOnly)).toEqual([1200, 1000]);
  });

  it('recalculates running balance after a voided income is removed from the list', () => {
    const remaining = sortLedgerNewestFirst([
      row('i1', '2026-08-01T09:00:00.000Z', 'income', 40000),
      row('e1', '2026-08-04T11:00:00.000Z', 'expense', 20000),
    ]);
    const balances = attachChronologicalRunningBalances(remaining);
    expect(balances[0]).toBe(20000);
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

    const display = withLedgerRunningBalances(sortLedgerNewestFirst(dataset));
    expect(display[0]?.runningBalance).toBe(28989);
    expect(totalIncome - totalExpense).toBe(28989);
  });
});
