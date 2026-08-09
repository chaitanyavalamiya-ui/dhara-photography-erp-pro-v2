import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import {
  ExpenseResponseDto,
  PaginatedExpensesResponseDto,
} from './dto/expense-response.dto';
import { parseOptionalDate } from '../invoices/utils/invoice.utils';
import { roundMoney, toDecimal } from '../bookings/utils/booking.utils';

type ExpenseWithRelations = Prisma.ExpenseGetPayload<{
  include: {
    category: { select: { code: true; label: true } };
    paymentMode: { select: { code: true; label: true } };
    client: { select: { fullName: true } };
    booking: { select: { bookingNumber: true } };
    invoice: { select: { invoiceNumber: true } };
  };
}>;

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    companyId: string,
    query: ListExpensesQueryDto,
  ): Promise<PaginatedExpensesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = await this.buildWhereClause(companyId, query);

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: this.expenseInclude(),
        orderBy: this.buildOrderBy(query.sortBy ?? 'expenseDate', query.sortOrder ?? 'desc'),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      items: expenses.map((expense) => this.mapExpense(expense)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(companyId: string, id: string): Promise<ExpenseResponseDto> {
    const expense = await this.getExpenseOrThrow(companyId, id);
    return this.mapExpense(expense);
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateExpenseDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ExpenseResponseDto> {
    const category = await this.resolveCategory(companyId, dto.categoryCode);
    const branch = await this.resolveBranch(companyId, dto.bookingId, dto.clientId);
    const paymentMode = dto.paymentModeCode
      ? await this.resolvePaymentMode(companyId, dto.paymentModeCode)
      : null;

    await this.validateLinks(companyId, dto.clientId, dto.bookingId, dto.invoiceId);

    const expense = await this.prisma.expense.create({
      data: {
        companyId,
        branchId: branch.id,
        categoryId: category.id,
        clientId: dto.clientId ?? null,
        bookingId: dto.bookingId ?? null,
        invoiceId: dto.invoiceId ?? null,
        description: dto.description?.trim() || null,
        vendorPerson: dto.vendorPerson?.trim() || null,
        amount: toDecimal(roundMoney(dto.amount)),
        expenseDate: parseOptionalDate(dto.expenseDate) ?? new Date(),
        paymentModeId: paymentMode?.id ?? null,
        referenceNumber: dto.referenceNumber?.trim() || null,
        notes: dto.notes?.trim() || null,
        createdById: userId,
        updatedById: userId,
      },
      include: this.expenseInclude(),
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'expenses',
      action: 'create',
      recordType: 'expense',
      recordId: expense.id,
      newValue: { amount: dto.amount, category: dto.categoryCode },
      ipAddress,
      userAgent,
    });

    return this.mapExpense(expense);
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateExpenseDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ExpenseResponseDto> {
    const existing = await this.getExpenseOrThrow(companyId, id);

    const category = dto.categoryCode
      ? await this.resolveCategory(companyId, dto.categoryCode)
      : null;
    const paymentMode =
      dto.paymentModeCode !== undefined
        ? dto.paymentModeCode
          ? await this.resolvePaymentMode(companyId, dto.paymentModeCode)
          : null
        : undefined;

    if (dto.clientId !== undefined || dto.bookingId !== undefined || dto.invoiceId !== undefined) {
      await this.validateLinks(
        companyId,
        dto.clientId ?? existing.clientId ?? undefined,
        dto.bookingId ?? existing.bookingId ?? undefined,
        dto.invoiceId ?? existing.invoiceId ?? undefined,
      );
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(category ? { categoryId: category.id } : {}),
        ...(dto.amount !== undefined ? { amount: toDecimal(roundMoney(dto.amount)) } : {}),
        ...(dto.expenseDate !== undefined
          ? { expenseDate: parseOptionalDate(dto.expenseDate) ?? new Date() }
          : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.vendorPerson !== undefined
          ? { vendorPerson: dto.vendorPerson?.trim() || null }
          : {}),
        ...(paymentMode !== undefined ? { paymentModeId: paymentMode?.id ?? null } : {}),
        ...(dto.referenceNumber !== undefined
          ? { referenceNumber: dto.referenceNumber?.trim() || null }
          : {}),
        ...(dto.clientId !== undefined ? { clientId: dto.clientId } : {}),
        ...(dto.bookingId !== undefined ? { bookingId: dto.bookingId } : {}),
        ...(dto.invoiceId !== undefined ? { invoiceId: dto.invoiceId } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        updatedById: userId,
      },
      include: this.expenseInclude(),
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'expenses',
      action: 'update',
      recordType: 'expense',
      recordId: id,
      previousValue: { amount: Number(existing.amount) },
      newValue: { amount: Number(updated.amount) },
      ipAddress,
      userAgent,
    });

    return this.mapExpense(updated);
  }

  async archive(
    companyId: string,
    userId: string,
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const existing = await this.getExpenseOrThrow(companyId, id);

    await this.prisma.expense.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: userId,
        archivedReason: 'Archived from expenses module',
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'expenses',
      action: 'archive',
      recordType: 'expense',
      recordId: id,
      previousValue: { amount: Number(existing.amount) },
      ipAddress,
      userAgent,
    });

    return { message: 'Expense archived successfully.' };
  }

  private expenseInclude() {
    return {
      category: { select: { code: true, label: true } },
      paymentMode: { select: { code: true, label: true } },
      client: { select: { fullName: true } },
      booking: { select: { bookingNumber: true } },
      invoice: { select: { invoiceNumber: true } },
    };
  }

  private async getExpenseOrThrow(
    companyId: string,
    id: string,
  ): Promise<ExpenseWithRelations> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId, archivedAt: null },
      include: this.expenseInclude(),
    });

    if (!expense) {
      throw new NotFoundException('Expense not found.');
    }

    return expense;
  }

  private mapExpense(expense: ExpenseWithRelations): ExpenseResponseDto {
    return {
      id: expense.id,
      categoryCode: expense.category.code,
      categoryLabel: expense.category.label,
      amount: Number(expense.amount),
      expenseDate: expense.expenseDate.toISOString().slice(0, 10),
      description: expense.description,
      vendorPerson: expense.vendorPerson,
      paymentModeCode: expense.paymentMode?.code ?? null,
      paymentModeLabel: expense.paymentMode?.label ?? null,
      referenceNumber: expense.referenceNumber,
      clientId: expense.clientId,
      clientName: expense.client?.fullName ?? null,
      bookingId: expense.bookingId,
      bookingNumber: expense.booking?.bookingNumber ?? null,
      invoiceId: expense.invoiceId,
      invoiceNumber: expense.invoice?.invoiceNumber ?? null,
      notes: expense.notes,
      createdAt: expense.createdAt.toISOString(),
    };
  }

  private async buildWhereClause(
    companyId: string,
    query: ListExpensesQueryDto,
  ): Promise<Prisma.ExpenseWhereInput> {
    const where: Prisma.ExpenseWhereInput = {
      companyId,
      archivedAt: null,
      isActive: true,
    };

    if (query.bookingId) {
      where.bookingId = query.bookingId;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.categoryCode) {
      const category = await this.resolveCategory(companyId, query.categoryCode);
      where.categoryId = category.id;
    }

    if (query.dateFrom || query.dateTo) {
      where.expenseDate = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { vendorPerson: { contains: term, mode: 'insensitive' } },
        { referenceNumber: { contains: term, mode: 'insensitive' } },
        { booking: { bookingNumber: { contains: term, mode: 'insensitive' } } },
        { client: { fullName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  private buildOrderBy(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Prisma.ExpenseOrderByWithRelationInput {
    switch (sortBy) {
      case 'amount':
        return { amount: sortOrder };
      case 'createdAt':
        return { createdAt: sortOrder };
      default:
        return { expenseDate: sortOrder };
    }
  }

  private async resolveCategory(companyId: string, code: string) {
    const category = await this.prisma.masterData.findFirst({
      where: { companyId, category: 'expense_category', code, isActive: true },
    });

    if (!category) {
      throw new BadRequestException(`Invalid expense category: ${code}`);
    }

    return category;
  }

  private async resolvePaymentMode(companyId: string, code: string) {
    const mode = await this.prisma.masterData.findFirst({
      where: { companyId, category: 'payment_mode', code, isActive: true },
    });

    if (!mode) {
      throw new BadRequestException(`Invalid payment method: ${code}`);
    }

    return mode;
  }

  private async resolveBranch(
    companyId: string,
    bookingId?: string,
    clientId?: string,
  ) {
    if (bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: bookingId, companyId },
        select: { branchId: true },
      });

      if (booking) {
        return { id: booking.branchId };
      }
    }

    if (clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: clientId, companyId },
        select: { primaryBranchId: true },
      });

      if (client) {
        return { id: client.primaryBranchId };
      }
    }

    const branch = await this.prisma.companyBranch.findFirst({
      where: { companyId, isActive: true, archivedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    if (!branch) {
      throw new NotFoundException('No active branch found.');
    }

    return branch;
  }

  private async validateLinks(
    companyId: string,
    clientId?: string,
    bookingId?: string,
    invoiceId?: string,
  ) {
    if (clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: clientId, companyId, archivedAt: null },
      });
      if (!client) throw new NotFoundException('Client not found.');
    }

    if (bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: bookingId, companyId, archivedAt: null },
      });
      if (!booking) throw new NotFoundException('Booking not found.');
    }

    if (invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: invoiceId, companyId, archivedAt: null },
      });
      if (!invoice) throw new NotFoundException('Invoice not found.');
    }
  }
}
