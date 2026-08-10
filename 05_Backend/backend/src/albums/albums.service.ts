import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { ListAlbumsQueryDto } from './dto/list-albums-query.dto';
import {
  AlbumPhotoDto,
  AlbumResponseDto,
  PaginatedAlbumsResponseDto,
} from './dto/album-response.dto';
import {
  ALBUM_STATUS_CODES,
  ALBUM_TYPE_CODES,
  toDateOnlyLabel,
} from './utils/album.utils';
import { parseOptionalDate } from '../invoices/utils/invoice.utils';
import { roundMoney, toDecimal } from '../bookings/utils/booking.utils';
import { AlbumExpenseService } from './album-expense.service';

type AlbumBase = Prisma.AlbumGetPayload<{
  include: {
    client: { select: { fullName: true } };
    booking: { select: { bookingNumber: true } };
    gallery: { select: { id: true; name: true } };
    _count: { select: { photos: true } };
  };
}>;

type AlbumPhotoWithGallery = Prisma.AlbumPhotoGetPayload<{
  include: {
    galleryPhoto: {
      select: { id: true; galleryId: true; originalName: true; mimeType: true };
    };
  };
}>;

type AlbumWithRelations = AlbumBase & {
  photos?: AlbumPhotoWithGallery[];
};

@Injectable()
export class AlbumsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly albumExpenseService: AlbumExpenseService,
  ) {}

  async findAll(
    companyId: string,
    query: ListAlbumsQueryDto,
  ): Promise<PaginatedAlbumsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhereClause(companyId, query);

    const [albums, total] = await Promise.all([
      this.prisma.album.findMany({
        where,
        include: this.albumInclude(false),
        orderBy: this.buildOrderBy(query.sortBy ?? 'createdAt', query.sortOrder ?? 'desc'),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.album.count({ where }),
    ]);

    return {
      items: albums.map((album) => this.mapAlbum(album as AlbumWithRelations)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(
    companyId: string,
    id: string,
    actorUserId?: string,
  ): Promise<AlbumResponseDto> {
    let album = await this.getAlbumOrThrow(companyId, id, true);
    album = await this.ensureVendorExpenseSynced(companyId, actorUserId, album);
    return this.mapAlbum(album as AlbumWithRelations, true);
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateAlbumDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AlbumResponseDto> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, companyId, archivedAt: null },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    const galleryId = await this.resolveGalleryId(companyId, booking.id, dto.galleryId);

    const albumType =
      dto.albumType && ALBUM_TYPE_CODES.includes(dto.albumType as never)
        ? dto.albumType
        : 'standard';

    const status =
      dto.status && ALBUM_STATUS_CODES.includes(dto.status as never)
        ? dto.status
        : 'pending';

    const album = await this.prisma.album.create({
      data: {
        companyId,
        branchId: booking.branchId,
        clientId: booking.clientId,
        bookingId: booking.id,
        galleryId,
        name: dto.name.trim(),
        albumType,
        albumPrice: toDecimal(dto.albumPrice ?? 0),
        pageCount: dto.pageCount ?? 0,
        status,
        orderDate: dto.orderDate ? parseOptionalDate(dto.orderDate) : new Date(),
        expectedDeliveryDate: dto.expectedDeliveryDate
          ? parseOptionalDate(dto.expectedDeliveryDate)
          : null,
        actualDeliveryDate: dto.actualDeliveryDate
          ? parseOptionalDate(dto.actualDeliveryDate)
          : null,
        vendorName: dto.vendorName?.trim() || null,
        vendorExpense: toDecimal(dto.vendorExpense ?? 0),
        notes: dto.notes?.trim() || null,
        createdById: userId,
        updatedById: userId,
      },
      include: this.albumInclude(true),
    });

    await this.albumExpenseService.syncVendorExpense(
      companyId,
      userId,
      {
        id: album.id,
        companyId: album.companyId,
        branchId: album.branchId,
        clientId: album.clientId,
        bookingId: album.bookingId,
        name: album.name,
        vendorName: album.vendorName,
        vendorExpense: album.vendorExpense,
        vendorExpenseId: album.vendorExpenseId,
        orderDate: album.orderDate,
      },
      ipAddress,
      userAgent,
    );

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'album',
      action: 'create',
      recordType: 'album',
      recordId: album.id,
      newValue: { name: album.name, bookingId: album.bookingId },
      ipAddress,
      userAgent,
    });

    return this.findOne(companyId, album.id, userId);
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateAlbumDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AlbumResponseDto> {
    const existing = await this.getAlbumOrThrow(companyId, id, false);

    let galleryId: string | null | undefined = undefined;
    if (dto.galleryId !== undefined) {
      if (dto.galleryId === null) {
        galleryId = null;
      } else {
        galleryId = await this.resolveGalleryId(companyId, existing.bookingId, dto.galleryId);
      }
    }

    const updated = await this.prisma.album.update({
      where: { id },
      data: {
        galleryId,
        name: dto.name?.trim(),
        albumType: dto.albumType,
        albumPrice: dto.albumPrice !== undefined ? toDecimal(dto.albumPrice) : undefined,
        pageCount: dto.pageCount,
        status: dto.status,
        orderDate:
          dto.orderDate !== undefined
            ? dto.orderDate
              ? parseOptionalDate(dto.orderDate)
              : null
            : undefined,
        expectedDeliveryDate:
          dto.expectedDeliveryDate !== undefined
            ? dto.expectedDeliveryDate
              ? parseOptionalDate(dto.expectedDeliveryDate)
              : null
            : undefined,
        actualDeliveryDate:
          dto.actualDeliveryDate !== undefined
            ? dto.actualDeliveryDate
              ? parseOptionalDate(dto.actualDeliveryDate)
              : null
            : undefined,
        vendorName: dto.vendorName !== undefined ? dto.vendorName?.trim() || null : undefined,
        vendorExpense:
          dto.vendorExpense !== undefined ? toDecimal(dto.vendorExpense) : undefined,
        notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
        updatedById: userId,
      },
      include: this.albumInclude(true),
    });

    await this.albumExpenseService.syncVendorExpense(
      companyId,
      userId,
      {
        id: updated.id,
        companyId: updated.companyId,
        branchId: updated.branchId,
        clientId: updated.clientId,
        bookingId: updated.bookingId,
        name: updated.name,
        vendorName: updated.vendorName,
        vendorExpense: updated.vendorExpense,
        vendorExpenseId: updated.vendorExpenseId,
        orderDate: updated.orderDate,
      },
      ipAddress,
      userAgent,
    );

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'album',
      action: 'update',
      recordType: 'album',
      recordId: id,
      previousValue: { name: existing.name, status: existing.status },
      newValue: { name: updated.name, status: updated.status },
      ipAddress,
      userAgent,
    });

    return this.findOne(companyId, id, userId);
  }

  async archive(
    companyId: string,
    userId: string,
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const existing = await this.getAlbumOrThrow(companyId, id, false);

    await this.albumExpenseService.archiveLinkedExpense(
      companyId,
      userId,
      {
        id: existing.id,
        companyId: existing.companyId,
        branchId: existing.branchId,
        clientId: existing.clientId,
        bookingId: existing.bookingId,
        name: existing.name,
        vendorName: existing.vendorName,
        vendorExpense: existing.vendorExpense,
        vendorExpenseId: existing.vendorExpenseId,
        orderDate: existing.orderDate,
      },
      ipAddress,
      userAgent,
    );

    await this.prisma.album.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: userId,
        archivedReason: 'Archived from album module',
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'album',
      action: 'archive',
      recordType: 'album',
      recordId: id,
      previousValue: { name: existing.name },
      ipAddress,
      userAgent,
    });

    return { message: 'Album archived successfully.' };
  }

  async listPhotos(companyId: string, albumId: string): Promise<AlbumPhotoDto[]> {
    const album = await this.getAlbumOrThrow(companyId, albumId, true);
    return (album.photos ?? []).map((photo) => this.mapAlbumPhoto(photo));
  }

  async addPhotos(
    companyId: string,
    userId: string,
    albumId: string,
    galleryPhotoIds: string[],
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AlbumPhotoDto[]> {
    const album = await this.getAlbumOrThrow(companyId, albumId, false);

    if (!album.galleryId) {
      throw new BadRequestException('Album is not linked to a gallery.');
    }

    const photos = await this.prisma.galleryPhoto.findMany({
      where: {
        id: { in: galleryPhotoIds },
        galleryId: album.galleryId,
        archivedAt: null,
        isActive: true,
      },
    });

    if (photos.length !== galleryPhotoIds.length) {
      throw new BadRequestException('One or more photos are invalid for this album gallery.');
    }

    const existingCount = await this.prisma.albumPhoto.count({ where: { albumId } });
    const created: AlbumPhotoDto[] = [];

    for (let index = 0; index < photos.length; index++) {
      const photo = photos[index];
      const albumPhoto = await this.prisma.albumPhoto.upsert({
        where: {
          albumId_galleryPhotoId: {
            albumId,
            galleryPhotoId: photo.id,
          },
        },
        update: { updatedById: userId },
        create: {
          albumId,
          galleryPhotoId: photo.id,
          sortOrder: existingCount + index,
          createdById: userId,
          updatedById: userId,
        },
        include: {
          galleryPhoto: {
            select: {
              id: true,
              galleryId: true,
              originalName: true,
              mimeType: true,
            },
          },
        },
      });

      created.push(this.mapAlbumPhoto(albumPhoto));
    }

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'album',
      action: 'add_photos',
      recordType: 'album',
      recordId: albumId,
      newValue: { addedCount: created.length },
      ipAddress,
      userAgent,
    });

    return created;
  }

  async removePhoto(
    companyId: string,
    userId: string,
    albumId: string,
    galleryPhotoId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    await this.getAlbumOrThrow(companyId, albumId, false);

    const albumPhoto = await this.prisma.albumPhoto.findFirst({
      where: { albumId, galleryPhotoId },
    });

    if (!albumPhoto) {
      throw new NotFoundException('Album photo not found.');
    }

    await this.prisma.albumPhoto.delete({ where: { id: albumPhoto.id } });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'album',
      action: 'remove_photo',
      recordType: 'album_photo',
      recordId: albumPhoto.id,
      previousValue: { galleryPhotoId },
      ipAddress,
      userAgent,
    });

    return { message: 'Photo removed from album.' };
  }

  async selectAllPhotos(
    companyId: string,
    userId: string,
    albumId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AlbumPhotoDto[]> {
    const album = await this.getAlbumOrThrow(companyId, albumId, false);

    if (!album.galleryId) {
      throw new BadRequestException('Album is not linked to a gallery.');
    }

    const galleryPhotos = await this.prisma.galleryPhoto.findMany({
      where: {
        galleryId: album.galleryId,
        archivedAt: null,
        isActive: true,
      },
      select: { id: true },
    });

    if (galleryPhotos.length === 0) {
      return [];
    }

    return this.addPhotos(
      companyId,
      userId,
      albumId,
      galleryPhotos.map((photo) => photo.id),
      ipAddress,
      userAgent,
    );
  }

  async clearAllPhotos(
    companyId: string,
    userId: string,
    albumId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    await this.getAlbumOrThrow(companyId, albumId, false);

    const deleted = await this.prisma.albumPhoto.deleteMany({ where: { albumId } });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'album',
      action: 'clear_photos',
      recordType: 'album',
      recordId: albumId,
      previousValue: { removedCount: deleted.count },
      ipAddress,
      userAgent,
    });

    return { message: 'All photos removed from album selection.' };
  }

  private async ensureVendorExpenseSynced(
    companyId: string,
    actorUserId: string | undefined,
    album: AlbumWithRelations,
  ): Promise<AlbumWithRelations> {
    if (roundMoney(Number(album.vendorExpense)) <= 0 || album.vendorExpenseId) {
      return album;
    }

    const userId = actorUserId ?? album.updatedById ?? album.createdById;
    if (!userId) {
      return album;
    }

    await this.albumExpenseService.syncVendorExpense(companyId, userId, {
      id: album.id,
      companyId: album.companyId,
      branchId: album.branchId,
      clientId: album.clientId,
      bookingId: album.bookingId,
      name: album.name,
      vendorName: album.vendorName,
      vendorExpense: album.vendorExpense,
      vendorExpenseId: album.vendorExpenseId,
      orderDate: album.orderDate,
    });

    return (await this.getAlbumOrThrow(companyId, album.id, true)) as AlbumWithRelations;
  }

  private albumInclude(withPhotos: boolean) {
    return {
      client: { select: { fullName: true } },
      booking: { select: { bookingNumber: true } },
      gallery: { select: { id: true, name: true } },
      ...(withPhotos
        ? {
            photos: {
              include: {
                galleryPhoto: {
                  select: {
                    id: true,
                    galleryId: true,
                    originalName: true,
                    mimeType: true,
                  },
                },
              },
              orderBy: { sortOrder: 'asc' as const },
            },
          }
        : {}),
      _count: { select: { photos: true } },
    };
  }

  private async getAlbumOrThrow(
    companyId: string,
    id: string,
    withPhotos: boolean,
  ): Promise<AlbumWithRelations> {
    const album = await this.prisma.album.findFirst({
      where: { id, companyId, archivedAt: null },
      include: this.albumInclude(withPhotos),
    });

    if (!album) {
      throw new NotFoundException('Album not found.');
    }

    return album as AlbumWithRelations;
  }

  private async resolveGalleryId(
    companyId: string,
    bookingId: string,
    requestedGalleryId?: string | null,
  ): Promise<string | null> {
    if (requestedGalleryId) {
      const gallery = await this.prisma.gallery.findFirst({
        where: {
          id: requestedGalleryId,
          companyId,
          bookingId,
          archivedAt: null,
          isActive: true,
        },
      });

      if (!gallery) {
        throw new BadRequestException('Gallery not found for this booking.');
      }

      return gallery.id;
    }

    const gallery = await this.prisma.gallery.findFirst({
      where: { companyId, bookingId, archivedAt: null, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return gallery?.id ?? null;
  }

  private mapAlbum(album: AlbumWithRelations, includePhotos = false): AlbumResponseDto {
    const albumPrice = roundMoney(Number(album.albumPrice));
    const vendorExpense = roundMoney(Number(album.vendorExpense));

    return {
      id: album.id,
      name: album.name,
      clientId: album.clientId,
      clientName: album.client.fullName,
      bookingId: album.bookingId,
      bookingNumber: album.booking.bookingNumber,
      galleryId: album.galleryId,
      galleryName: album.gallery?.name ?? null,
      albumType: album.albumType,
      albumPrice,
      pageCount: album.pageCount,
      selectedPhotoCount: album._count.photos,
      vendorExpense,
      vendorExpenseId: album.vendorExpenseId ?? null,
      profit: roundMoney(albumPrice - vendorExpense),
      status: album.status,
      orderDate: toDateOnlyLabel(album.orderDate),
      expectedDeliveryDate: toDateOnlyLabel(album.expectedDeliveryDate),
      actualDeliveryDate: toDateOnlyLabel(album.actualDeliveryDate),
      vendorName: album.vendorName,
      notes: album.notes,
      createdAt: album.createdAt.toISOString(),
      updatedAt: album.updatedAt.toISOString(),
      photos:
        includePhotos && Array.isArray(album.photos)
          ? album.photos.map((photo) => this.mapAlbumPhoto(photo))
          : undefined,
    };
  }

  private mapAlbumPhoto(photo: AlbumPhotoWithGallery): AlbumPhotoDto {
    return {
      id: photo.id,
      galleryPhotoId: photo.galleryPhoto.id,
      galleryId: photo.galleryPhoto.galleryId,
      originalName: photo.galleryPhoto.originalName,
      mimeType: photo.galleryPhoto.mimeType,
      sortOrder: photo.sortOrder,
      notes: photo.notes,
      createdAt: photo.createdAt.toISOString(),
    };
  }

  private buildWhereClause(
    companyId: string,
    query: ListAlbumsQueryDto,
  ): Prisma.AlbumWhereInput {
    const where: Prisma.AlbumWhereInput = {
      companyId,
      archivedAt: null,
      isActive: true,
    };

    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    if (query.albumType && query.albumType !== 'all') {
      where.albumType = query.albumType;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.bookingId) {
      where.bookingId = query.bookingId;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { vendorName: { contains: term, mode: 'insensitive' } },
        { client: { fullName: { contains: term, mode: 'insensitive' } } },
        { booking: { bookingNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  private buildOrderBy(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Prisma.AlbumOrderByWithRelationInput {
    switch (sortBy) {
      case 'name':
        return { name: sortOrder };
      case 'orderDate':
        return { orderDate: sortOrder };
      case 'expectedDeliveryDate':
        return { expectedDeliveryDate: sortOrder };
      default:
        return { createdAt: sortOrder };
    }
  }
}
