import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const BOOKING_EVENT_TYPES = [
  'Wedding',
  'Pre-wedding',
  'Engagement',
  'Birthday',
  'Baby Shower',
  'Couple Photography',
  'Other',
] as const;

export type BookingEventType = (typeof BOOKING_EVENT_TYPES)[number];

export const BOOKING_STATUS_CODES = ['enquiry', 'confirmed', 'completed', 'cancelled'] as const;

export function calculateItemAmount(
  unit: string,
  rate: number,
  quantity: number,
  days: number,
): number {
  if (unit === 'day') {
    return roundMoney(rate * days);
  }

  return roundMoney(rate * quantity);
}

export function calculateBookingTotals(
  items: Array<{ amount: number }>,
  discount: number,
  advanceAmount: number,
): { subtotal: number; totalAmount: number; balanceAmount: number } {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
  const totalAmount = roundMoney(Math.max(subtotal - discount, 0));
  const balanceAmount = roundMoney(Math.max(totalAmount - advanceAmount, 0));

  return { subtotal, totalAmount, balanceAmount };
}

export type BookingPaymentStatus = 'Paid' | 'Partial' | 'Unpaid';

export function deriveBookingPaymentStatus(
  totalAmount: number,
  advanceAmount: number,
  balanceAmount: number,
): BookingPaymentStatus {
  const total = roundMoney(totalAmount);
  const advance = roundMoney(advanceAmount);
  const balance = roundMoney(balanceAmount);

  if (total <= 0) {
    return advance > 0 ? 'Paid' : 'Unpaid';
  }

  if (balance <= 0) {
    return 'Paid';
  }

  if (advance <= 0) {
    return 'Unpaid';
  }

  return 'Partial';
}

export function toDateOnlyKey(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }

  return value.trim().slice(0, 10);
}

export function assertEventDateRange(eventDate?: string | null, eventEndDate?: string | null): void {
  const start = toDateOnlyKey(eventDate);

  if (!start) {
    throw new BadRequestException('Event start date is required.');
  }

  const end = toDateOnlyKey(eventEndDate);

  if (end && end < start) {
    throw new BadRequestException('Event end date cannot be before the start date.');
  }
}

export function allocateNextBookingNumber(latestNumber?: string | null): string {
  const match = latestNumber?.match(/^BK-(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `BK-${String(next).padStart(6, '0')}`;
}

export type BookingClientChangeDependentCounts = {
  invoices: number;
  payments: number;
  galleries: number;
  albums: number;
  deliveries: number;
};

export const BOOKING_CLIENT_CHANGE_LOCKED_MESSAGE =
  'Cannot change the booking client because this booking already has invoice, payment, gallery, album, or delivery records.';

export function isBookingClientChangeLocked(
  counts: BookingClientChangeDependentCounts,
): boolean {
  return (
    counts.invoices > 0 ||
    counts.payments > 0 ||
    counts.galleries > 0 ||
    counts.albums > 0 ||
    counts.deliveries > 0
  );
}

export function isBookingNumberUniqueConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;
  const haystack = Array.isArray(target) ? target.join(',') : String(target ?? '');
  return /booking[_]?number/i.test(haystack) || haystack.includes('company_id_booking_number');
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function parseOptionalDateTime(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Enter a valid date.');
  }

  return date;
}

export function toIsoDateString(value?: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString();
}

export function toDateOnlyLabel(value?: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}
