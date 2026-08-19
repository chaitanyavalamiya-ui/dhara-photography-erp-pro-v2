import { describe, expect, it } from 'vitest';
import {
  assertEventDateRange,
  calculateItemAmount,
  deriveBookingPaymentStatus,
  formatBookingCurrency,
  getBookingsEmptyMessage,
  isBookingClientChangeLocked,
  mergeBookingClientOptions,
} from './booking-form';

describe('booking-form helpers', () => {
  it('keeps day pricing as rate × days', () => {
    expect(calculateItemAmount('day', 9000, 5, 2)).toBe(18000);
  });

  it('keeps piece pricing as rate × quantity', () => {
    expect(calculateItemAmount('piece', 1000, 3, 8)).toBe(3000);
  });

  it('derives Paid / Partial / Unpaid from existing amounts', () => {
    expect(deriveBookingPaymentStatus(5000, 0, 5000)).toBe('Unpaid');
    expect(deriveBookingPaymentStatus(5000, 2000, 3000)).toBe('Partial');
    expect(deriveBookingPaymentStatus(5000, 5000, 0)).toBe('Paid');
  });

  it('validates end date against start date', () => {
    expect(assertEventDateRange('2026-12-15', '2026-12-14')).toBe(
      'Event end date cannot be before the start date.',
    );
    expect(assertEventDateRange('2026-12-15', '2026-12-16')).toBeNull();
  });

  it('always includes the current booking client in the picker options', () => {
    const listed = [
      { id: 'c1', fullName: 'A' },
      { id: 'c2', fullName: 'B' },
    ];
    const current = { id: 'c-current', fullName: 'Rahul Patel' };
    const merged = mergeBookingClientOptions(listed, current);
    expect(merged[0]).toEqual(current);
    expect(merged).toHaveLength(3);
  });

  it('uses context-aware empty copy', () => {
    expect(getBookingsEmptyMessage(false)).toBe('No bookings yet.');
    expect(getBookingsEmptyMessage(true)).toBe('No bookings match your filters.');
  });

  it('shows two decimal places for booking money', () => {
    expect(formatBookingCurrency(10000.5)).toContain('10,000.50');
  });

  it('treats missing clientChangeLocked as unlocked', () => {
    expect(isBookingClientChangeLocked()).toBe(false);
    expect(isBookingClientChangeLocked(false)).toBe(false);
    expect(isBookingClientChangeLocked(true)).toBe(true);
  });
});
