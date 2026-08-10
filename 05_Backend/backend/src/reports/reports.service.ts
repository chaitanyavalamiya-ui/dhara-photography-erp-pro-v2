import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { AccountsService } from '../accounts/accounts.service';
import { roundMoney } from '../bookings/utils/booking.utils';
import {
  buildBookingEventDateWhere,
  ACTIVE_BOOKING_FILTER,
  getMonthRange,
  ReportDateRange,
  ReportDatePreset,
  resolveReportDateRange,
} from '../common/utils/financial.utils';
import {
  MonthlySummaryQueryDto,
  ReportsDateQueryDto,
  ReportsExpensesQueryDto,
  ReportsIncomeQueryDto,
  ReportsTransactionsQueryDto,
} from './dto/reports-query.dto';
import {
  BookingReportRowDto,
  ChartDataPointDto,
  ExpenseReportRowDto,
  MonthlyChartRowDto,
  MonthlySummaryRowDto,
  PaymentReportRowDto,
  ProfitReportDto,
  ReportDateRangeDto,
  ReportsChartsDto,
  ReportsDashboardDto,
  ReportsOverviewDto,
  StaffReportRowDto,
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
    private readonly accountsService: AccountsService,
  ) {}

  async getDashboard(
    companyId: string,
    userId: string,
    query: ReportsDateQueryDto,
  ): Promise<ReportsDashboardDto> {
    await this.paymentsService.backfillAdvancePayments(companyId, userId);
    const period = this.resolvePeriod(query);
    const summary = await this.accountsService.getPeriodSummary(companyId, userId, query);

    const [invoiceStatusCounts, bookingAgg] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: {
          companyId,
          ...ACTIVE_FILTER,
          invoiceDate: { gte: period.start, lte: period.end },
        },
        _count: { _all: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          companyId,
          ...ACTIVE_BOOKING_FILTER,
          ...buildBookingEventDateWhere(period),
        },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
    ]);

    const statusMap = Object.fromEntries(
      invoiceStatusCounts.map((row) => [row.status, row._count._all]),
    );
    const bookingsCount = bookingAgg._count._all ?? 0;
    const bookingTotal = Number(bookingAgg._sum.totalAmount ?? 0);

    return {
      period: this.mapPeriod(period),
      totalInvoiceValue: summary.totalInvoiceValue,
      totalPaymentsReceived: summary.amountReceived,
      totalOutstanding: summary.outstandingAmount,
      totalExpenses: summary.totalExpenses,
      netProfit: summary.netProfit,
      bookingsCount,
      paidInvoicesCount: statusMap.paid ?? 0,
      unpaidInvoicesCount: (statusMap.unpaid ?? 0) + (statusMap.overdue ?? 0),
      averageBookingValue:
        bookingsCount > 0 ? roundMoney(bookingTotal / bookingsCount) : 0,
    };
  }

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
          ...ACTIVE_BOOKING_FILTER,
          ...buildBookingEventDateWhere(period),
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
            { orderDate: null, createdAt: { gte: period.start, lte: period.end } },
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

  async getIncomeReport(companyId: string, query: ReportsIncomeQueryDto) {
    return this.accountsService.getIncome(companyId, query);
  }

  async getBookingReport(
    companyId: string,
    query: ReportsDateQueryDto,
  ): Promise<{ period: ReportDateRangeDto; items: BookingReportRowDto[]; total: number }> {
    const period = this.resolvePeriod(query);

    const bookings = await this.prisma.booking.findMany({
      where: {
        companyId,
        ...ACTIVE_BOOKING_FILTER,
        ...buildBookingEventDateWhere(period),
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
            },
            _sum: { amount: true },
          }),
          this.prisma.expense.aggregate({
            where: {
              companyId,
              bookingId: booking.id,
              ...ACTIVE_FILTER,
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
          profit: roundMoney(received - expenses),
        };
      }),
    );

    return {
      period: this.mapPeriod(period),
      items,
      total: items.length,
    };
  }

  async getBookingProfitability(companyId: string, bookingId: string) {
    return this.accountsService.getBookingProfitability(companyId, bookingId);
  }

  async getPaymentReport(
    companyId: string,
    query: ReportsIncomeQueryDto,
  ): Promise<{
    period: ReportDateRangeDto;
    items: PaymentReportRowDto[];
    total: number;
    totalAmount: number;
  }> {
    const period = this.resolvePeriod(query);
    const where: Prisma.PaymentWhereInput = {
      companyId,
      ...ACTIVE_FILTER,
      paymentDate: { gte: period.start, lte: period.end },
    };

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { receiptNumber: { contains: term, mode: 'insensitive' } },
        { client: { fullName: { contains: term, mode: 'insensitive' } } },
        { invoice: { invoiceNumber: { contains: term, mode: 'insensitive' } } },
        { booking: { bookingNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [payments, total, amountAgg] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          client: { select: { fullName: true } },
          invoice: { select: { invoiceNumber: true } },
          booking: { select: { bookingNumber: true } },
          paymentMode: { select: { label: true } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({ where, _sum: { amount: true } }),
    ]);

    const items = payments.map((payment) => ({
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate.toISOString().slice(0, 10),
      invoiceNumber: payment.invoice?.invoiceNumber ?? null,
      bookingNumber: payment.booking.bookingNumber,
      clientName: payment.client.fullName,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMode.label,
    }));

    return {
      period: this.mapPeriod(period),
      items,
      total,
      totalAmount: roundMoney(Number(amountAgg._sum.amount ?? 0)),
    };
  }

  async getExpenseReport(
    companyId: string,
    query: ReportsExpensesQueryDto,
  ): Promise<{
    period: ReportDateRangeDto;
    items: ExpenseReportRowDto[];
    total: number;
    totalAmount: number;
  }> {
    const period = this.resolvePeriod(query);
    const where: Prisma.ExpenseWhereInput = {
      companyId,
      ...ACTIVE_FILTER,
      expenseDate: { gte: period.start, lte: period.end },
    };

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { vendorPerson: { contains: term, mode: 'insensitive' } },
        { category: { label: { contains: term, mode: 'insensitive' } } },
        { booking: { bookingNumber: { contains: term, mode: 'insensitive' } } },
        { staff: { fullName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [expenses, total, amountAgg] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          category: { select: { label: true } },
          booking: { select: { bookingNumber: true } },
          albumVendorFor: { select: { name: true } },
          staff: { select: { fullName: true } },
        },
        orderBy: { expenseDate: 'desc' },
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    const items = expenses.map((expense) => ({
      id: expense.id,
      expenseNumber: expense.referenceNumber ?? this.formatExpenseNumber(expense.id),
      expenseDate: expense.expenseDate.toISOString().slice(0, 10),
      category: expense.category.label,
      description: expense.description,
      amount: Number(expense.amount),
      bookingNumber: expense.booking?.bookingNumber ?? null,
      albumName: expense.albumVendorFor?.name ?? null,
      staffName: expense.staff?.fullName ?? null,
    }));

    return {
      period: this.mapPeriod(period),
      items,
      total,
      totalAmount: roundMoney(Number(amountAgg._sum.amount ?? 0)),
    };
  }

  async getProfitReport(
    companyId: string,
    userId: string,
    query: ReportsDateQueryDto,
  ): Promise<ProfitReportDto> {
    const profitLoss = await this.accountsService.getProfitLoss(companyId, userId, query);

    return {
      period: profitLoss.period,
      cashReceived: profitLoss.cashReceived,
      totalExpenses: profitLoss.totalExpenses,
      netProfit: profitLoss.netProfit,
      profitMarginPercent: profitLoss.profitMarginPercent,
      invoiceRevenue: profitLoss.invoiceRevenue,
    };
  }

  async getStaffReport(
    companyId: string,
    query: ReportsDateQueryDto,
  ): Promise<{ period: ReportDateRangeDto; items: StaffReportRowDto[]; total: number }> {
    const period = this.resolvePeriod(query);

    const staffCategory = await this.prisma.masterData.findFirst({
      where: { companyId, category: 'expense_category', code: 'staff', isActive: true },
    });

    const expenseWhere: Prisma.ExpenseWhereInput = {
      companyId,
      ...ACTIVE_FILTER,
      expenseDate: { gte: period.start, lte: period.end },
      OR: [
        { staffId: { not: null } },
        ...(staffCategory ? [{ categoryId: staffCategory.id }] : []),
      ],
    };

    const [expenses, assignments] = await Promise.all([
      this.prisma.expense.findMany({
        where: expenseWhere,
        include: {
          staff: { select: { id: true, fullName: true, staffCode: true } },
        },
      }),
      this.prisma.bookingStaff.findMany({
        where: {
          booking: {
            companyId,
            ...ACTIVE_BOOKING_FILTER,
            ...buildBookingEventDateWhere(period),
          },
        },
        select: { staffId: true },
      }),
    ]);

    const staffMap = new Map<
      string,
      { staffId: string; staffName: string; staffCode: string; totalPayments: number }
    >();

    for (const expense of expenses) {
      const staffId = expense.staffId ?? `vendor:${expense.vendorPerson ?? expense.id}`;
      const staffName = expense.staff?.fullName ?? expense.vendorPerson ?? 'Staff';
      const staffCode = expense.staff?.staffCode ?? '—';
      const existing = staffMap.get(staffId) ?? {
        staffId: expense.staffId ?? staffId,
        staffName,
        staffCode,
        totalPayments: 0,
      };
      existing.totalPayments = roundMoney(
        existing.totalPayments + Number(expense.amount),
      );
      staffMap.set(staffId, existing);
    }

    const assignmentCounts = new Map<string, number>();
    for (const assignment of assignments) {
      assignmentCounts.set(
        assignment.staffId,
        (assignmentCounts.get(assignment.staffId) ?? 0) + 1,
      );
    }

    const periodMonths = this.countMonthsInPeriod(period);
    const items = Array.from(staffMap.values())
      .map((row) => ({
        staffId: row.staffId,
        staffName: row.staffName,
        staffCode: row.staffCode,
        assignmentsCount: assignmentCounts.get(row.staffId) ?? 0,
        totalPayments: row.totalPayments,
        monthlyCost:
          periodMonths > 0 ? roundMoney(row.totalPayments / periodMonths) : row.totalPayments,
      }))
      .sort((a, b) => b.totalPayments - a.totalPayments);

    return {
      period: this.mapPeriod(period),
      items,
      total: items.length,
    };
  }

  async getTransactionsReport(companyId: string, query: ReportsTransactionsQueryDto) {
    return this.accountsService.getTransactions(companyId, query);
  }

  async getCharts(
    companyId: string,
    userId: string,
    query: ReportsDateQueryDto,
  ): Promise<ReportsChartsDto> {
    const period = this.resolvePeriod(query);
    const [monthlyRows, expenseBreakdown, payments, bookings] = await Promise.all([
      this.getMonthlySummary(companyId, { months: 12 }),
      this.accountsService.getExpenseBreakdown(companyId, query),
      this.prisma.payment.findMany({
        where: {
          companyId,
          ...ACTIVE_FILTER,
          paymentDate: { gte: period.start, lte: period.end },
        },
        include: { paymentMode: { select: { label: true } } },
      }),
      this.prisma.booking.findMany({
        where: {
          companyId,
          ...ACTIVE_BOOKING_FILTER,
          ...buildBookingEventDateWhere(period),
        },
        select: { eventType: true, totalAmount: true },
      }),
    ]);

    const paymentMethodMap = new Map<string, number>();
    for (const payment of payments) {
      const label = payment.paymentMode.label;
      paymentMethodMap.set(
        label,
        roundMoney((paymentMethodMap.get(label) ?? 0) + Number(payment.amount)),
      );
    }

    const eventTypeMap = new Map<string, number>();
    for (const booking of bookings) {
      const label = booking.eventType || 'Other';
      eventTypeMap.set(
        label,
        roundMoney((eventTypeMap.get(label) ?? 0) + Number(booking.totalAmount)),
      );
    }

    return {
      period: this.mapPeriod(period),
      monthlyIncomeExpense: monthlyRows.map((row) => ({
        label: row.label,
        income: row.received,
        expenses: row.expenses,
        profit: row.profit,
      })),
      incomeByPaymentMethod: Array.from(paymentMethodMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      expensesByCategory: expenseBreakdown.categories.map((row) => ({
        label: row.categoryLabel,
        value: row.amount,
      })),
      bookingRevenueByType: Array.from(eventTypeMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    };
  }

  async getMonthlySummary(
    companyId: string,
    query: MonthlySummaryQueryDto,
  ): Promise<MonthlySummaryRowDto[]> {
    if (query.year) {
      return this.getCalendarYearSummary(companyId, query.year);
    }

    const safeMonths = Math.min(Math.max(query.months ?? 12, 1), 24);
    const now = new Date();
    const rows: MonthlySummaryRowDto[] = [];

    for (let offset = safeMonths - 1; offset >= 0; offset -= 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      rows.push(await this.buildMonthlyRow(companyId, date.getUTCFullYear(), date.getUTCMonth() + 1));
    }

    return rows;
  }

  private async getCalendarYearSummary(
    companyId: string,
    year: number,
  ): Promise<MonthlySummaryRowDto[]> {
    const rows: MonthlySummaryRowDto[] = [];
    for (let month = 1; month <= 12; month += 1) {
      rows.push(await this.buildMonthlyRow(companyId, year, month));
    }
    return rows;
  }

  private async buildMonthlyRow(
    companyId: string,
    year: number,
    month: number,
  ): Promise<MonthlySummaryRowDto> {
    const { start, end } = getMonthRange(year, month);

    const [invoiceAgg, paymentAgg, expenseAgg, bookingsCount] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          ...ACTIVE_FILTER,
          invoiceDate: { gte: start, lte: end },
        },
        _sum: { totalAmount: true, outstandingAmount: true },
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
          ...ACTIVE_BOOKING_FILTER,
          ...buildBookingEventDateWhere({ start, end }),
        },
      }),
    ]);

    const revenue = roundMoney(Number(invoiceAgg._sum.totalAmount ?? 0));
    const received = roundMoney(Number(paymentAgg._sum.amount ?? 0));
    const expenses = roundMoney(Number(expenseAgg._sum.amount ?? 0));

    return {
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
      outstanding: roundMoney(Number(invoiceAgg._sum.outstandingAmount ?? 0)),
    };
  }

  private countMonthsInPeriod(period: ReportDateRange): number {
    const startYear = period.start.getUTCFullYear();
    const startMonth = period.start.getUTCMonth();
    const endYear = period.end.getUTCFullYear();
    const endMonth = period.end.getUTCMonth();
    return Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
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
