import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { parseOptionalDate, toDateOnlyString } from '../clients/utils/client.utils';
import { CreateDeliveryDto, UpdateDeliveryDto } from './dto/create-delivery.dto';
import { ListDeliveriesQueryDto } from './dto/list-deliveries-query.dto';
import {
  DeliveryResponseDto,
  PaginatedDeliveriesResponseDto,
} from './dto/delivery-response.dto';
import {
  defaultTitleForType,
  DELIVERY_STATUSES,
  getDeliverableTypeLabel,
  getDeliveryStatusLabel,
} from './utils/delivery.utils';

type DeliveryWithRelations = Prisma.DeliveryGetPayload<{
  include: {
    client: { select: { fullName: true } };
    booking: { select: { bookingNumber: true } };
    album: { select: { name: true } };
  };
}>;

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    companyId: string,
    query: ListDeliveriesQueryDto,
  ): Promise<PaginatedDeliveriesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhereClause(companyId, query);

    const [deliveries, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        include: this.includeRelations(),
        orderBy: this.buildOrderBy(query.sortBy ?? 'createdAt', query.sortOrder ?? 'desc'),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      items: deliveries.map((delivery) => this.mapDelivery(delivery)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(companyId: string, id: string): Promise<DeliveryResponseDto> {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, companyId, archivedAt: null },
      include: this.includeRelations(),
    });

    if (!delivery) {
      throw new NotFoundException('Delivery item not found.');
    }

    return this.mapDelivery(delivery);
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateDeliveryDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<DeliveryResponseDto> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, companyId, archivedAt: null },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    const albumId = await this.resolveAlbumId(companyId, booking.id, dto.albumId);
    const status = dto.status && DELIVERY_STATUSES.includes(dto.status as never)
      ? dto.status
      : 'pending';
    const title =
      dto.title?.trim() ||
      defaultTitleForType(dto.deliverableType as Parameters<typeof defaultTitleForType>[0]);

    const deliveredDate = dto.deliveredDate ? parseOptionalDate(dto.deliveredDate) : null;
    const finalStatus = deliveredDate ? 'delivered' : status;

    const delivery = await this.prisma.delivery.create({
      data: {
        companyId,
        branchId: booking.branchId,
        clientId: booking.clientId,
        bookingId: booking.id,
        albumId,
        deliverableType: dto.deliverableType,
        title,
        status: finalStatus,
        expectedDate: dto.expectedDate ? parseOptionalDate(dto.expectedDate) : null,
        deliveredDate: finalStatus === 'delivered' ? deliveredDate ?? new Date() : deliveredDate,
        notes: dto.notes?.trim() || null,
        createdById: userId,
        updatedById: userId,
      },
      include: this.includeRelations(),
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'delivery',
      action: 'create',
      recordType: 'delivery',
      recordId: delivery.id,
      newValue: {
        title: delivery.title,
        bookingId: delivery.bookingId,
        deliverableType: delivery.deliverableType,
        status: delivery.status,
      },
      ipAddress,
      userAgent,
    });

    return this.mapDelivery(delivery);
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateDeliveryDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<DeliveryResponseDto> {
    const existing = await this.prisma.delivery.findFirst({
      where: { id, companyId, archivedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Delivery item not found.');
    }

    let albumId: string | null | undefined = undefined;
    if (dto.albumId !== undefined) {
      albumId = dto.albumId
        ? await this.resolveAlbumId(companyId, existing.bookingId, dto.albumId)
        : null;
    }

    let status = dto.status ?? existing.status;
    let deliveredDate =
      dto.deliveredDate !== undefined
        ? dto.deliveredDate
          ? parseOptionalDate(dto.deliveredDate)
          : null
        : existing.deliveredDate;

    if (status === 'delivered' && !deliveredDate) {
      deliveredDate = new Date();
    }

    if (status !== 'delivered' && dto.deliveredDate === null) {
      deliveredDate = null;
    }

    if (deliveredDate && status !== 'delivered') {
      status = 'delivered';
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        ...(dto.deliverableType !== undefined ? { deliverableType: dto.deliverableType } : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(albumId !== undefined ? { albumId } : {}),
        status,
        ...(dto.expectedDate !== undefined
          ? { expectedDate: dto.expectedDate ? parseOptionalDate(dto.expectedDate) : null }
          : {}),
        deliveredDate,
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        updatedById: userId,
      },
      include: this.includeRelations(),
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'delivery',
      action: 'update',
      recordType: 'delivery',
      recordId: updated.id,
      previousValue: {
        status: existing.status,
        title: existing.title,
        deliveredDate: existing.deliveredDate?.toISOString() ?? null,
      },
      newValue: {
        status: updated.status,
        title: updated.title,
        deliveredDate: updated.deliveredDate?.toISOString() ?? null,
      },
      ipAddress,
      userAgent,
    });

    return this.mapDelivery(updated);
  }

  async archive(
    companyId: string,
    userId: string,
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const existing = await this.prisma.delivery.findFirst({
      where: { id, companyId, archivedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Delivery item not found.');
    }

    await this.prisma.delivery.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: userId,
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'delivery',
      action: 'archive',
      recordType: 'delivery',
      recordId: id,
      previousValue: { title: existing.title, status: existing.status },
      ipAddress,
      userAgent,
    });

    return { message: 'Delivery item archived successfully.' };
  }

  private async resolveAlbumId(
    companyId: string,
    bookingId: string,
    albumId?: string | null,
  ): Promise<string | null> {
    if (!albumId) {
      return null;
    }

    const album = await this.prisma.album.findFirst({
      where: { id: albumId, companyId, bookingId, archivedAt: null },
    });

    if (!album) {
      throw new BadRequestException('Album not found for this booking.');
    }

    return album.id;
  }

  private buildWhereClause(
    companyId: string,
    query: ListDeliveriesQueryDto,
  ): Prisma.DeliveryWhereInput {
    const where: Prisma.DeliveryWhereInput = {
      companyId,
      archivedAt: null,
    };

    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    if (query.deliverableType && query.deliverableType !== 'all') {
      where.deliverableType = query.deliverableType;
    }

    if (query.bookingId) {
      where.bookingId = query.bookingId;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    const term = query.search?.trim();
    if (term) {
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
        { client: { fullName: { contains: term, mode: 'insensitive' } } },
        { booking: { bookingNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  private buildOrderBy(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Prisma.DeliveryOrderByWithRelationInput {
    switch (sortBy) {
      case 'expectedDate':
        return { expectedDate: sortOrder };
      case 'deliveredDate':
        return { deliveredDate: sortOrder };
      case 'title':
        return { title: sortOrder };
      case 'status':
        return { status: sortOrder };
      default:
        return { createdAt: sortOrder };
    }
  }

  private includeRelations() {
    return {
      client: { select: { fullName: true } },
      booking: { select: { bookingNumber: true } },
      album: { select: { name: true } },
    } as const;
  }

  private mapDelivery(delivery: DeliveryWithRelations): DeliveryResponseDto {
    return {
      id: delivery.id,
      clientId: delivery.clientId,
      clientName: delivery.client.fullName,
      bookingId: delivery.bookingId,
      bookingNumber: delivery.booking.bookingNumber,
      albumId: delivery.albumId,
      albumName: delivery.album?.name ?? null,
      deliverableType: delivery.deliverableType,
      deliverableTypeLabel: getDeliverableTypeLabel(delivery.deliverableType),
      title: delivery.title,
      status: delivery.status,
      statusLabel: getDeliveryStatusLabel(delivery.status),
      expectedDate: toDateOnlyString(delivery.expectedDate),
      deliveredDate: toDateOnlyString(delivery.deliveredDate),
      notes: delivery.notes,
      createdAt: delivery.createdAt.toISOString(),
      updatedAt: delivery.updatedAt.toISOString(),
    };
  }
}
