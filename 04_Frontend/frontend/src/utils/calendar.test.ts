import { describe, expect, it } from 'vitest';
import type { CalendarBookingEvent } from '@/services/bookings-service';
import {
  buildMonthSummary,
  clientEventDateForYear,
  getBookingDatesInRange,
  getCalendarYearOptions,
  getVisibleCalendarRange,
  groupClientMarkersByDate,
  groupOccupyingEventsByDate,
  isWeddingEventType,
  occupiesCalendarDay,
  shiftCalendarMonth,
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

  it('excludes adjacent-month spillover from month summary totals', () => {
    const julyEvent = event({
      id: 'july',
      eventDate: '2026-07-31T00:00:00.000Z',
      totalAmount: 50000,
    });
    const augustEvent = event({
      id: 'august',
      eventDate: '2026-08-15T00:00:00.000Z',
      totalAmount: 10000,
    });
    const inMonth = [julyEvent, augustEvent].filter(
      (item) => getBookingDatesInRange(item, '2026-08-01', '2026-08-31').length > 0,
    );

    expect(buildMonthSummary(inMonth)).toMatchObject({
      totalBookings: 1,
      totalAmount: 10000,
    });
  });

  it('keeps local date keys without UTC shifting for calendar cells', () => {
    const local = new Date(2026, 7, 15);
    expect(toDateKey(local)).toBe('2026-08-15');
  });
});

describe('calendar navigation helpers', () => {
  it('shifts December to January of the next year', () => {
    expect(shiftCalendarMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it('shifts January to December of the previous year', () => {
    expect(shiftCalendarMonth(2027, 0, -1)).toEqual({ year: 2026, month: 11 });
  });

  it('builds a year list around the current year and includes a far selected year', () => {
    const years = getCalendarYearOptions(2042, new Date(2026, 7, 13));
    expect(years).toContain(2011);
    expect(years).toContain(2026);
    expect(years).toContain(2041);
    expect(years).toContain(2042);
  });
});

describe('calendar indicators', () => {
  it('marks Wedding event types for the ring indicator', () => {
    expect(isWeddingEventType('Wedding')).toBe(true);
    expect(isWeddingEventType('Birthday')).toBe(false);
    expect(isWeddingEventType('Engagement')).toBe(false);
  });

  it('places birthday and anniversary markers on matching month/day across years', () => {
    const grouped = groupClientMarkersByDate(
      [
        {
          id: 'c1',
          fullName: 'Asha',
          dateOfBirth: '1994-08-15',
          anniversaryDate: '2018-08-15',
        },
      ],
      '2027-08-01',
      '2027-08-31',
    );

    expect(grouped.get('2027-08-15')?.map((item) => item.type)).toEqual(['birthday', 'anniversary']);
    expect(grouped.get('2026-08-15')).toBeUndefined();
  });

  it('does not duplicate the same client event on one date', () => {
    const grouped = groupClientMarkersByDate(
      [
        { id: 'c1', fullName: 'Asha', dateOfBirth: '1994-08-15', anniversaryDate: null },
        { id: 'c1', fullName: 'Asha', dateOfBirth: '1994-08-15', anniversaryDate: null },
      ],
      '2026-08-01',
      '2026-08-31',
    );

    expect(grouped.get('2026-08-15')).toHaveLength(1);
  });

  it('maps client events onto spillover dates in the visible grid', () => {
    const range = getVisibleCalendarRange(2026, 7);
    const grouped = groupClientMarkersByDate(
      [
        {
          id: 'c2',
          fullName: 'Rahul',
          dateOfBirth: `1990-${range.dateFrom.slice(5)}`,
          anniversaryDate: null,
        },
      ],
      range.dateFrom,
      range.dateTo,
    );

    expect(grouped.get(range.dateFrom)?.[0].clientName).toBe('Rahul');
  });

  it('skips Feb 29 birthdays in non-leap years', () => {
    expect(clientEventDateForYear('2000-02-29', 2026)).toBeNull();
    expect(clientEventDateForYear('2000-02-29', 2028)).toBe('2028-02-29');
  });
});
