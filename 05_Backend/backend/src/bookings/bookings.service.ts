import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBookingDto, CreateBookingItemDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import {
  CalendarBookingsQueryDto,
  ListBookingsQueryDto,
} from './dto/list-bookings-query.dto';
import {
  BookingResponseDto,
  CalendarBookingEventDto,
  PaginatedBookingsResponseDto,
  ServiceRateResponseDto,
} from './dto/booking-response.dto';
import {
  calculateBookingTotals,
  calculateItemAmount,
  parseOptionalDateTime,
  roundMoney,
  toDateOnlyLabel,
  toDecimal,
  toIsoDateString,
} from './utils/booking.utils';
import { getStaffRoleLabel } from '../staff/utils/staff.utils';
import { syncInvoiceAndBookingFinancials } from '../common/utils/financial.utils';
import { toDateOnlyString } from '../clients/utils/client.utils';

type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    client: { select: { id: true; fullName: true; mobile: true; email: true } };
    status: true;
    items: { orderBy: { sortOrder: 'asc' } };
  };
}>;

type BookingDetailWithRelations = Prisma.BookingGetPayload<{
  include: {
    client: { select: { id: true; fullName: true; mobile: true; email: true } };
    status: true;
    items: { orderBy: { sortOrder: 'asc' } };
    staffAssignments: {
      include: { staff: { select: { id: true; staffCode: true; fullName: true } } };
    };
  };
}>;

