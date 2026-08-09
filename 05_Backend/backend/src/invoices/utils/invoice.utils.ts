import { BadRequestException } from '@nestjs/common';

export const INVOICE_STATUS_CODES = ['unpaid', 'partially_paid', 'paid', 'overdue'] as const;
export type InvoiceStatusCode = (typeof INVOICE_STATUS_CODES)[number];

export function computeInvoiceStatus(
  totalAmount: number,
  advanceAmount: number,
  outstandingAmount: number,
  dueDate?: Date | null,
): InvoiceStatusCode {
  if (outstandingAmount <= 0 || advanceAmount >= totalAmount) {
    return 'paid';
  }

  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (due < today && outstandingAmount > 0) {
      return 'overdue';
    }
  }

  if (advanceAmount > 0) {
    return 'partially_paid';
  }

  return 'unpaid';
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function generateInvoiceNumber(
  countFn: () => Promise<number>,
): Promise<string> {
  const count = await countFn();
  return `INV-${String(count + 1).padStart(6, '0')}`;
}

export function parseOptionalDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Enter a valid date.');
  }

  return date;
}

export function toDateOnlyLabel(value?: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}

export function defaultDueDate(eventDate?: Date | null): Date {
  const base = eventDate ? new Date(eventDate) : new Date();
  base.setDate(base.getDate() + 30);
  return base;
}
