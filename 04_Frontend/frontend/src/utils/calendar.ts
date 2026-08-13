import { CalendarBookingEvent } from '@/services/bookings-service';

export const CALENDAR_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function getCalendarYearOptions(selectedYear: number, now = new Date()): number[] {
  const currentYear = now.getFullYear();
  const start = Math.min(currentYear - 15, selectedYear);
  const end = Math.max(currentYear + 15, selectedYear);
  const years: number[] = [];

  for (let year = start; year <= end; year += 1) {
    years.push(year);
  }

  return years;
}

export function shiftCalendarMonth(
  year: number,
  month: number,
  offset: number,
): { year: number; month: number } {
  const next = new Date(year, month + offset, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

export function isWeddingEventType(eventType: string): boolean {
  return eventType === 'Wedding';
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    dateFrom: toDateKey(start),
    dateTo: toDateKey(end),
    label: start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
}

export function getCalendarGridDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const gridEnd = new Date(year, month + 1, 0);
  const endOffset = 6 - gridEnd.getDay();
  const totalDays = startOffset + lastDay.getDate() + endOffset;

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

export function getVisibleCalendarRange(year: number, month: number) {
  const days = getCalendarGridDays(year, month);
  return {
    dateFrom: toDateKey(days[0]),
    dateTo: toDateKey(days[days.length - 1]),
  };
}

export function occupiesCalendarDay(event: CalendarBookingEvent): boolean {
  return event.statusCode !== 'cancelled';
}

export function expandBookingDates(event: CalendarBookingEvent): string[] {
  if (!event.eventDate) return [];

  const start = parseDateKey(event.eventDate.slice(0, 10));
  const end = parseDateKey((event.eventEndDate ?? event.eventDate).slice(0, 10));
  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function getBookingDatesInMonth(
  event: CalendarBookingEvent,
  year: number,
  month: number,
): string[] {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  return expandBookingDates(event).filter((dateKey) => {
    const date = parseDateKey(dateKey);
    return date >= monthStart && date <= monthEnd;
  });
}

export function getBookingDatesInRange(
  event: CalendarBookingEvent,
  dateFrom: string,
  dateTo: string,
): string[] {
  const rangeStart = parseDateKey(dateFrom);
  const rangeEnd = parseDateKey(dateTo);

  return expandBookingDates(event).filter((dateKey) => {
    const date = parseDateKey(dateKey);
    return date >= rangeStart && date <= rangeEnd;
  });
}

export function groupOccupyingEventsByDate(
  events: CalendarBookingEvent[],
  dateFrom: string,
  dateTo: string,
): Map<string, CalendarBookingEvent[]> {
  const map = new Map<string, CalendarBookingEvent[]>();

  for (const event of events) {
    if (!occupiesCalendarDay(event)) {
      continue;
    }

    for (const dateKey of getBookingDatesInRange(event, dateFrom, dateTo)) {
      const existing = map.get(dateKey) ?? [];
      existing.push(event);
      map.set(dateKey, existing);
    }
  }

  return map;
}

export interface CalendarMonthSummary {
  totalBookings: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
  totalAmount: number;
  outstandingBalance: number;
}

export function buildMonthSummary(events: CalendarBookingEvent[]): CalendarMonthSummary {
  const unique = new Map<string, CalendarBookingEvent>();
  for (const event of events) {
    unique.set(event.id, event);
  }

  const bookings = Array.from(unique.values());

  return {
    totalBookings: bookings.length,
    confirmed: bookings.filter((event) => event.statusCode === 'confirmed').length,
    pending: bookings.filter((event) =>
      ['enquiry', 'draft'].includes(event.statusCode),
    ).length,
    completed: bookings.filter((event) => event.statusCode === 'completed').length,
    cancelled: bookings.filter((event) => event.statusCode === 'cancelled').length,
    totalAmount: bookings.reduce((sum, event) => sum + event.totalAmount, 0),
    outstandingBalance: bookings.reduce((sum, event) => sum + event.balanceAmount, 0),
  };
}

export function getStatusStyles(statusCode: string): string {
  switch (statusCode) {
    case 'confirmed':
      return 'border-gold/40 bg-gold/15 text-gold';
    case 'completed':
      return 'border-green-500/30 bg-green-500/10 text-green-300';
    case 'cancelled':
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    default:
      return 'border-orange-400/30 bg-orange-400/10 text-orange-200';
  }
}

export function getStatusLabel(statusCode: string, status: string): string {
  if (statusCode === 'enquiry' || statusCode === 'draft') {
    return 'Pending';
  }
  return status;
}

export function isSameMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return toDateKey(date) === toDateKey(today);
}

export interface CalendarClientMarker {
  clientId: string;
  clientName: string;
  type: 'birthday' | 'anniversary';
}

function monthDayKey(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const match = value.slice(0, 10).match(/^\d{4}-(\d{2}-\d{2})$/);
  return match?.[1] ?? null;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function clientEventDateForYear(sourceDate: string | null | undefined, year: number): string | null {
  const monthDay = monthDayKey(sourceDate);
  if (!monthDay) {
    return null;
  }

  if (monthDay === '02-29' && !isLeapYear(year)) {
    return null;
  }

  return `${year}-${monthDay}`;
}

function yearsInRange(dateFrom: string, dateTo: string): number[] {
  const startYear = Number(dateFrom.slice(0, 4));
  const endYear = Number(dateTo.slice(0, 4));
  const years: number[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    years.push(year);
  }

  return years;
}

export function groupClientMarkersByDate(
  clients: Array<{
    id: string;
    fullName: string;
    dateOfBirth?: string | null;
    anniversaryDate?: string | null;
  }>,
  dateFrom: string,
  dateTo: string,
): Map<string, CalendarClientMarker[]> {
  const map = new Map<string, CalendarClientMarker[]>();
  const years = yearsInRange(dateFrom, dateTo);

  const addMarker = (dateKey: string | null, marker: CalendarClientMarker) => {
    if (!dateKey || dateKey < dateFrom || dateKey > dateTo) {
      return;
    }

    const existing = map.get(dateKey) ?? [];
    if (existing.some((item) => item.clientId === marker.clientId && item.type === marker.type)) {
      return;
    }

    existing.push(marker);
    map.set(dateKey, existing);
  };

  for (const client of clients) {
    for (const year of years) {
      addMarker(clientEventDateForYear(client.dateOfBirth, year), {
        clientId: client.id,
        clientName: client.fullName,
        type: 'birthday',
      });
      addMarker(clientEventDateForYear(client.anniversaryDate, year), {
        clientId: client.id,
        clientName: client.fullName,
        type: 'anniversary',
      });
    }
  }

  return map;
}
