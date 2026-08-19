import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  allocateNextBookingNumber,
  assertEventDateRange,
  calculateBookingTotals,
  calculateItemAmount,
  deriveBookingPaymentStatus,
  isBookingClientChangeLocked,
  isBookingNumberUniqueConflict,
} from './booking.utils';

describe('booking.utils', () => {
  describe('calculateItemAmount', () => {
    it('uses rate × days for day-based services and ignores quantity', () => {
      expect(calculateItemAmount('day', 5000, 3, 2)).toBe(10000);
    });

    it('uses rate × quantity for piece-based services and ignores days', () => {
      expect(calculateItemAmount('piece', 3000, 4, 9)).toBe(12000);
    });

    it('rounds to two decimal places', () => {
      expect(calculateItemAmount('piece', 10.555, 1, 1)).toBe(10.56);
    });
  });

  describe('calculateBookingTotals', () => {
    it('computes subtotal, discount, total, and non-negative balance', () => {
      const totals = calculateBookingTotals([{ amount: 10000 }, { amount: 2500.25 }], 500.25, 4000);
      expect(totals.subtotal).toBe(12500.25);
      expect(totals.totalAmount).toBe(12000);
      expect(totals.balanceAmount).toBe(8000);
    });

    it('does not allow a negative total or balance', () => {
      const totals = calculateBookingTotals([{ amount: 1000 }], 5000, 2000);
      expect(totals.totalAmount).toBe(0);
      expect(totals.balanceAmount).toBe(0);
    });
  });

  describe('deriveBookingPaymentStatus', () => {
    it('returns Unpaid when nothing has been received', () => {
      expect(deriveBookingPaymentStatus(10000, 0, 10000)).toBe('Unpaid');
    });

    it('returns Partial when advance is below the total', () => {
      expect(deriveBookingPaymentStatus(10000, 4000, 6000)).toBe('Partial');
    });

    it('returns Paid when the balance is cleared', () => {
      expect(deriveBookingPaymentStatus(10000, 10000, 0)).toBe('Paid');
    });
  });

  describe('assertEventDateRange', () => {
    it('requires a start date', () => {
      expect(() => assertEventDateRange('', '2026-12-16')).toThrow(BadRequestException);
    });

    it('rejects an end date before the start date', () => {
      expect(() => assertEventDateRange('2026-12-15', '2026-12-14')).toThrow(
        'Event end date cannot be before the start date.',
      );
    });

    it('allows a missing end date and same-day ranges', () => {
      expect(() => assertEventDateRange('2026-12-15')).not.toThrow();
      expect(() => assertEventDateRange('2026-12-15', '2026-12-15')).not.toThrow();
      expect(() => assertEventDateRange('2026-12-15', '2026-12-17')).not.toThrow();
    });
  });

  describe('allocateNextBookingNumber', () => {
    it('starts at BK-000001 and increments the numeric suffix', () => {
      expect(allocateNextBookingNumber(null)).toBe('BK-000001');
      expect(allocateNextBookingNumber('BK-000009')).toBe('BK-000010');
    });
  });

  describe('isBookingNumberUniqueConflict', () => {
    it('detects Prisma unique conflicts on booking_number', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['companyId', 'bookingNumber'] },
      });
      expect(isBookingNumberUniqueConflict(error)).toBe(true);
    });

    it('ignores unrelated unique conflicts', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['email'] },
      });
      expect(isBookingNumberUniqueConflict(error)).toBe(false);
    });
  });

  describe('isBookingClientChangeLocked', () => {
    const none = {
      invoices: 0,
      payments: 0,
      galleries: 0,
      albums: 0,
      deliveries: 0,
    };

    it('is unlocked when the booking has no dependent records', () => {
      expect(isBookingClientChangeLocked(none)).toBe(false);
    });

    it.each([
      ['invoices'],
      ['payments'],
      ['galleries'],
      ['albums'],
      ['deliveries'],
    ] as const)('is locked when %s exist', (key) => {
      expect(isBookingClientChangeLocked({ ...none, [key]: 1 })).toBe(true);
    });
  });
});
