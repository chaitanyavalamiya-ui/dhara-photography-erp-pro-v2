import { CalendarBookingEvent } from '@/services/bookings-service';

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
