import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { roundMoney } from '../bookings/utils/booking.utils';
import { getMonthRange } from '../common/utils/financial.utils';
import {
  AccountsDashboardDto,
  AccountTransactionDto,
  BookingProfitabilityDto,
  MonthlyReportDto,
  MonthlyReportQueryDto,
} from './dto/accounts-response.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async getDashboard(companyId: string, userId: string): Promise<AccountsDashboardDto> {
    await this.paymentsService.backfillAdvancePayments(companyId, userId);

    const now = new Date();
    const { start: monthStart, end: monthEnd } = getMonthRange(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
    );

    const [invoiceAgg, paymentAgg, expenseAgg, monthPaymentAgg, monthExpenseAgg] =
      await Promise.all([
        this.prisma.invoice.aggregate({
          where: { companyId, archivedAt: null, isActive: true },
          _sum: { totalAmount: true, outstandingAmount: true },
        }),
        this.prisma.payment.aggregate({
          where: { companyId, archivedAt: null, isActive: true },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: { companyId, archivedAt: null, isActive: true },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            companyId,
            archivedAt: null,
            isActive: true,
            paymentDate: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            companyId,
            archivedAt: null,
            isActive: true,
            expenseDate: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        }),
      ]);

    const totalRevenue = roundMoney(Number(invoiceAgg._sum.totalAmount ?? 0));
    const amountReceived = roundMoney(Number(paymentAgg._sum.amount ?? 0));
    const outstandingAmount = roundMoney(Number(invoiceAgg._sum.outstandingAmount ?? 0));
    const totalExpenses = roundMoney(Number(expenseAgg._sum.amount ?? 0));
    const thisMonthRevenue = roundMoney(Number(monthPaymentAgg._sum.amount ?? 0));
    const thisMonthExpenses = roundMoney(Number(monthExpenseAgg._sum.amount ?? 0));

    return {
      totalRevenue,
      amountReceived,
      outstandingAmount,
      totalExpenses,
      netProfit: roundMoney(amountReceived - totalExpenses),
      thisMonthRevenue,
      thisMonthExpenses,
      thisMonthProfit: roundMoney(thisMonthRevenue - thisMonthExpenses),
    };
  }

  async getMonthlyReport(
    companyId: string,
    query: MonthlyReportQueryDto,
  ): Promise<MonthlyReportDto> {
    const now = new Date();
    const year = query.year ?? now.getUTCFullYear();
    const month = query.month ?? now.getUTCMonth() + 1;
    const { start, end } = getMonthRange(year, month);

    const [invoiceAgg, paymentAgg, expenseAgg, bookingsCount, invoiceStatusCounts] =
      await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            companyId,
            archivedAt: null,
            isActive: true,
            invoiceDate: { gte: start, lte: end },
          },
          _sum: { totalAmount: true, outstandingAmount: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            companyId,
            archivedAt: null,
            isActive: true,
            paymentDate: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            companyId,
            archivedAt: null,
            isActive: true,
            expenseDate: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        this.prisma.booking.count({
          where: {
            companyId,
            archivedAt: null,
            createdAt: { gte: start, lte: end },
          },
        }),
        this.prisma.invoice.groupBy({
          by: ['status'],
          where: { companyId, archivedAt: null, isActive: true },
          _count: { _all: true },
        }),
      ]);

    const statusMap = Object.fromEntries(
      invoiceStatusCounts.map((row) => [row.status, row._count._all]),
    );

    const totalPaymentsReceived = roundMoney(Number(paymentAgg._sum.amount ?? 0));
    const totalExpenses = roundMoney(Number(expenseAgg._sum.amount ?? 0));

    return {
      year,
      month,
      totalInvoiceValue: roundMoney(Number(invoiceAgg._sum.totalAmount ?? 0)),
      totalPaymentsReceived,
      totalOutstanding: roundMoney(Number(invoiceAgg._sum.outstandingAmount ?? 0)),
      totalExpenses,
      netProfit: roundMoney(totalPaymentsReceived - totalExpenses),
      bookingsCount,
      paidInvoicesCount: statusMap.paid ?? 0,
      partiallyPaidInvoicesCount: statusMap.partially_paid ?? 0,
      unpaidInvoicesCount: (statusMap.unpaid ?? 0) + (statusMap.overdue ?? 0),
    };
  }

  async getTransactions(companyId: string, limit = 50): Promise<AccountTransactionDto[]> {
    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: { companyId, archivedAt: null, isActive: true },
        include: {
          client: { select: { fullName: true } },
          booking: { select: { bookingNumber: true } },
          paymentMode: { select: { label: true } },
        },
        orderBy: { paymentDate: 'desc' },
        take: limit,
      }),
      this.prisma.expense.findMany({
        where: { companyId, archivedAt: null, isActive: true },
        include: {
          client: { select: { fullName: true } },
          booking: { select: { bookingNumber: true } },
          category: { select: { label: true } },
          paymentMode: { select: { label: true } },
        },
        orderBy: { expenseDate: 'desc' },
        take: limit,
      }),
    ]);

    const entries: Array<{
      id: string;
      date: Date;
      type: 'income' | 'expense';
      description: string;
      bookingNumber?: string | null;
      clientName?: string | null;
      income: number;
      expense: number;
      paymentMethod?: string | null;
      amount: number;
    }> = [
      ...payments.map((payment) => ({
        id: payment.id,
        date: payment.paymentDate,
        type: 'income' as const,
        description: `Payment ${payment.receiptNumber ?? ''}`.trim(),
        bookingNumber: payment.booking.bookingNumber,
        clientName: payment.client.fullName,
        income: Number(payment.amount),
        expense: 0,
        paymentMethod: payment.paymentMode.label,
        amount: Number(payment.amount),
      })),
      ...expenses.map((expense) => ({
        id: expense.id,
        date: expense.expenseDate,
        type: 'expense' as const,
        description: expense.description ?? expense.category.label,
        bookingNumber: expense.booking?.bookingNumber ?? null,
        clientName: expense.client?.fullName ?? null,
        income: 0,
        expense: Number(expense.amount),
        paymentMethod: expense.paymentMode?.label ?? null,
        amount: Number(expense.amount),
      })),
    ];

    entries.sort((a, b) => b.date.getTime() - a.date.getTime());

    let runningBalance = 0;

    return entries.slice(0, limit).map((entry) => {
      runningBalance = roundMoney(runningBalance + entry.income - entry.expense);

      return {
        id: entry.id,
        date: entry.date.toISOString().slice(0, 10),
        type: entry.type,
        description: entry.description,
        bookingNumber: entry.bookingNumber,
        clientName: entry.clientName,
        income: entry.income,
        expense: entry.expense,
        paymentMethod: entry.paymentMethod,
        amount: entry.amount,
        runningBalance,
      };
    });
  }

  async getBookingProfitability(
    companyId: string,
    bookingId: string,
  ): Promise<BookingProfitabilityDto> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId, archivedAt: null },
      include: {
        client: { select: { fullName: true } },
        invoices: {
          where: { archivedAt: null, isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    const invoice = booking.invoices[0];
    const totalBookingAmount = invoice
      ? Number(invoice.totalAmount)
      : Number(booking.totalAmount);

    const [paymentAgg, expenseAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { companyId, bookingId, archivedAt: null, isActive: true },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { companyId, bookingId, archivedAt: null, isActive: true },
        _sum: { amount: true },
      }),
    ]);

    const totalReceived = roundMoney(Number(paymentAgg._sum.amount ?? 0));
    const totalExpenses = roundMoney(Number(expenseAgg._sum.amount ?? 0));
    const balance = invoice
      ? Number(invoice.outstandingAmount)
      : roundMoney(totalBookingAmount - totalReceived);
    const netProfit = roundMoney(totalBookingAmount - totalExpenses);
    const profitMarginPercent =
      totalBookingAmount > 0
        ? roundMoney((netProfit / totalBookingAmount) * 100)
        : 0;

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      clientName: booking.client.fullName,
      totalBookingAmount,
      totalReceived,
      balance,
      totalExpenses,
      netProfit,
      profitMarginPercent,
      invoiceNumber: invoice?.invoiceNumber ?? null,
    };
  }
}
