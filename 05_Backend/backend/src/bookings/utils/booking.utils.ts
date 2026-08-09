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
