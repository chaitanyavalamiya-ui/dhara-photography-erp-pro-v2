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

export function paginateNewestFirstRunningBalances(
  entries: Array<{ income: number; expense: number }>,
  page: number,
  limit: number,
): number[] {
  const periodNet = roundMoney(
    entries.reduce((sum, row) => sum + row.income - row.expense, 0),
  );
  const start = (page - 1) * limit;
  const skippedNet = roundMoney(
    entries.slice(0, start).reduce((sum, row) => sum + row.income - row.expense, 0),
  );
  let cursor = roundMoney(periodNet - skippedNet);
  const pageEntries = entries.slice(start, start + limit);

  return pageEntries.map((entry) => {
    const runningBalance = cursor;
    cursor = roundMoney(cursor - (entry.income - entry.expense));
    return runningBalance;
  });
}

export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
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
): ReportDateRange {
  const now = new Date();
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();

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
    const start = new Date(Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0, 0));
    const end = new Date(Date.UTC(utcYear, utcMonth, utcDate, 23, 59, 59, 999));
    const label = toDateLabel(start);
    return { preset, label: 'Today', start, end, dateFrom: label, dateTo: label };
  }

  if (preset === 'this_week') {
    const day = now.getUTCDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const start = new Date(Date.UTC(utcYear, utcMonth, utcDate - diffToMonday, 0, 0, 0, 0));
    const end = new Date(Date.UTC(utcYear, utcMonth, utcDate, 23, 59, 59, 999));
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
    const month = utcMonth === 0 ? 12 : utcMonth;
    const year = utcMonth === 0 ? utcYear - 1 : utcYear;
    const { start, end } = getMonthRange(year, month);
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
    const start = new Date(Date.UTC(utcYear, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(utcYear, utcMonth, utcDate, 23, 59, 59, 999));
    return {
      preset,
      label: 'This Year',
      start,
      end,
      dateFrom: toDateLabel(start),
      dateTo: toDateLabel(end),
    };
  }

  const { start, end } = getMonthRange(utcYear, utcMonth + 1);
  return {
    preset: 'this_month',
    label: 'This Month',
    start,
    end,
    dateFrom: toDateLabel(start),
    dateTo: toDateLabel(end),
  };
}