interface PreparedItem {
  serviceRateId?: string;
  serviceName: string;
  quantity: number;
  unit: string;
  rate: number;
  days: number;
  amount: number;
  notes?: string;
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    companyId: string,
    query: ListBookingsQueryDto,
  ): Promise<PaginatedBookingsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = await this.buildWhereClause(companyId, query);

    const sortBy = query.sortBy ?? 'eventDate';
    const sortOrder = query.sortOrder ?? 'desc';

    if (sortBy === 'clientName') {
      const bookings = await this.prisma.booking.findMany({
        where,
        include: this.bookingInclude(),
      });

      const mapped = bookings.map((booking) => this.mapBooking(booking));
      mapped.sort((a, b) => {
        const direction = sortOrder === 'asc' ? 1 : -1;
        return a.client.fullName.localeCompare(b.client.fullName) * direction;
      });

      const total = mapped.length;
      const start = (page - 1) * limit;

      return {
        items: mapped.slice(start, start + limit),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    const orderBy = this.buildOrderBy(sortBy, sortOrder);
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: this.bookingInclude(),
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items: bookings.map((booking) => this.mapBooking(booking)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(companyId: string, id: string): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, companyId, archivedAt: null },
      include: this.bookingDetailInclude(),
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    return this.mapBooking(booking);
  }

  async getCalendar(
    companyId: string,
    query: CalendarBookingsQueryDto,
  ): Promise<CalendarBookingEventDto[]> {
    const where: Prisma.BookingWhereInput = {
      companyId,
      archivedAt: null,
      eventDate: { not: null },
    };

    if (query.dateFrom && query.dateTo) {
      const rangeStart = new Date(query.dateFrom);
      const rangeEnd = new Date(`${query.dateTo}T23:59:59.999Z`);

      where.AND = [
        { eventDate: { lte: rangeEnd } },
        {
          OR: [
            { eventEndDate: { gte: rangeStart } },
            { eventEndDate: null, eventDate: { gte: rangeStart } },
          ],
        },
      ];
    } else if (query.dateFrom || query.dateTo) {
      where.eventDate = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        client: { select: { fullName: true } },
        status: true,
      },
      orderBy: { eventDate: 'asc' },
    });

    return bookings.map((booking) => ({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      clientName: booking.client.fullName,
      eventType: booking.eventType,
      eventDate: toIsoDateString(booking.eventDate),
      eventEndDate: toIsoDateString(booking.eventEndDate),
      status: booking.status.label,
      statusCode: booking.status.code,
      totalAmount: Number(booking.totalAmount),
      balanceAmount: Number(booking.balanceAmount),
      venue: booking.venue,
    }));
  }

  async getServiceRates(companyId: string): Promise<ServiceRateResponseDto[]> {
    const rates = await this.prisma.serviceRate.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    return rates.map((rate) => ({
      id: rate.id,
      code: rate.code,
      name: rate.name,
      category: rate.category,
      defaultRate: Number(rate.defaultRate),
      unit: rate.unit,
      sortOrder: rate.sortOrder,
    }));
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateBookingDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BookingResponseDto> {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, companyId, archivedAt: null, isActive: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found.');
    }

    const branch = await this.prisma.companyBranch.findFirst({
      where: { id: client.primaryBranchId, companyId, isActive: true, archivedAt: null },
    });

    if (!branch) {
      throw new NotFoundException('No active branch found for this client.');
    }

    const status = await this.resolveStatus(companyId, dto.statusCode ?? 'enquiry');
    const preparedItems = await this.prepareItems(companyId, dto.items);
    const discount = roundMoney(dto.discount ?? 0);
    const advanceAmount = roundMoney(dto.advanceAmount ?? 0);
    const totals = calculateBookingTotals(preparedItems, discount, advanceAmount);
    const bookingNumber = await this.generateBookingNumber(companyId);

    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          companyId,
          branchId: branch.id,
          clientId: client.id,
          bookingNumber,
          eventType: dto.eventType,
          statusId: status.id,
          eventDate: parseOptionalDateTime(dto.eventDate),
          eventEndDate: parseOptionalDateTime(dto.eventEndDate),
          venue: dto.venue?.trim() || null,
          city: dto.city?.trim() || null,
          notes: dto.notes?.trim() || null,
          subtotal: toDecimal(totals.subtotal),
          discount: toDecimal(discount),
          totalAmount: toDecimal(totals.totalAmount),
          advanceAmount: toDecimal(advanceAmount),
          balanceAmount: toDecimal(totals.balanceAmount),
          createdById: userId,
          updatedById: userId,
          items: {
            create: preparedItems.map((item, index) => ({
              serviceRateId: item.serviceRateId ?? null,
              serviceName: item.serviceName,
              quantity: toDecimal(item.quantity),
              unit: item.unit,
              rate: toDecimal(item.rate),
              days: toDecimal(item.days),
              amount: toDecimal(item.amount),
              notes: item.notes ?? null,
              sortOrder: index,
            })),
          },
        },
        include: this.bookingInclude(),
      });

      return created;
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'bookings',
      action: 'create',
      recordType: 'booking',
      recordId: booking.id,
      newValue: this.auditSnapshot(booking),
      ipAddress,
      userAgent,
    });

    return this.mapBooking(booking);
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateBookingDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BookingResponseDto> {
    const existing = await this.getBookingOrThrow(companyId, id);

    if (dto.clientId && dto.clientId !== existing.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, companyId, archivedAt: null, isActive: true },
      });

      if (!client) {
        throw new NotFoundException('Client not found.');
      }
    }

    const status = dto.statusCode
      ? await this.resolveStatus(companyId, dto.statusCode)
      : null;

    const preparedItems = dto.items
      ? await this.prepareItems(companyId, dto.items)
      : existing.items.map((item) => ({
          serviceRateId: item.serviceRateId ?? undefined,
          serviceName: item.serviceName,
          quantity: Number(item.quantity),
          unit: item.unit,
          rate: Number(item.rate),
          days: Number(item.days),
          amount: Number(item.amount),
          notes: item.notes ?? undefined,
        }));

    const discount = roundMoney(dto.discount ?? Number(existing.discount));
    const advanceAmount = roundMoney(dto.advanceAmount ?? Number(existing.advanceAmount));
    const totals = calculateBookingTotals(preparedItems, discount, advanceAmount);

    const activeInvoice = await this.prisma.invoice.findFirst({
      where: { companyId, bookingId: id, archivedAt: null, isActive: true },
      select: { id: true },
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.bookingItem.deleteMany({ where: { bookingId: id } });
      }

      return tx.booking.update({
        where: { id },
        data: {
          clientId: dto.clientId,
          eventType: dto.eventType,
          statusId: status?.id,
          eventDate: dto.eventDate !== undefined ? parseOptionalDateTime(dto.eventDate) : undefined,
          eventEndDate:
            dto.eventEndDate !== undefined
              ? parseOptionalDateTime(dto.eventEndDate)
              : undefined,
          venue: dto.venue !== undefined ? dto.venue?.trim() || null : undefined,
          city: dto.city !== undefined ? dto.city?.trim() || null : undefined,
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
          subtotal: toDecimal(totals.subtotal),
          discount: toDecimal(discount),
          totalAmount: toDecimal(totals.totalAmount),
          ...(activeInvoice
            ? {}
            : {
                advanceAmount: toDecimal(advanceAmount),
                balanceAmount: toDecimal(totals.balanceAmount),
              }),
          updatedById: userId,
          ...(dto.items
            ? {
                items: {
                  create: preparedItems.map((item, index) => ({
                    serviceRateId: item.serviceRateId ?? null,
                    serviceName: item.serviceName,
                    quantity: toDecimal(item.quantity),
                    unit: item.unit,
                    rate: toDecimal(item.rate),
                    days: toDecimal(item.days),
                    amount: toDecimal(item.amount),
                    notes: item.notes ?? null,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
        },
        include: this.bookingInclude(),
      });
    });

    if (activeInvoice) {
      await this.prisma.$transaction(async (tx) => {
        if (dto.items !== undefined || dto.discount !== undefined) {
          await tx.invoice.update({
            where: { id: activeInvoice.id },
            data: {
              subtotal: toDecimal(totals.subtotal),
              discount: toDecimal(discount),
              totalAmount: toDecimal(totals.totalAmount),
              updatedById: userId,
            },
          });
        }

        await syncInvoiceAndBookingFinancials(tx, activeInvoice.id);
      });
    }

    const bookingForResponse = activeInvoice
      ? await this.getBookingOrThrow(companyId, id)
      : updated;

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'bookings',
      action: 'update',
      recordType: 'booking',
      recordId: updated.id,
      previousValue: this.auditSnapshot(existing),
      newValue: this.auditSnapshot(bookingForResponse),
      ipAddress,
      userAgent,
    });

    return this.mapBooking(bookingForResponse);
  }

  async archive(
    companyId: string,
    userId: string,
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const existing = await this.getBookingOrThrow(companyId, id);

    await this.prisma.booking.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: userId,
        archivedReason: 'Archived from bookings module',
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'bookings',
      action: 'archive',
      recordType: 'booking',
      recordId: id,
      previousValue: this.auditSnapshot(existing),
      ipAddress,
      userAgent,
    });

    return { message: 'Booking deleted successfully.' };
  }

  private bookingInclude() {
    return {
      client: { select: { id: true, fullName: true, mobile: true, email: true } },
      status: true,
      items: { orderBy: { sortOrder: 'asc' as const } },
    };
  }

  private bookingDetailInclude() {
    return {
      ...this.bookingInclude(),
      staffAssignments: {
        where: { archivedAt: null },
        include: {
          staff: { select: { id: true, staffCode: true, fullName: true } },
        },
        orderBy: [{ role: 'asc' as const }, { createdAt: 'asc' as const }],
      },
    };
  }

  private async getBookingOrThrow(companyId: string, id: string): Promise<BookingWithRelations> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, companyId, archivedAt: null },
      include: this.bookingInclude(),
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    return booking;
  }

  private mapBooking(booking: BookingWithRelations | BookingDetailWithRelations): BookingResponseDto {
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      clientId: booking.clientId,
      client: {
        id: booking.client.id,
        fullName: booking.client.fullName,
        mobile: booking.client.mobile,
        email: booking.client.email,
      },
      eventType: booking.eventType,
      eventDate: toDateOnlyLabel(booking.eventDate),
      eventEndDate: toDateOnlyLabel(booking.eventEndDate),
      venue: booking.venue,
      city: booking.city,
      notes: booking.notes,
      status: booking.status.label,
      statusCode: booking.status.code,
      items: booking.items.map((item) => ({
        id: item.id,
        serviceRateId: item.serviceRateId,
        serviceName: item.serviceName,
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        days: Number(item.days),
        amount: Number(item.amount),
        notes: item.notes,
      })),
      servicesSummary: booking.items.map((item) => item.serviceName).join(', '),
      subtotal: Number(booking.subtotal),
      discount: Number(booking.discount),
      totalAmount: Number(booking.totalAmount),
      advanceAmount: Number(booking.advanceAmount),
      balanceAmount: Number(booking.balanceAmount),
      isActive: booking.isActive,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      ...( 'staffAssignments' in booking && booking.staffAssignments
        ? {
            team: booking.staffAssignments.map((assignment) => ({
              id: assignment.id,
              staffId: assignment.staffId,
              staffCode: assignment.staff.staffCode,
              staffName: assignment.staff.fullName,
              role: assignment.role,
              roleLabel: getStaffRoleLabel(assignment.role),
              assignmentDate: toDateOnlyString(assignment.assignmentDate),
              agreedRate:
                assignment.agreedRate !== null ? Number(assignment.agreedRate) : null,
              notes: assignment.notes,
              expenseId: assignment.expenseId,
            })),
          }
        : {}),
    };
  }

  private async buildWhereClause(
    companyId: string,
    query: ListBookingsQueryDto,
  ): Promise<Prisma.BookingWhereInput> {
    const where: Prisma.BookingWhereInput = {
      companyId,
      archivedAt: null,
    };

    if (query.status && query.status !== 'all') {
      const status = await this.resolveStatus(companyId, query.status);
      where.statusId = status.id;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.dateFrom && query.dateTo) {
      const rangeStart = new Date(query.dateFrom);
      const rangeEnd = new Date(`${query.dateTo}T23:59:59.999Z`);

      where.AND = [
        { eventDate: { not: null } },
        { eventDate: { lte: rangeEnd } },
        {
          OR: [
            { eventEndDate: { gte: rangeStart } },
            { eventEndDate: null, eventDate: { gte: rangeStart } },
          ],
        },
      ];
    } else if (query.dateFrom || query.dateTo) {
      where.eventDate = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { bookingNumber: { contains: term, mode: 'insensitive' } },
        { eventType: { contains: term, mode: 'insensitive' } },
        { venue: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { client: { fullName: { contains: term, mode: 'insensitive' } } },
        { client: { mobile: { contains: term } } },
      ];
    }

    return where;
  }

  private buildOrderBy(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Prisma.BookingOrderByWithRelationInput {
    switch (sortBy) {
      case 'bookingNumber':
        return { bookingNumber: sortOrder };
      case 'eventType':
        return { eventType: sortOrder };
      case 'totalAmount':
        return { totalAmount: sortOrder };
      case 'balanceAmount':
        return { balanceAmount: sortOrder };
      case 'createdAt':
        return { createdAt: sortOrder };
      default:
        return { eventDate: sortOrder };
    }
  }

  private async resolveStatus(companyId: string, code: string) {
    const status = await this.prisma.masterData.findFirst({
      where: { companyId, category: 'booking_status', code, isActive: true },
    });

    if (!status) {
      throw new BadRequestException(`Invalid booking status: ${code}`);
    }

    return status;
  }

  private async prepareItems(
    companyId: string,
    items: CreateBookingItemDto[],
  ): Promise<PreparedItem[]> {
    const prepared: PreparedItem[] = [];

    for (const item of items) {
      let serviceName = item.serviceName.trim();
      let unit = item.unit;
      let rate = roundMoney(item.rate);
      let quantity = roundMoney(item.quantity);
      let days = roundMoney(item.days);

      if (item.serviceRateId) {
        const serviceRate = await this.prisma.serviceRate.findFirst({
          where: { id: item.serviceRateId, companyId, isActive: true },
        });

        if (!serviceRate) {
          throw new BadRequestException(`Invalid service rate: ${item.serviceName}`);
        }

        serviceName = serviceRate.name;
        unit = serviceRate.unit;
        if (item.rate === undefined || item.rate === null) {
          rate = Number(serviceRate.defaultRate);
        }
      }

      if (unit === 'day' && days <= 0) {
        throw new BadRequestException(`${serviceName}: days must be greater than 0.`);
      }

      if (unit === 'piece' && quantity <= 0) {
        throw new BadRequestException(`${serviceName}: quantity must be greater than 0.`);
      }

      const amount = calculateItemAmount(unit, rate, quantity, days);

      prepared.push({
        serviceRateId: item.serviceRateId,
        serviceName,
        quantity: unit === 'day' ? 1 : quantity,
        unit,
        rate,
        days: unit === 'day' ? days : 1,
        amount,
        notes: item.notes?.trim(),
      });
    }

    return prepared;
  }

  private async generateBookingNumber(companyId: string): Promise<string> {
    const count = await this.prisma.booking.count({ where: { companyId } });
    return `BK-${String(count + 1).padStart(6, '0')}`;
  }

  private auditSnapshot(booking: BookingWithRelations): Prisma.InputJsonValue {
    return {
      bookingNumber: booking.bookingNumber,
      clientId: booking.clientId,
      eventType: booking.eventType,
      totalAmount: Number(booking.totalAmount),
      status: booking.status.code,
    };
  }
}
