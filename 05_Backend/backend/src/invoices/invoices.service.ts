import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import {
  InvoiceListItemDto,
  InvoiceResponseDto,
  PaginatedInvoicesResponseDto,
} from './dto/invoice-response.dto';
import {
  computeInvoiceStatus,
  defaultDueDate,
  generateInvoiceNumber,
  parseOptionalDate,
  roundMoney,
  toDateOnlyLabel,
} from './utils/invoice.utils';
import { getPaymentTotalForInvoice } from '../common/utils/financial.utils';
import { toDecimal } from '../bookings/utils/booking.utils';

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    client: {
      select: {
        id: true;
        fullName: true;
        mobile: true;
        email: true;
        address: true;
        city: true;
      };
    };
    booking: {
      include: {
        items: { orderBy: { sortOrder: 'asc' } };
      };
    };
  };
}>;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    companyId: string,
    query: ListInvoicesQueryDto,
  ): Promise<PaginatedInvoicesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhereClause(companyId, query);
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          client: { select: { fullName: true, mobile: true } },
          booking: { select: { bookingNumber: true, eventType: true, eventDate: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items: invoices.map((invoice) => this.mapListItem(invoice)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(companyId: string, id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.getInvoiceOrThrow(companyId, id);
    return this.mapInvoice(invoice);
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateInvoiceDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<InvoiceResponseDto> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, companyId, archivedAt: null },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            mobile: true,
            email: true,
            address: true,
            city: true,
          },
        },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    const existingInvoice = await this.prisma.invoice.findFirst({
      where: { companyId, bookingId: booking.id, archivedAt: null, isActive: true },
    });

    if (existingInvoice) {
      throw new ConflictException(
        `An active invoice already exists for booking ${booking.bookingNumber}.`,
      );
    }

    const subtotal = Number(booking.subtotal);
    const discount = Number(booking.discount);
    const totalAmount = Number(booking.totalAmount);
    const advanceAmount = Number(booking.advanceAmount);
    const balanceAmount = Number(booking.balanceAmount);
    const dueDate = dto.dueDate
      ? parseOptionalDate(dto.dueDate)
      : defaultDueDate(booking.eventDate);
    const status = computeInvoiceStatus(
      totalAmount,
      advanceAmount,
      balanceAmount,
      dueDate,
    );
    const invoiceNumber = await generateInvoiceNumber(() =>
      this.prisma.invoice.count({ where: { companyId } }),
    );

    const invoice = await this.prisma.invoice.create({
      data: {
        companyId,
        branchId: booking.branchId,
        clientId: booking.clientId,
        bookingId: booking.id,
        invoiceNumber,
        subtotal: toDecimal(subtotal),
        discount: toDecimal(discount),
        totalAmount: toDecimal(totalAmount),
        advanceAmount: toDecimal(advanceAmount),
        outstandingAmount: toDecimal(balanceAmount),
        status,
        invoiceDate: new Date(),
        dueDate,
        notes: dto.notes?.trim() || null,
        createdById: userId,
        updatedById: userId,
      },
      include: this.invoiceInclude(),
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'invoices',
      action: 'create',
      recordType: 'invoice',
      recordId: invoice.id,
      newValue: this.auditSnapshot(invoice),
      ipAddress,
      userAgent,
    });

    return this.mapInvoice(invoice);
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateInvoiceDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<InvoiceResponseDto> {
    const existing = await this.getInvoiceOrThrow(companyId, id);

    const totalAmount = Number(existing.totalAmount);
    let advanceAmount = Number(existing.advanceAmount);
    let outstandingAmount = Number(existing.outstandingAmount);
    let dueDate = existing.dueDate;

    if (dto.advanceAmount !== undefined) {
      const paymentTotal = await getPaymentTotalForInvoice(this.prisma, id);
      if (paymentTotal > 0) {
        throw new BadRequestException(
          'Advance amount is managed by recorded payments. Add or update payments instead.',
        );
      }

      advanceAmount = roundMoney(dto.advanceAmount);

      if (advanceAmount > totalAmount) {
        throw new BadRequestException('Advance amount cannot exceed grand total.');
      }

      outstandingAmount = roundMoney(Math.max(totalAmount - advanceAmount, 0));
    }

    if (dto.dueDate !== undefined) {
      dueDate = dto.dueDate ? parseOptionalDate(dto.dueDate) : null;
    }

    const status = computeInvoiceStatus(
      totalAmount,
      advanceAmount,
      outstandingAmount,
      dueDate,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.update({
        where: { id },
        data: {
          advanceAmount: toDecimal(advanceAmount),
          outstandingAmount: toDecimal(outstandingAmount),
          status,
          dueDate,
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
          updatedById: userId,
        },
        include: this.invoiceInclude(),
      });

      if (dto.advanceAmount !== undefined) {
        await tx.booking.update({
          where: { id: existing.bookingId },
          data: {
            advanceAmount: toDecimal(advanceAmount),
            balanceAmount: toDecimal(outstandingAmount),
            updatedById: userId,
          },
        });
      }

      return invoice;
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'invoices',
      action: 'update',
      recordType: 'invoice',
      recordId: updated.id,
      previousValue: this.auditSnapshot(existing),
      newValue: this.auditSnapshot(updated),
      ipAddress,
      userAgent,
    });

    return this.mapInvoice(updated);
  }

  async archive(
    companyId: string,
    userId: string,
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const existing = await this.getInvoiceOrThrow(companyId, id);

    await this.prisma.invoice.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: userId,
        archivedReason: 'Archived from invoices module',
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'invoices',
      action: 'archive',
      recordType: 'invoice',
      recordId: id,
      previousValue: this.auditSnapshot(existing),
      ipAddress,
      userAgent,
    });

    return { message: 'Invoice archived successfully.' };
  }

  private invoiceInclude() {
    return {
      client: {
        select: {
          id: true,
          fullName: true,
          mobile: true,
          email: true,
          address: true,
          city: true,
        },
      },
      booking: {
        include: {
          items: { orderBy: { sortOrder: 'asc' as const } },
        },
      },
    };
  }

  private async getInvoiceOrThrow(
    companyId: string,
    id: string,
  ): Promise<InvoiceWithRelations> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId, archivedAt: null },
      include: this.invoiceInclude(),
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    return invoice;
  }

  private mapListItem(
    invoice: Prisma.InvoiceGetPayload<{
      include: {
        client: { select: { fullName: true; mobile: true } };
        booking: { select: { bookingNumber: true; eventType: true; eventDate: true } };
      };
    }>,
  ): InvoiceListItemDto {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      bookingId: invoice.bookingId,
      bookingNumber: invoice.booking.bookingNumber,
      clientId: invoice.clientId,
      clientName: invoice.client.fullName,
      clientMobile: invoice.client.mobile,
      eventType: invoice.booking.eventType,
      eventDate: toDateOnlyLabel(invoice.booking.eventDate),
      totalAmount: Number(invoice.totalAmount),
      advanceAmount: Number(invoice.advanceAmount),
      balanceAmount: Number(invoice.outstandingAmount),
      status: invoice.status,
      invoiceDate: toDateOnlyLabel(invoice.invoiceDate) ?? invoice.invoiceDate.toISOString(),
      dueDate: toDateOnlyLabel(invoice.dueDate),
      createdAt: invoice.createdAt.toISOString(),
    };
  }

  private mapInvoice(invoice: InvoiceWithRelations): InvoiceResponseDto {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      bookingId: invoice.bookingId,
      clientId: invoice.clientId,
      subtotal: Number(invoice.subtotal),
      discount: Number(invoice.discount),
      totalAmount: Number(invoice.totalAmount),
      advanceAmount: Number(invoice.advanceAmount),
      balanceAmount: Number(invoice.outstandingAmount),
      status: invoice.status,
      invoiceDate: toDateOnlyLabel(invoice.invoiceDate) ?? invoice.invoiceDate.toISOString(),
      dueDate: toDateOnlyLabel(invoice.dueDate),
      notes: invoice.notes,
      isActive: invoice.isActive,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      client: {
        id: invoice.client.id,
        fullName: invoice.client.fullName,
        mobile: invoice.client.mobile,
        email: invoice.client.email,
        address: invoice.client.address,
        city: invoice.client.city,
      },
      booking: {
        id: invoice.booking.id,
        bookingNumber: invoice.booking.bookingNumber,
        eventType: invoice.booking.eventType,
        eventDate: toDateOnlyLabel(invoice.booking.eventDate),
        eventEndDate: toDateOnlyLabel(invoice.booking.eventEndDate),
        venue: invoice.booking.venue,
        city: invoice.booking.city,
        notes: invoice.booking.notes,
        items: invoice.booking.items.map((item) => ({
          id: item.id,
          serviceName: item.serviceName,
          quantity: Number(item.quantity),
          unit: item.unit,
          rate: Number(item.rate),
          days: Number(item.days),
          amount: Number(item.amount),
        })),
      },
    };
  }

  private buildWhereClause(
    companyId: string,
    query: ListInvoicesQueryDto,
  ): Prisma.InvoiceWhereInput {
    const where: Prisma.InvoiceWhereInput = {
      companyId,
      archivedAt: null,
    };

    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    if (query.dateFrom || query.dateTo) {
      where.invoiceDate = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: term, mode: 'insensitive' } },
        { booking: { bookingNumber: { contains: term, mode: 'insensitive' } } },
        { client: { fullName: { contains: term, mode: 'insensitive' } } },
        { client: { mobile: { contains: term } } },
      ];
    }

    return where;
  }

  private buildOrderBy(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Prisma.InvoiceOrderByWithRelationInput {
    switch (sortBy) {
      case 'invoiceNumber':
        return { invoiceNumber: sortOrder };
      case 'invoiceDate':
        return { invoiceDate: sortOrder };
      case 'totalAmount':
        return { totalAmount: sortOrder };
      case 'outstandingAmount':
        return { outstandingAmount: sortOrder };
      default:
        return { createdAt: sortOrder };
    }
  }

  private auditSnapshot(invoice: InvoiceWithRelations): Prisma.InputJsonValue {
    return {
      invoiceNumber: invoice.invoiceNumber,
      bookingId: invoice.bookingId,
      totalAmount: Number(invoice.totalAmount),
      status: invoice.status,
    };
  }
}
