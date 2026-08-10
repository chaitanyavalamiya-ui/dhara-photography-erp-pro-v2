import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { roundMoney } from '../bookings/utils/booking.utils';
import {
  getMonthRange,
  ReportDateRange,
  ReportDatePreset,
  resolveReportDateRange,
} from '../common/utils/financial.utils';
import {
  AccountsDateQueryDto,
  AccountsExpensesQueryDto,
  AccountsIncomeQueryDto,
  AccountsMonthlySummaryQueryDto,
  AccountsTransactionsQueryDto,
} from './dto/accounts-query.dto';
import {
  AccountsDashboardDto,
  AccountsExpenseBreakdownDto,
  AccountsPeriodDto,
  AccountsPeriodSummaryDto,
  AccountTransactionDto,
  BookingProfitabilityDto,
  MonthlyFinancialRowDto,
  MonthlyReportDto,
  MonthlyReportQueryDto,
  PaginatedAccountTransactionsDto,
  PaginatedIncomeDto,
  PaginatedStaffPaymentsDto,
  ProfitLossDto,
} from './dto/accounts-response.dto';

const ACTIVE_FILTER = {
  archivedAt: null,
  isActive: true,
} as const;

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

    const [
      invoiceAgg,
      paymentAgg,
      expenseAgg,
      monthPaymentAgg,
      monthExpenseAgg,
      monthStaffAgg,
      albumAgg,
      staffAgg,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { companyId, ...ACTIVE_FILTER },
        _sum: { totalAmount: true, outstandingAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: { companyId, ...ACTIVE_FILTER },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { companyId, ...ACTIVE_FILTER },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          companyId,
          ...ACTIVE_FILTER,
          paymentDate: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          companyId,
          ...ACTIVE_FILTER,
          expenseDate: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      this.aggregateStaffPayments(companyId, monthStart, monthEnd),
      this.prisma.album.aggregate({
        where: { companyId, ...ACTIVE_FILTER },
        _sum: { albumPrice: true, vendorExpense: true },
      }),
      this.aggregateStaffPayments(companyId),
    ]);

    const totalRevenue = roundMoney(Number(invoiceAgg._sum.totalAmount ?? 0));
    const amountReceived = roundMoney(Number(paymentAgg._sum.amount ?? 0));
    const outstandingAmount = roundMoney(Number(invoiceAgg._sum.outstandingAmount ?? 0));
    const totalExpenses = roundMoney(Number(expenseAgg._sum.amount ?? 0));
    const thisMonthRevenue = roundMoney(Number(monthPaymentAgg._sum.amount ?? 0));
    const thisMonthExpenses = roundMoney(Number(monthExpenseAgg._sum.amount ?? 0));
    const totalAlbumOrderValue = roundMoney(Number(albumAgg._sum.albumPrice ?? 0));
    const totalAlbumVendorExpense = roundMoney(Number(albumAgg._sum.vendorExpense ?? 0));

    return {
      totalRevenue,
      amountReceived,
      outstandingAmount,
      totalExpenses,
      netProfit: roundMoney(amountReceived - totalExpenses),
      thisMonthRevenue,
      thisMonthExpenses,
      thisMonthProfit: roundMoney(thisMonthRevenue - thisMonthExpenses),
      totalAlbumOrderValue,
      totalAlbumVendorExpense,
      totalAlbumProfit: roundMoney(totalAlbumOrderValue - totalAlbumVendorExpense),
      totalStaffPayments: staffAgg,
      thisMonthStaffPayments: monthStaffAgg,
    };
  }

  async getPeriodSummary(
    companyId: string,
    userId: string,
    query: AccountsDateQueryDto,
  ): Promise<AccountsPeriodSummaryDto> {
    await this.paymentsService.backfillAdvancePayments(companyId, userId);
    const period = this.resolvePeriod(query);

    const [
      invoiceAgg,
      paymentAgg,
      expenseAgg,
      staffPayments,
      albumAgg,
      bookingsCount,
    ] = await Promise.all([
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
      this.aggregateStaffPayments(companyId, period.start, period.end),
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
      this.prisma.booking.count({
        where: {
          companyId,
          archivedAt: null,
          eventDate: { gte: period.start, lte: period.end },
        },
      }),
    ]);

    const amountReceived = roundMoney(Number(paymentAgg._sum.amount ?? 0));
    const totalExpenses = roundMoney(Number(expenseAgg._sum.amount ?? 0));
    const albumOrderValue = roundMoney(Number(albumAgg._sum.albumPrice ?? 0));
    const albumVendorExpense = roundMoney(Number(albumAgg._sum.vendorExpense ?? 0));

    return {
      period: this.mapPeriod(period),
      totalInvoiceValue: roundMoney(Number(invoiceAgg._sum.totalAmount ?? 0)),
      amountReceived,
      outstandingAmount: roundMoney(Number(invoiceAgg._sum.outstandingAmount ?? 0)),
      totalExpenses,
      staffPayments,
      netProfit: roundMoney(amountReceived - totalExpenses),
      albumOrderValue,
      albumVendorExpense,
      albumProfit: roundMoney(albumOrderValue - albumVendorExpense),
      bookingsCount,
    };
  }

  async getIncome(
    companyId: string,
    query: AccountsIncomeQueryDto,
  ): Promise<PaginatedIncomeDto> {
    const period = this.resolvePeriod(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

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
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({ where, _sum: { amount: true } }),
    ]);

    return {
      period: this.mapPeriod(period),
      items: payments.map((payment) => ({
        id: payment.id,
        receiptNumber: payment.receiptNumber,
        paymentDate: payment.paymentDate.toISOString().slice(0, 10),
        clientName: payment.client.fullName,
        invoiceNumber: payment.invoice?.invoiceNumber ?? null,
        bookingNumber: payment.booking.bookingNumber,
        paymentMethod: payment.paymentMode.label,
        amount: Number(payment.amount),
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      totalAmount: roundMoney(Number(amountAgg._sum.amount ?? 0)),
    };
  }

  async getExpenseBreakdown(
    companyId: string,
    query: AccountsDateQueryDto,
  ): Promise<AccountsExpenseBreakdownDto> {
    const period = this.resolvePeriod(query);

    const expenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        ...ACTIVE_FILTER,
        expenseDate: { gte: period.start, lte: period.end },
      },
      include: { category: { select: { code: true, label: true } } },
    });

    const categoryMap = new Map<
      string,
      { categoryCode: string; categoryLabel: string; amount: number; count: number }
    >();

    for (const expense of expenses) {
      const key = expense.category.code;
      const existing = categoryMap.get(key) ?? {
        categoryCode: expense.category.code,
        categoryLabel: expense.category.label,
        amount: 0,
        count: 0,
      };
      existing.amount = roundMoney(existing.amount + Number(expense.amount));
      existing.count += 1;
      categoryMap.set(key, existing);
    }

    const categories = Array.from(categoryMap.values())
      .map((row) => ({
        ...row,
        isStaffCategory: row.categoryCode === 'staff',
      }))
      .sort((a, b) => b.amount - a.amount);

    const totalExpenses = roundMoney(
      categories.reduce((sum, row) => sum + row.amount, 0),
    );
    const staffPayments = roundMoney(
      categories.find((row) => row.categoryCode === 'staff')?.amount ?? 0,
    );

    return {
      period: this.mapPeriod(period),
      totalExpenses,
      staffPayments,
      categories,
    };
  }

  async getStaffPayments(
    companyId: string,
    query: AccountsExpensesQueryDto,
  ): Promise<PaginatedStaffPaymentsDto> {
    const period = this.resolvePeriod(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const staffCategory = await this.prisma.masterData.findFirst({
      where: { companyId, category: 'expense_category', code: 'staff', isActive: true },
    });

    const where: Prisma.ExpenseWhereInput = {
      companyId,
      ...ACTIVE_FILTER,
      expenseDate: { gte: period.start, lte: period.end },
      OR: [
        { staffId: { not: null } },
        ...(staffCategory ? [{ categoryId: staffCategory.id }] : []),
      ],
    };

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.AND = [
        {
          OR: [
            { description: { contains: term, mode: 'insensitive' } },
            { vendorPerson: { contains: term, mode: 'insensitive' } },
            { staff: { fullName: { contains: term, mode: 'insensitive' } } },
            { booking: { bookingNumber: { contains: term, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [expenses, total, amountAgg] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          staff: { select: { id: true, fullName: true, staffCode: true } },
          booking: { select: { id: true, bookingNumber: true } },
          bookingStaffAssignment: { select: { id: true } },
        },
        orderBy: { expenseDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    return {
      period: this.mapPeriod(period),
      items: expenses.map((expense) => ({
        id: expense.id,
        expenseDate: expense.expenseDate.toISOString().slice(0, 10),
        staffId: expense.staffId ?? '',
        staffName: expense.staff?.fullName ?? expense.vendorPerson ?? 'Staff',
        staffCode: expense.staff?.staffCode ?? '—',
        bookingId: expense.bookingId,
        bookingNumber: expense.booking?.bookingNumber ?? null,
        description: expense.description,
        amount: Number(expense.amount),
        source: expense.bookingStaffAssignment ? 'staff_assignment' : 'manual',
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      totalAmount: roundMoney(Number(amountAgg._sum.amount ?? 0)),
    };
  }

  async getProfitLoss(
    companyId: string,
    userId: string,
    query: AccountsDateQueryDto,
  ): Promise<ProfitLossDto> {
    const summary = await this.getPeriodSummary(companyId, userId, query);
    const cashReceived = summary.amountReceived;
    const profit = summary.netProfit;
    const profitMarginPercent =
      cashReceived > 0 ? roundMoney((profit / cashReceived) * 100) : 0;

    return {
      period: summary.period,
      invoiceRevenue: summary.totalInvoiceValue,
      cashReceived,
      totalExpenses: summary.totalExpenses,
      staffPayments: summary.staffPayments,
      netProfit: profit,
      profitMarginPercent,
      albumOrderValue: summary.albumOrderValue,
      albumVendorExpense: summary.albumVendorExpense,
    };
  }

  async getMonthlyFinancialSummary(
    companyId: string,
    query: AccountsMonthlySummaryQueryDto,
  ): Promise<MonthlyFinancialRowDto[]> {
    const safeMonths = Math.min(Math.max(query.months ?? 12, 1), 24);
    const now = new Date();
    const rows: MonthlyFinancialRowDto[] = [];

    for (let offset = safeMonths - 1; offset >= 0; offset -= 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const { start, end } = getMonthRange(year, month);

      const [invoiceAgg, paymentAgg, expenseAgg, staffPayments, bookingsCount] =
        await Promise.all([
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
          this.aggregateStaffPayments(companyId, start, end),
          this.prisma.booking.count({
            where: {
              companyId,
              archivedAt: null,
              eventDate: { gte: start, lte: end },
            },
          }),
        ]);

      const cashReceived = roundMoney(Number(paymentAgg._sum.amount ?? 0));
      const expenses = roundMoney(Number(expenseAgg._sum.amount ?? 0));

      rows.push({
        year,
        month,
        label: new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-IN', {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        }),
        invoiceRevenue: roundMoney(Number(invoiceAgg._sum.totalAmount ?? 0)),
        cashReceived,
        expenses,
        staffPayments,
        profit: roundMoney(cashReceived - expenses),
        bookingsCount,
      });
    }

    return rows;
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
            archivedAt: null,
            eventDate: { gte: start, lte: end },
          },
        }),
        this.prisma.invoice.groupBy({
          by: ['status'],
          where: {
            companyId,
            ...ACTIVE_FILTER,
            invoiceDate: { gte: start, lte: end },
          },
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

  async getTransactions(
    companyId: string,
    query: AccountsTransactionsQueryDto,
  ): Promise<PaginatedAccountTransactionsDto> {
    const period = this.resolvePeriod(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const type = query.type ?? 'all';

    const paymentWhere: Prisma.PaymentWhereInput = {
      companyId,
      ...ACTIVE_FILTER,
      paymentDate: { gte: period.start, lte: period.end },
    };

    const expenseWhere: Prisma.ExpenseWhereInput = {
      companyId,
      ...ACTIVE_FILTER,
      expenseDate: { gte: period.start, lte: period.end },
    };

    if (query.search?.trim()) {
      const term = query.search.trim();
      paymentWhere.OR = [
        { receiptNumber: { contains: term, mode: 'insensitive' } },
        { client: { fullName: { contains: term, mode: 'insensitive' } } },
        { booking: { bookingNumber: { contains: term, mode: 'insensitive' } } },
      ];
      expenseWhere.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { vendorPerson: { contains: term, mode: 'insensitive' } },
        { category: { label: { contains: term, mode: 'insensitive' } } },
        { booking: { bookingNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [payments, expenses] = await Promise.all([
      type === 'expense'
        ? Promise.resolve([])
        : this.prisma.payment.findMany({
            where: paymentWhere,
            include: {
              client: { select: { fullName: true } },
              booking: { select: { bookingNumber: true } },
              paymentMode: { select: { label: true } },
            },
          }),
      type === 'income'
        ? Promise.resolve([])
        : this.prisma.expense.findMany({
            where: expenseWhere,
            include: {
              client: { select: { fullName: true } },
              booking: { select: { bookingNumber: true } },
              category: { select: { label: true } },
              paymentMode: { select: { label: true } },
            },
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

    const total = entries.length;
    const totalIncome = roundMoney(entries.reduce((sum, row) => sum + row.income, 0));
    const totalExpense = roundMoney(entries.reduce((sum, row) => sum + row.expense, 0));
    const start = (page - 1) * limit;
    const pageEntries = entries.slice(start, start + limit);

    let runningBalance = 0;

    const items: AccountTransactionDto[] = pageEntries.map((entry) => {
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

    return {
      period: this.mapPeriod(period),
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      totalIncome,
      totalExpense,
    };
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
          where: ACTIVE_FILTER,
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
        where: { companyId, bookingId, ...ACTIVE_FILTER },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { companyId, bookingId, ...ACTIVE_FILTER },
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

  private async aggregateStaffPayments(
    companyId: string,
    start?: Date,
    end?: Date,
  ): Promise<number> {
    const staffCategory = await this.prisma.masterData.findFirst({
      where: { companyId, category: 'expense_category', code: 'staff', isActive: true },
    });

    const where: Prisma.ExpenseWhereInput = {
      companyId,
      ...ACTIVE_FILTER,
      OR: [
        { staffId: { not: null } },
        ...(staffCategory ? [{ categoryId: staffCategory.id }] : []),
      ],
    };

    if (start && end) {
      where.expenseDate = { gte: start, lte: end };
    }

    const result = await this.prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    });

    return roundMoney(Number(result._sum.amount ?? 0));
  }

  private resolvePeriod(query: AccountsDateQueryDto): ReportDateRange {
    try {
      return resolveReportDateRange(
        (query.preset ?? 'this_month') as ReportDatePreset,
        query.dateFrom,
        query.dateTo,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid date range.';
      throw new BadRequestException(message);
    }
  }

  private mapPeriod(period: ReportDateRange): AccountsPeriodDto {
    return {
      preset: period.preset,
      label: period.label,
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
    };
  }
}
