import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { roundMoney } from '../bookings/utils/booking.utils';
import {
  getMonthRange,
  ReportDateRange,
  ReportDatePreset,
  resolveReportDateRange,
} from '../common/utils/financial.utils';
import { ReportsDateQueryDto } from './dto/reports-query.dto';
import {
  BookingReportRowDto,
  ExpenseReportRowDto,
  MonthlySummaryRowDto,
  PaymentReportRowDto,
  ProfitReportDto,
  ReportDateRangeDto,
  ReportsOverviewDto,
} from './dto/reports-response.dto';

const ACTIVE_FILTER = {
  archivedAt: null,
  isActive: true,
} as const;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async getOverview(
    companyId: string,
    userId: string,
    query: ReportsDateQueryDto,
  ): Promise<ReportsOverviewDto> {
    await this.paymentsService.backfillAdvancePayments(companyId, userId);
    const period = this.resolvePeriod(query);

    const [
      bookingAgg,
      invoiceAgg,
      paymentAgg,
      expenseAgg,
      albumAgg,
    ] = await Promise.all([
      this.prisma.booking.aggregate({
        where: {
          companyId,
          ...ACTIVE_FILTER,
          eventDate: { gte: period.start, lte: period.end },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          ...ACTIVE_FILTER,
          invoiceDate: { gte: period.start, lte: period.end },
        },
        _sum: { totalAmount: true, outstandingAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          companyId,
          ...ACTIVE_FILTER,
          paymentDate: { gte: period.start, lte: period.end },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          companyId,
          ...ACTIVE_FILTER,
          expenseDate: { gte: period.start, lte: period.end },
        },
        _sum: { amount: true },
      }),
      this.prisma.album.aggregate({
        where: {
          companyId,
          ...ACTIVE_FILTER,
          OR: [
            { orderDate: { gte: period.start, lte: period.end } },
            {
              orderDate: null,
              createdAt: { gte: period.start, lte: period.end },
            },
          ],
        },
        _sum: { albumPrice: true, vendorExpense: true },
      }),
    ]);

    const amountReceived = roundMoney(Number(paymentAgg._sum.amount ?? 0));
    const totalExpenses = roundMoney(Number(expenseAgg._sum.amount ?? 0));
    const albumSales = roundMoney(Number(albumAgg._sum.albumPrice ?? 0));
    const albumVendorExpenses = roundMoney(Number(albumAgg._sum.vendorExpense ?? 0));

    return {
      period: this.mapPeriod(period),
      totalBookingValue: roundMoney(Number(bookingAgg._sum.totalAmount ?? 0)),
      totalInvoiceValue: roundMoney(Number(invoiceAgg._sum.totalAmount ?? 0)),
      amountReceived,
      outstandingAmount: roundMoney(Number(invoiceAgg._sum.outstandingAmount ?? 0)),
      totalExpenses,
      netProfit: roundMoney(amountReceived - totalExpenses),
      albumSales,
      albumVendorExpenses,
      albumProfit: roundMoney(albumSales - albumVendorExpenses),
    };
  }

  async getBookingReport(
    companyId: string,
    query: ReportsDateQueryDto,
  ): Promise<{ period: ReportDateRangeDto; items: BookingReportRowDto[]; total: number }> {
    const period = this.resolvePeriod(query);

    const bookings = await this.prisma.booking.findMany({
      where: {
        companyId,
        ...ACTIVE_FILTER,
        eventDate: { gte: period.start, lte: period.end },
      },
      include: {
        client: { select: { fullName: true } },
        invoices: {
          where: ACTIVE_FILTER,
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { eventDate: 'desc' },
    });

    const items = await Promise.all(
      bookings.map(async (booking) => {
        const invoice = booking.invoices[0];
        const totalAmount = invoice
          ? Number(invoice.totalAmount)
          : Number(booking.totalAmount);

        const [paymentAgg, expenseAgg] = await Promise.all([
          this.prisma.payment.aggregate({
            where: {
              companyId,
              bookingId: booking.id,
              ...ACTIVE_FILTER,
              paymentDate: { gte: period.start, lte: period.end },
            },
            _sum: { amount: true },
          }),
          this.prisma.expense.aggregate({
            where: {
              companyId,
              bookingId: booking.id,
              ...ACTIVE_FILTER,
              expenseDate: { gte: period.start, lte: period.end },
            },
            _sum: { amount: true },
          }),
        ]);

        const received = roundMoney(Number(paymentAgg._sum.amount ?? 0));
        const expenses = roundMoney(Number(expenseAgg._sum.amount ?? 0));
        const outstanding = invoice
          ? Number(invoice.outstandingAmount)
          : roundMoney(Math.max(totalAmount - received, 0));

        return {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          clientName: booking.client.fullName,
          eventDate: booking.eventDate?.toISOString().slice(0, 10) ?? null,
          totalAmount,
          received,
          outstanding,
          expenses,
          profit: roundMoney(totalAmount - expenses),
        };
      }),
    );

    return {
      period: this.mapPeriod(period),
      items,
      total: items.length,
    };
  }

  async getPaymentReport(
    companyId: string,
    query: ReportsDateQueryDto,
  ): Promise<{ period: ReportDateRangeDto; items: PaymentReportRowDto[]; total: number }> {
    const period = this.resolvePeriod(query);

    const payments = await this.prisma.payment.findMany({
      where: {
        companyId,
        ...ACTIVE_FILTER,
        paymentDate: { gte: period.start, lte: period.end },
      },
      include: {
        client: { select: { fullName: true } },
        invoice: { select: { invoiceNumber: true } },
        paymentMode: { select: { label: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const items = payments.map((payment) => ({
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate.toISOString().slice(0, 10),
      invoiceNumber: payment.invoice?.invoiceNumber ?? null,
      clientName: payment.client.fullName,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMode.label,
    }));

    return {
      period: this.mapPeriod(period),
      items,
      total: items.length,
    };
  }

  async getExpenseReport(
    companyId: string,
    query: ReportsDateQueryDto,
  ): Promise<{ period: ReportDateRangeDto; items: ExpenseReportRowDto[]; total: number }> {
    const period = this.resolvePeriod(query);

    const expenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        ...ACTIVE_FILTER,
        expenseDate: { gte: period.start, lte: period.end },
      },
      include: {
        category: { select: { label: true } },
        booking: { select: { bookingNumber: true } },
        albumVendorFor: { select: { name: true } },
      },
      orderBy: { expenseDate: 'desc' },
    });

    const items = expenses.map((expense) => ({
      id: expense.id,
      expenseNumber: expense.referenceNumber ?? this.formatExpenseNumber(expense.id),
      expenseDate: expense.expenseDate.toISOString().slice(0, 10),
      category: expense.category.label,
      description: expense.description,
      amount: Number(expense.amount),
      bookingNumber: expense.booking?.bookingNumber ?? null,
      albumName: expense.albumVendorFor?.name ?? null,
    }));

    return {
      period: this.mapPeriod(period),
      items,
      total: items.length,
    };
  }

  async getProfitReport(
    companyId: string,
    userId: string,
    query: ReportsDateQueryDto,
  ): Promise<ProfitReportDto> {
    const overview = await this.getOverview(companyId, userId, query);

    const revenue = overview.totalInvoiceValue;
    const received = overview.amountReceived;
    const expenses = overview.totalExpenses;
    const profit = overview.netProfit;
    const profitPercent = received > 0 ? roundMoney((profit / received) * 100) : 0;

    return {
      period: overview.period,
      revenue,
      received,
      expenses,
      profit,
      profitPercent,
    };
  }

  async getMonthlySummary(
    companyId: string,
    months = 12,
  ): Promise<MonthlySummaryRowDto[]> {
    const safeMonths = Math.min(Math.max(months, 1), 24);
    const now = new Date();
    const rows: MonthlySummaryRowDto[] = [];

    for (let offset = safeMonths - 1; offset >= 0; offset -= 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const { start, end } = getMonthRange(year, month);

      const [invoiceAgg, paymentAgg, expenseAgg, bookingsCount] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            companyId,
            ...ACTIVE_FILTER,
            invoiceDate: { gte: start, lte: end },
          },
          _sum: { totalAmount: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            companyId,
            ...ACTIVE_FILTER,
            paymentDate: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            companyId,
            ...ACTIVE_FILTER,
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
      ]);

      const revenue = roundMoney(Number(invoiceAgg._sum.totalAmount ?? 0));
      const received = roundMoney(Number(paymentAgg._sum.amount ?? 0));
      const expenses = roundMoney(Number(expenseAgg._sum.amount ?? 0));

      rows.push({
        year,
        month,
        label: new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-IN', {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        }),
        revenue,
        received,
        expenses,
        profit: roundMoney(received - expenses),
        bookingsCount,
      });
    }

    return rows;
  }

  private resolvePeriod(query: ReportsDateQueryDto): ReportDateRange {
    try {
      return resolveReportDateRange(
        (query.preset ?? 'this_month') as ReportDatePreset,
        query.dateFrom,
        query.dateTo,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid date range.';
      throw new BadRequestException(message);
    }
  }

  private mapPeriod(period: ReportDateRange): ReportDateRangeDto {
    return {
      preset: period.preset,
      label: period.label,
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
    };
  }

  private formatExpenseNumber(id: string): string {
    const suffix = id.replace(/-/g, '').slice(0, 8).toUpperCase();
    return `EXP-${suffix}`;
  }
}
