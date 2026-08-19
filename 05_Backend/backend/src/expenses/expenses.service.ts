import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MasterData, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateStaffPaymentDto } from './dto/create-staff-payment.dto';
import { UpdateStaffPaymentDto } from './dto/update-staff-payment.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { ExpenseResponseDto, PaginatedExpensesResponseDto } from './dto/expense-response.dto';
import { parseOptionalDate } from '../invoices/utils/invoice.utils';
import { roundMoney, toDecimal } from '../bookings/utils/booking.utils';

type ExpenseWithRelations = Prisma.ExpenseGetPayload<{
  include: {
    category: { select: { code: true; label: true } };
    paymentMode: { select: { code: true; label: true } };
    client: { select: { fullName: true } };
    booking: { select: { bookingNumber: true } };
    staff: { select: { fullName: true } };
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

    const [expenses, total, amountAgg] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: this.expenseInclude(),
        orderBy: this.buildOrderBy(query.sortBy ?? 'expenseDate', query.sortOrder ?? 'desc'),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    return {
      items: expenses.map((expense) => this.mapExpense(expense)),
      total,
      totalAmount: roundMoney(Number(amountAgg._sum.amount ?? 0)),
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
    const links = await this.resolveParentLinks(companyId, {
      clientId: dto.clientId,
      bookingId: dto.bookingId,
      invoiceId: dto.invoiceId,
      staffId: dto.staffId,
    });
    const paymentMode = dto.paymentModeCode
      ? await this.resolvePaymentMode(companyId, dto.paymentModeCode)
      : null;

    const expense = await this.prisma.expense.create({
      data: {
        companyId,
        branchId: links.branchId,
        categoryId: category.id,
        clientId: links.clientId,
        bookingId: links.bookingId,
        staffId: links.staffId,
        invoiceId: links.invoiceId,
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

  async createStaffPayment(
    companyId: string,
    userId: string,
    dto: CreateStaffPaymentDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ExpenseResponseDto> {
    const payload = await this.buildStaffPaymentExpensePayload(companyId, dto);
    return this.create(companyId, userId, payload, ipAddress, userAgent);
  }

  async updateStaffPayment(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateStaffPaymentDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ExpenseResponseDto> {
    const existing = await this.getExpenseOrThrow(companyId, id);
    if (existing.category.code !== 'staff') {
      throw new BadRequestException('This expense is not a staff payment.');
    }

    const payload = await this.buildStaffPaymentExpensePayload(companyId, {
      staffId: dto.staffId ?? existing.staffId ?? '',
      amount: dto.amount ?? Number(existing.amount),
      paymentDate: dto.paymentDate ?? existing.expenseDate.toISOString().slice(0, 10),
      paymentModeCode:
        dto.paymentModeCode ?? existing.paymentMode?.code ?? 'cash',
      bookingId: dto.bookingId !== undefined ? dto.bookingId : existing.bookingId ?? undefined,
      referenceNumber:
        dto.referenceNumber !== undefined
          ? dto.referenceNumber
          : existing.referenceNumber ?? undefined,
      notes: dto.notes !== undefined ? dto.notes : existing.notes ?? undefined,
    });

    return this.update(
      companyId,
      userId,
      id,
      {
        ...payload,
        bookingId: payload.bookingId ?? null,
        clientId: payload.clientId ?? null,
        staffId: payload.staffId ?? null,
      },
      ipAddress,
      userAgent,
    );
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

    const parentFieldsTouched =
      dto.clientId !== undefined ||
      dto.bookingId !== undefined ||
      dto.invoiceId !== undefined ||
      dto.staffId !== undefined;

    const bookingChanged =
      dto.bookingId !== undefined && dto.bookingId !== existing.bookingId;

    const links = parentFieldsTouched
      ? await this.resolveParentLinks(companyId, {
          clientId:
            dto.clientId !== undefined
              ? dto.clientId
              : bookingChanged && dto.bookingId
                ? null
                : existing.clientId,
          bookingId: dto.bookingId !== undefined ? dto.bookingId : existing.bookingId,
          invoiceId: dto.invoiceId !== undefined ? dto.invoiceId : existing.invoiceId,
          staffId: dto.staffId !== undefined ? dto.staffId : existing.staffId,
        })
      : null;

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
        ...(links
          ? {
              clientId: links.clientId,
              bookingId: links.bookingId,
              staffId: links.staffId,
              invoiceId: links.invoiceId,
              branchId: links.branchId,
            }
          : {}),
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

  private expenseInclude(): {
    category: { select: { code: true; label: true } };
    paymentMode: { select: { code: true; label: true } };
    client: { select: { fullName: true } };
    booking: { select: { bookingNumber: true } };
    staff: { select: { fullName: true } };
    invoice: { select: { invoiceNumber: true } };
  } {
    return {
      category: { select: { code: true, label: true } },
      paymentMode: { select: { code: true, label: true } },
      client: { select: { fullName: true } },
      booking: { select: { bookingNumber: true } },
      staff: { select: { fullName: true } },
      invoice: { select: { invoiceNumber: true } },
    };
  }

  private async getExpenseOrThrow(companyId: string, id: string): Promise<ExpenseWithRelations> {
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
      staffId: expense.staffId,
      staffName: expense.staff?.fullName ?? null,
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

    if (query.staffId) {
      where.staffId = query.staffId;
    }

    if (query.categoryCode) {
      const category = await this.resolveCategory(companyId, query.categoryCode);
      where.categoryId = category.id;
    }

    if (query.paymentModeCode) {
      const paymentMode = await this.resolvePaymentMode(companyId, query.paymentModeCode);
      where.paymentModeId = paymentMode.id;
    }

    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('Start date must be on or before end date.');
    }

    if (query.dateFrom || query.dateTo) {
      where.expenseDate = {
        ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
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

  private async resolveCategory(companyId: string, code: string): Promise<MasterData> {
    const category = await this.prisma.masterData.findFirst({
      where: { companyId, category: 'expense_category', code, isActive: true },
    });

    if (!category) {
      throw new BadRequestException(`Invalid expense category: ${code}`);
    }

    return category;
  }

  private async resolvePaymentMode(companyId: string, code: string): Promise<MasterData> {
    const mode = await this.prisma.masterData.findFirst({
      where: { companyId, category: 'payment_mode', code, isActive: true },
    });

    if (!mode) {
      throw new BadRequestException(`Invalid payment method: ${code}`);
    }

    return mode;
  }

  private async resolveDefaultBranch(
    companyId: string,
    clientId?: string | null,
  ): Promise<{ id: string }> {
    if (clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: clientId, companyId, archivedAt: null },
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

  private async resolveParentLinks(
    companyId: string,
    input: {
      clientId?: string | null;
      bookingId?: string | null;
      invoiceId?: string | null;
      staffId?: string | null;
    },
  ): Promise<{
    clientId: string | null;
    bookingId: string | null;
    invoiceId: string | null;
    staffId: string | null;
    branchId: string;
  }> {
    const requestedBookingId = input.bookingId || null;
    const requestedClientId = input.clientId || null;
    const requestedInvoiceId = input.invoiceId || null;
    const requestedStaffId = input.staffId || null;

    let booking: { id: string; clientId: string; branchId: string } | null = null;
    if (requestedBookingId) {
      booking = await this.prisma.booking.findFirst({
        where: { id: requestedBookingId, companyId, archivedAt: null },
        select: { id: true, clientId: true, branchId: true },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found.');
      }

      if (requestedClientId && requestedClientId !== booking.clientId) {
        throw new BadRequestException(
          'Expense client must match the selected booking client.',
        );
      }
    } else if (requestedClientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: requestedClientId, companyId, archivedAt: null },
        select: { id: true },
      });
      if (!client) {
        throw new NotFoundException('Client not found.');
      }
    }

    if (requestedInvoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: requestedInvoiceId, companyId, archivedAt: null },
        select: { id: true, bookingId: true },
      });

      if (!invoice) {
        throw new BadRequestException('Invoice not found in this company.');
      }

      if (booking && invoice.bookingId !== booking.id) {
        throw new BadRequestException('Invoice does not belong to the selected booking.');
      }
    }

    if (requestedStaffId) {
      const staffMember = await this.prisma.staff.findFirst({
        where: { id: requestedStaffId, companyId, archivedAt: null },
        select: { id: true },
      });
      if (!staffMember) {
        throw new BadRequestException('Staff member not found in this company.');
      }
    }

    const canonicalClientId = booking ? booking.clientId : requestedClientId;
    const branch = booking
      ? { id: booking.branchId }
      : await this.resolveDefaultBranch(companyId, canonicalClientId);

    return {
      clientId: canonicalClientId,
      bookingId: booking?.id ?? null,
      invoiceId: requestedInvoiceId,
      staffId: requestedStaffId,
      branchId: branch.id,
    };
  }

  private async buildStaffPaymentExpensePayload(
    companyId: string,
    dto: CreateStaffPaymentDto,
  ): Promise<CreateExpenseDto> {
    if (!dto.staffId) {
      throw new BadRequestException('Select an active staff member.');
    }

    const staffMember = await this.prisma.staff.findFirst({
      where: { id: dto.staffId, companyId, archivedAt: null, isActive: true },
    });

    if (!staffMember) {
      throw new BadRequestException('Select an active staff member.');
    }

    let booking: { id: string; bookingNumber: string; clientId: string } | null = null;
    if (dto.bookingId) {
      booking = await this.prisma.booking.findFirst({
        where: { id: dto.bookingId, companyId, archivedAt: null },
        select: { id: true, bookingNumber: true, clientId: true },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found.');
      }
    }

    const description = booking
      ? `Staff Payment — ${staffMember.fullName} (${booking.bookingNumber})`
      : `Staff Payment — ${staffMember.fullName}`;

    return {
      categoryCode: 'staff',
      amount: dto.amount,
      expenseDate: dto.paymentDate,
      description,
      vendorPerson: staffMember.fullName,
      paymentModeCode: dto.paymentModeCode,
      referenceNumber: dto.referenceNumber,
      bookingId: booking?.id,
      clientId: booking?.clientId,
      staffId: staffMember.id,
      notes: dto.notes,
    };
  }
}
