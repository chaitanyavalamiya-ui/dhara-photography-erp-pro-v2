import { Prisma } from '@prisma/client';
import { allocateNextInvoiceNumber, isInvoiceNumberUniqueConflict } from './invoice.utils';

describe('invoice number allocation', () => {
  it('starts at INV-000001 and increments the numeric suffix', () => {
    expect(allocateNextInvoiceNumber(null)).toBe('INV-000001');
    expect(allocateNextInvoiceNumber('INV-000009')).toBe('INV-000010');
  });

  it('detects invoice number unique conflicts', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['company_id', 'invoice_number'] },
    });

    expect(isInvoiceNumberUniqueConflict(error)).toBe(true);
    expect(isInvoiceNumberUniqueConflict(new Error('nope'))).toBe(false);
  });
});
