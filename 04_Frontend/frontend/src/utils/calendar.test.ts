import { describe, expect, it } from 'vitest';
import type { CalendarBookingEvent } from '@/services/bookings-service';
import {
  getVisibleCalendarRange,
  groupOccupyingEventsByDate,
  occupiesCalendarDay,
  toDateKey,
} from './calendar';

function event(overrides: Partial<CalendarBookingEvent>): CalendarBookingEvent {
  return {
    id: 'b1',
    bookingNumber: 'BK-000001',
    clientName: 'Rahul Patel',
    eventType: 'Wedding',
    eventDate: '2026-08-01T00:00:00.000Z',
    eventEndDate: null,
    status: 'Confirmed',
    statusCode: 'confirmed',
    totalAmount: 10000,
    balanceAmount: 4000,
    ...overrides,
  };
}

describe('calendar occupancy', () => {
  it('does not treat cancelled bookings as occupying a day', () => {
    expect(occupiesCalendarDay(event({ statusCode: 'cancelled', status: 'Cancelled' }))).toBe(false);
    expect(occupiesCalendarDay(event({ statusCode: 'confirmed' }))).toBe(true);
    expect(occupiesCalendarDay(event({ statusCode: 'enquiry' }))).toBe(true);
  });

  it('excludes cancelled bookings from booked-day grouping', () => {
    const grouped = groupOccupyingEventsByDate(
      [
        event({ id: 'open', eventDate: '2026-08-15T00:00:00.000Z', statusCode: 'confirmed' }),
        event({
          id: 'cancelled',
          eventDate: '2026-08-15T00:00:00.000Z',
          statusCode: 'cancelled',
          status: 'Cancelled',
        }),
      ],
      '2026-08-01',
      '2026-08-31',
    );

    expect(grouped.get('2026-08-15')?.map((item) => item.id)).toEqual(['open']);
  });

  it('maps spillover days in the visible grid range', () => {
    const range = getVisibleCalendarRange(2026, 7);
    expect(range.dateFrom <= '2026-08-01').toBe(true);
    expect(range.dateTo >= '2026-08-31').toBe(true);

    const previousMonthDay = range.dateFrom;
    const grouped = groupOccupyingEventsByDate(
      [
        event({
          id: 'spillover',
          eventDate: `${previousMonthDay}T00:00:00.000Z`,
          statusCode: 'confirmed',
        }),
      ],
      range.dateFrom,
      range.dateTo,
    );

    expect(grouped.get(previousMonthDay)?.[0].id).toBe('spillover');
  });

  it('keeps local date keys without UTC shifting for calendar cells', () => {
    const local = new Date(2026, 7, 15);
    expect(toDateKey(local)).toBe('2026-08-15');
  });
});
