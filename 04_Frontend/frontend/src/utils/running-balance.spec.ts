import { describe, expect, it } from 'vitest';
import {
  computeNewestFirstRunningBalances,
  sortLedgerNewestFirst,
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
