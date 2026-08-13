import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { ListGalleriesQueryDto } from './dto/list-galleries-query.dto';
import { ListGalleryPhotosQueryDto } from './dto/list-gallery-photos-query.dto';
import {
  GalleryPhotoDto,
  GalleryResponseDto,
  PaginatedGalleriesResponseDto,
  PaginatedGalleryPhotosResponseDto,
} from './dto/gallery-response.dto';
import {
  GALLERY_PHOTO_PAGE_DEFAULT,
  GALLERY_STATUS_CODES,
  assertValidUploadFile,
  canAccessOriginalPhoto,
  sanitizeFileName,
  toDateOnlyLabel,
} from './utils/gallery.utils';
import { generateJpegThumbnail } from './utils/thumbnail.utils';
import { parseOptionalDate } from '../invoices/utils/invoice.utils';

type GalleryListRecord = Prisma.GalleryGetPayload<{
  include: {
    client: { select: { fullName: true } };
    booking: { select: { bookingNumber: true } };
    _count: { select: { photos: true } };
  };
}>;

@Injectable()
export class GalleriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(
    companyId: string,
    query: ListGalleriesQueryDto,
  ): Promise<PaginatedGalleriesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhereClause(companyId, query);

    const [galleries, total] = await Promise.all([
      this.prisma.gallery.findMany({
        where,
        include: this.galleryListInclude(),
        orderBy: this.buildOrderBy(query.sortBy ?? 'createdAt', query.sortOrder ?? 'desc'),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.gallery.count({ where }),
    ]);

    return {
      items: galleries.map((gallery) => this.mapGallery(gallery)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(companyId: string, id: string): Promise<GalleryResponseDto> {
    const gallery = await this.getGalleryOrThrow(companyId, id);
    return this.mapGallery(gallery);
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateGalleryDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<GalleryResponseDto> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, companyId, archivedAt: null },
      include: { client: { select: { fullName: true } } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    const existing = await this.prisma.gallery.findFirst({
      where: { companyId, bookingId: booking.id, archivedAt: null, isActive: true },
    });

    if (existing) {
      throw new ConflictException(
        `An active gallery already exists for booking ${booking.bookingNumber}.`,
      );
    }

    const status = dto.status && GALLERY_STATUS_CODES.includes(dto.status as never)
      ? dto.status
      : 'draft';

    const gallery = await this.prisma.gallery.create({
      data: {
        companyId,
        branchId: booking.branchId,
        clientId: booking.clientId,
        bookingId: booking.id,
        name: dto.name.trim(),
        eventType: dto.eventType?.trim() || booking.eventType,
        eventDate: dto.eventDate
          ? parseOptionalDate(dto.eventDate)
          : booking.eventDate,
        description: dto.description?.trim() || null,
        status,
        createdById: userId,
        updatedById: userId,
      },
      include: this.galleryListInclude(),
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'gallery',
      action: 'create',
      recordType: 'gallery',
      recordId: gallery.id,
      newValue: { name: gallery.name, bookingId: gallery.bookingId },
      ipAddress,
      userAgent,
    });

    return this.mapGallery(gallery);
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateGalleryDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<GalleryResponseDto> {
    const existing = await this.getGalleryOrThrow(companyId, id);

    const updated = await this.prisma.gallery.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        eventType: dto.eventType?.trim(),
        eventDate:
          dto.eventDate !== undefined
            ? dto.eventDate
              ? parseOptionalDate(dto.eventDate)
              : null
            : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        status: dto.status,
        allowClientDownload: dto.allowClientDownload,
        updatedById: userId,
      },
      include: this.galleryListInclude(),
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'gallery',
      action: 'update',
      recordType: 'gallery',
      recordId: id,
      previousValue: { name: existing.name, status: existing.status },
      newValue: { name: updated.name, status: updated.status },
      ipAddress,
      userAgent,
    });

    return this.mapGallery(updated);
  }

  async archive(
    companyId: string,
    userId: string,
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const existing = await this.getGalleryOrThrow(companyId, id);

    await this.prisma.gallery.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: userId,
        archivedReason: 'Archived from gallery module',
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'gallery',
      action: 'archive',
      recordType: 'gallery',
      recordId: id,
      previousValue: { name: existing.name },
      ipAddress,
      userAgent,
    });

    return { message: 'Gallery archived successfully.' };
  }

  async listPhotos(
    companyId: string,
    galleryId: string,
    query: ListGalleryPhotosQueryDto = {},
  ): Promise<PaginatedGalleryPhotosResponseDto> {
    await this.getGalleryOrThrow(companyId, galleryId);

    const page = query.page ?? 1;
    const limit = query.limit ?? GALLERY_PHOTO_PAGE_DEFAULT;
    const where = { galleryId, archivedAt: null, isActive: true } as const;

    const [photos, total] = await Promise.all([
      this.prisma.galleryPhoto.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.galleryPhoto.count({ where }),
    ]);

    return {
      items: photos.map((photo) => this.mapPhoto(photo)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async uploadPhotos(
    companyId: string,
    userId: string,
    galleryId: string,
    files: Express.Multer.File[],
    ipAddress?: string,
    userAgent?: string,
  ): Promise<GalleryPhotoDto[]> {
    const gallery = await this.getGalleryOrThrow(companyId, galleryId);

    if (!files?.length) {
      throw new BadRequestException('No files uploaded.');
    }

    for (const file of files) {
      try {
        assertValidUploadFile(file);
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : 'Invalid upload.');
      }
    }

    const existingCount = await this.prisma.galleryPhoto.count({
      where: { galleryId, archivedAt: null, isActive: true },
    });

    const created: GalleryPhotoDto[] = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const storedName = `${randomUUID()}-${sanitizeFileName(file.originalname)}`;
      const storageKey = this.storageService.buildGalleryPhotoKey(gallery.id, storedName);
      const writtenKeys: string[] = [];

      try {
        await this.storageService.saveBuffer(storageKey, file.buffer);
        writtenKeys.push(storageKey);

        let thumbnailKey = storageKey;
        try {
          const thumbnailBuffer = await generateJpegThumbnail(file.buffer);
          const thumbnailName = `${randomUUID()}-thumb.jpg`;
          thumbnailKey = this.storageService.buildGalleryPhotoKey(
            gallery.id,
            `thumbs/${thumbnailName}`,
          );
          await this.storageService.saveBuffer(thumbnailKey, thumbnailBuffer);
          writtenKeys.push(thumbnailKey);
        } catch {
          thumbnailKey = storageKey;
        }

        const photo = await this.prisma.galleryPhoto.create({
          data: {
            galleryId: gallery.id,
            fileName: storedName,
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            storageKey,
            thumbnailKey,
            sortOrder: existingCount + index,
            createdById: userId,
            updatedById: userId,
          },
        });

        created.push(this.mapPhoto(photo));
      } catch (error) {
        await Promise.all(writtenKeys.map((key) => this.storageService.deleteFile(key)));
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(
          `Failed to save ${file.originalname}. Earlier files in this request were kept.`,
        );
      }
    }

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'gallery',
      action: 'upload_photos',
      recordType: 'gallery',
      recordId: galleryId,
      newValue: { uploadedCount: created.length },
      ipAddress,
      userAgent,
    });

    return created;
  }

  async deletePhoto(
    companyId: string,
    userId: string,
    galleryId: string,
    photoId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    await this.getGalleryOrThrow(companyId, galleryId);

    const photo = await this.prisma.galleryPhoto.findFirst({
      where: { id: photoId, galleryId, archivedAt: null, isActive: true },
      include: { _count: { select: { albumPhotos: true } } },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }

    await this.prisma.galleryPhoto.update({
      where: { id: photoId },
      data: {
        isActive: false,
        archivedAt: new Date(),
        updatedById: userId,
      },
    });

    const referencedByAlbum = photo._count.albumPhotos > 0;
    if (!referencedByAlbum) {
      await this.storageService.deleteFile(photo.storageKey);
      if (photo.thumbnailKey && photo.thumbnailKey !== photo.storageKey) {
        await this.storageService.deleteFile(photo.thumbnailKey);
      }
    }

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'gallery',
      action: 'delete_photo',
      recordType: 'gallery_photo',
      recordId: photoId,
      previousValue: { originalName: photo.originalName, keptFilesForAlbum: referencedByAlbum },
      ipAddress,
      userAgent,
    });

    return { message: 'Photo deleted successfully.' };
  }

  async getPhotoFile(
    companyId: string,
    galleryId: string,
    photoId: string,
    variant: 'original' | 'thumbnail' = 'thumbnail',
    permissions: string[] = [],
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const gallery = await this.getGalleryOrThrow(companyId, galleryId);

    const photo = await this.prisma.galleryPhoto.findFirst({
      where: { id: photoId, galleryId },
      include: { _count: { select: { albumPhotos: true } } },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }

    const photoArchived = Boolean(photo.archivedAt) || !photo.isActive;
    const requestedVariant = variant === 'original' ? 'original' : 'thumbnail';

    if (photoArchived) {
      if (requestedVariant === 'original' || photo._count.albumPhotos === 0) {
        throw new NotFoundException('Photo not found.');
      }
    }

    if (
      requestedVariant === 'original' &&
      !canAccessOriginalPhoto(permissions, gallery.allowClientDownload)
    ) {
      throw new ForbiddenException(
        'Original photo download is not allowed for this gallery.',
      );
    }

    const storageKey =
      requestedVariant === 'thumbnail' && photo.thumbnailKey
        ? photo.thumbnailKey
        : photo.storageKey;

    let buffer: Buffer;
    try {
      buffer = await this.storageService.readBuffer(storageKey);
    } catch {
      throw new NotFoundException('Photo file not found.');
    }

    return {
      buffer,
      mimeType:
        requestedVariant === 'thumbnail' && photo.thumbnailKey !== photo.storageKey
          ? 'image/jpeg'
          : photo.mimeType,
      fileName:
        requestedVariant === 'thumbnail'
          ? `thumb-${sanitizeFileName(photo.originalName)}`
          : photo.originalName,
    };
  }

  private galleryListInclude() {
    return {
      client: { select: { fullName: true } },
      booking: { select: { bookingNumber: true } },
      _count: {
        select: {
          photos: { where: { archivedAt: null, isActive: true } },
        },
      },
    };
  }

  private async getGalleryOrThrow(companyId: string, id: string): Promise<GalleryListRecord> {
    const gallery = await this.prisma.gallery.findFirst({
      where: { id, companyId, archivedAt: null, isActive: true },
      include: this.galleryListInclude(),
    });

    if (!gallery) {
      throw new NotFoundException('Gallery not found.');
    }

    return gallery;
  }

  private mapGallery(gallery: GalleryListRecord): GalleryResponseDto {
    return {
      id: gallery.id,
      name: gallery.name,
      clientId: gallery.clientId,
      clientName: gallery.client.fullName,
      bookingId: gallery.bookingId,
      bookingNumber: gallery.booking.bookingNumber,
      eventType: gallery.eventType,
      eventDate: toDateOnlyLabel(gallery.eventDate),
      description: gallery.description,
      status: gallery.status,
      allowClientDownload: gallery.allowClientDownload,
      photoCount: gallery._count.photos,
      createdAt: gallery.createdAt.toISOString(),
      updatedAt: gallery.updatedAt.toISOString(),
    };
  }

  private mapPhoto(photo: {
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    sortOrder: number;
    clientSelected: boolean;
    clientSelectionNotes: string | null;
    createdAt: Date;
  }): GalleryPhotoDto {
    return {
      id: photo.id,
      fileName: photo.fileName,
      originalName: photo.originalName,
      mimeType: photo.mimeType,
      fileSize: photo.fileSize,
      sortOrder: photo.sortOrder,
      clientSelected: photo.clientSelected,
      clientSelectionNotes: photo.clientSelectionNotes,
      createdAt: photo.createdAt.toISOString(),
    };
  }

  private buildWhereClause(
    companyId: string,
    query: ListGalleriesQueryDto,
  ): Prisma.GalleryWhereInput {
    const where: Prisma.GalleryWhereInput = {
      companyId,
      archivedAt: null,
      isActive: true,
    };

    if (query.status && query.status !== 'all') {
      where.status = query.status;
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
        { eventType: { contains: term, mode: 'insensitive' } },
        { client: { fullName: { contains: term, mode: 'insensitive' } } },
        { booking: { bookingNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  private buildOrderBy(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Prisma.GalleryOrderByWithRelationInput {
    switch (sortBy) {
      case 'name':
        return { name: sortOrder };
      case 'eventDate':
        return { eventDate: sortOrder };
      default:
        return { createdAt: sortOrder };
    }
  }
}
