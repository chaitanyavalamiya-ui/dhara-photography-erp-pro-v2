import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { computeInvoiceStatus, roundMoney } from '../../invoices/utils/invoice.utils';
import { toDecimal } from '../../bookings/utils/booking.utils';

type DbClient = PrismaService | Prisma.TransactionClient;

export async function getPaymentTotalForInvoice(
  tx: DbClient,
  invoiceId: string,
): Promise<number> {
  const result = await tx.payment.aggregate({
    where: { invoiceId, archivedAt: null, isActive: true },
    _sum: { amount: true },
  });

  return roundMoney(Number(result._sum.amount ?? 0));
}

export async function syncInvoiceAndBookingFinancials(
  tx: DbClient,
  invoiceId: string,
): Promise<void> {
  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });

  if (!invoice) {
    return;
  }

  const totalAmount = Number(invoice.totalAmount);
  const advanceAmount = await getPaymentTotalForInvoice(tx, invoiceId);
  const outstandingAmount = roundMoney(Math.max(totalAmount - advanceAmount, 0));
  const status = computeInvoiceStatus(
    totalAmount,
    advanceAmount,
    outstandingAmount,
    invoice.dueDate,
  );

  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      advanceAmount: toDecimal(advanceAmount),
      outstandingAmount: toDecimal(outstandingAmount),
      status,
    },
  });

  await tx.booking.update({
    where: { id: invoice.bookingId },
    data: {
      advanceAmount: toDecimal(advanceAmount),
      balanceAmount: toDecimal(outstandingAmount),
    },
  });
}

export function allocateNextReceiptNumber(latestNumber?: string | null): string {
  const match = latestNumber?.match(/^RCPT-(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `RCPT-${String(next).padStart(6, '0')}`;
}

export function isReceiptNumberUniqueConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;
  const haystack = Array.isArray(target) ? target.join(',') : String(target ?? '');
  return /receipt[_]?number/i.test(haystack) || haystack.includes('company_id_receipt_number');
}

export async function generateReceiptNumber(
  tx: DbClient,
  companyId: string,
): Promise<string> {
  const latest = await tx.payment.findFirst({
    where: { companyId, receiptNumber: { not: null } },
    orderBy: { receiptNumber: 'desc' },
    select: { receiptNumber: true },
  });

  return allocateNextReceiptNumber(latest?.receiptNumber);
}

export type AccountLedgerSortKey = {
  id: string;
  date: Date;
  createdAt: Date;
  type: 'income' | 'expense';
};

/**
 * Newest-first display order, deterministic for same-day rows:
 * business date desc → createdAt desc → income before expense → id desc.
 */
export function compareAccountLedgerNewestFirst(
  a: AccountLedgerSortKey,
  b: AccountLedgerSortKey,
): number {
  const byDate = b.date.getTime() - a.date.getTime();
  if (byDate !== 0) {
    return byDate;
  }

  const byCreated = b.createdAt.getTime() - a.createdAt.getTime();
  if (byCreated !== 0) {
    return byCreated;
  }

  if (a.type !== b.type) {
    return a.type === 'income' ? -1 : 1;
  }

  return b.id.localeCompare(a.id);
}

export function sortAccountLedgerNewestFirst<T extends AccountLedgerSortKey>(entries: T[]): T[] {
  return [...entries].sort(compareAccountLedgerNewestFirst);
}

/**
 * Running balance after each transaction in chronological order:
 * previous + income − expense, starting at 0 for the selected period.
 * `entries` must already be newest-first; returned balances align to that order.
 */
export function computeNewestFirstRunningBalances(
  entries: Array<{ income: number; expense: number }>,
): number[] {
  const balances = new Array<number>(entries.length);
  let previous = 0;

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    previous = roundMoney(previous + entry.income - entry.expense);
    balances[index] = previous;
  }

  return balances;
}

export function paginateNewestFirstRunningBalances(
  entries: Array<{ income: number; expense: number }>,
  page: number,
  limit: number,
): number[] {
  const start = (page - 1) * limit;
  return computeNewestFirstRunningBalances(entries).slice(start, start + limit);
}

export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

export const STUDIO_TIME_ZONE = 'Asia/Kolkata';

export function getStudioDateParts(now = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);

  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
  };
}

/** Active bookings only — archived excluded, isActive required. */
export const ACTIVE_BOOKING_FILTER = {
  archivedAt: null,
  isActive: true,
} as const;

/** Accounts/reports occupancy — cancelled bookings stay in the calendar but not in financial counts. */
export const REPORT_BOOKING_FILTER = {
  archivedAt: null,
  isActive: true,
  status: { code: { not: 'cancelled' } },
} as const;

/**
 * Booking report period filter: event date must fall within the range (inclusive).
 * Bookings with null eventDate are excluded from event-date-based reports.
 */
export function buildBookingEventDateWhere(period: {
  start: Date;
  end: Date;
}): { eventDate: { gte: Date; lte: Date } } {
  return {
    eventDate: {
      gte: period.start,
      lte: period.end,
    },
  };
}

export type ReportDatePreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface ReportDateRange {
  preset: ReportDatePreset;
  label: string;
  start: Date;
  end: Date;
  dateFrom: string;
  dateTo: string;
}

export function resolveReportDateRange(
  preset: ReportDatePreset = 'this_month',
  dateFrom?: string,
  dateTo?: string,
  now = new Date(),
): ReportDateRange {
  const { year, month, day } = getStudioDateParts(now);

  const toDateLabel = (date: Date) => date.toISOString().slice(0, 10);

  if (preset === 'custom') {
    if (!dateFrom || !dateTo) {
      throw new Error('Custom date range requires dateFrom and dateTo.');
    }

    const start = new Date(`${dateFrom}T00:00:00.000Z`);
    const end = new Date(`${dateTo}T23:59:59.999Z`);

    if (start.getTime() > end.getTime()) {
      throw new Error('dateFrom must be on or before dateTo.');
    }

    return {
      preset,
      label: `${dateFrom} to ${dateTo}`,
      start,
      end,
      dateFrom,
      dateTo,
    };
  }

  if (preset === 'today') {
    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    const label = toDateLabel(start);
    return { preset, label: 'Today', start, end, dateFrom: label, dateTo: label };
  }

  if (preset === 'this_week') {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const diffToMonday = weekday === 0 ? 6 : weekday - 1;
    const start = new Date(Date.UTC(year, month - 1, day - diffToMonday, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    return {
      preset,
      label: 'This Week',
      start,
      end,
      dateFrom: toDateLabel(start),
      dateTo: toDateLabel(end),
    };
  }

  if (preset === 'last_month') {
    const lastMonth = month === 1 ? 12 : month - 1;
    const lastMonthYear = month === 1 ? year - 1 : year;
    const { start, end } = getMonthRange(lastMonthYear, lastMonth);
    return {
      preset,
      label: 'Last Month',
      start,
      end,
      dateFrom: toDateLabel(start),
      dateTo: toDateLabel(end),
    };
  }

  if (preset === 'this_year') {
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    return {
      preset,
      label: 'This Year',
      start,
      end,
      dateFrom: toDateLabel(start),
      dateTo: toDateLabel(end),
    };
  }

  const { start, end } = getMonthRange(year, month);
  return {
    preset: 'this_month',
    label: 'This Month',
    start,
    end,
    dateFrom: toDateLabel(start),
    dateTo: toDateLabel(end),
  };
}
