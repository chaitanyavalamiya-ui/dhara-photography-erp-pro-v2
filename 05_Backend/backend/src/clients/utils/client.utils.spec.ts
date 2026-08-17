import { allocateNextClientNumber, isClientMobileUniqueConflict, isClientNumberUniqueConflict, toDateOnlyString } from './client.utils';
import { Prisma } from '@prisma/client';

describe('client.utils numbers', () => {
  it('allocates CLT-000001 and increments the suffix', () => {
    expect(allocateNextClientNumber(null)).toBe('CLT-000001');
    expect(allocateNextClientNumber('CLT-000099')).toBe('CLT-000100');
  });

  it('detects client number and mobile unique conflicts', () => {
    const numberError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['company_id', 'client_number'] },
    });
    const mobileError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['company_id', 'normalized_mobile'] },
    });

    expect(isClientNumberUniqueConflict(numberError)).toBe(true);
    expect(isClientMobileUniqueConflict(mobileError)).toBe(true);
    expect(isClientMobileUniqueConflict(numberError)).toBe(false);
  });

  it('formats calendar dates from local date parts instead of UTC ISO', () => {
    const local = new Date(2026, 7, 17, 0, 0, 0);
    expect(toDateOnlyString(local)).toBe('2026-08-17');
  });
});
