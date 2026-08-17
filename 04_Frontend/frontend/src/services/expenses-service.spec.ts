import { describe, expect, it } from 'vitest';
import { toExpensePayload } from './expenses-service';

describe('toExpensePayload', () => {
  it('omits blank optional fields so the API does not receive empty UUIDs', () => {
    expect(
      toExpensePayload({
        categoryCode: 'fuel',
        amount: 250,
        expenseDate: '2026-08-16',
        description: '  Site diesel  ',
        vendorPerson: '  ',
        paymentModeCode: 'cash',
        referenceNumber: '',
        bookingId: '',
        notes: 'Keep the bill',
        staffId: '',
      }),
    ).toEqual({
      categoryCode: 'fuel',
      amount: 250,
      expenseDate: '2026-08-16',
      description: 'Site diesel',
      vendorPerson: undefined,
      paymentModeCode: 'cash',
      referenceNumber: undefined,
      bookingId: undefined,
      staffId: undefined,
      notes: 'Keep the bill',
    });
  });
});
