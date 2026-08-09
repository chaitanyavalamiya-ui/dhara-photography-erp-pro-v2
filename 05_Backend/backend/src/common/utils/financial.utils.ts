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

export async function generateReceiptNumber(
  tx: DbClient,
  companyId: string,
): Promise<string> {
  const count = await tx.payment.count({ where: { companyId } });
  return `RCPT-${String(count + 1).padStart(6, '0')}`;
}

export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}
