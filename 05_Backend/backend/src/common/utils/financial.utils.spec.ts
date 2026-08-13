import { Prisma } from '@prisma/client';
import {
  allocateNextReceiptNumber,
  isReceiptNumberUniqueConflict,
  paginateNewestFirstRunningBalances,
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

describe('paginateNewestFirstRunningBalances', () => {
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
});
