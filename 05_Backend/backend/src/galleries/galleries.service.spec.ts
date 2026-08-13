import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GalleriesService } from './galleries.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { generateJpegThumbnail } from './utils/thumbnail.utils';

jest.mock('./utils/thumbnail.utils', () => ({
  generateJpegThumbnail: jest.fn(async () => Buffer.from('thumb-bytes')),
}));

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 1)]);

function galleryRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gallery-1',
    companyId: 'company-1',
    clientId: 'client-1',
    bookingId: 'booking-1',
    name: 'Wedding Gallery',
    eventType: 'Wedding',
    eventDate: null,
    description: null,
    status: 'draft',
    allowClientDownload: false,
    archivedAt: null,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    client: { fullName: 'Asha' },
    booking: { bookingNumber: 'BK-000001' },
    _count: { photos: 2 },
    ...overrides,
  };
}

describe('GalleriesService', () => {
  let service: GalleriesService;

  const mockPrisma = {
    gallery: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    galleryPhoto: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAudit = { log: jest.fn() };
  const mockStorage = {
    buildGalleryPhotoKey: jest.fn(
      (galleryId: string, fileName: string) => `galleries/${galleryId}/${fileName}`,
    ),
    saveBuffer: jest.fn(),
    readBuffer: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.gallery.findFirst.mockResolvedValue(galleryRecord());

    const module = await Test.createTestingModule({
      providers: [
        GalleriesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get(GalleriesService);
  });

  it('lists galleries without loading photo rows', async () => {
    mockPrisma.gallery.findMany.mockResolvedValue([galleryRecord()]);
    mockPrisma.gallery.count.mockResolvedValue(1);

    const result = await service.findAll('company-1', { page: 1, limit: 20 });

    expect(result.items[0].photoCount).toBe(2);
    expect(result.items[0].photos).toBeUndefined();
    expect(mockPrisma.gallery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.not.objectContaining({ photos: expect.anything() }),
      }),
    );
  });

  it('denies original files for gallery.read when client download is off', async () => {
    mockPrisma.galleryPhoto.findFirst.mockResolvedValue({
      id: 'photo-1',
      galleryId: 'gallery-1',
      archivedAt: null,
      isActive: true,
      storageKey: 'galleries/gallery-1/a.jpg',
      thumbnailKey: 'galleries/gallery-1/thumbs/a.jpg',
      mimeType: 'image/jpeg',
      originalName: 'a.jpg',
      _count: { albumPhotos: 0 },
    });

    await expect(
      service.getPhotoFile('company-1', 'gallery-1', 'photo-1', 'original', ['gallery.read']),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockStorage.readBuffer).not.toHaveBeenCalled();
  });

  it('allows original files for studio create permission', async () => {
    mockPrisma.galleryPhoto.findFirst.mockResolvedValue({
      id: 'photo-1',
      galleryId: 'gallery-1',
      archivedAt: null,
      isActive: true,
      storageKey: 'galleries/gallery-1/a.jpg',
      thumbnailKey: 'galleries/gallery-1/thumbs/a.jpg',
      mimeType: 'image/jpeg',
      originalName: 'a.jpg',
      _count: { albumPhotos: 0 },
    });
    mockStorage.readBuffer.mockResolvedValue(Buffer.from('original'));

    const file = await service.getPhotoFile('company-1', 'gallery-1', 'photo-1', 'original', [
      'gallery.read',
      'gallery.create',
    ]);
    expect(file.buffer.toString()).toBe('original');
    expect(mockStorage.readBuffer).toHaveBeenCalledWith('galleries/gallery-1/a.jpg');
  });

  it('serves thumbnails to gallery.read', async () => {
    mockPrisma.galleryPhoto.findFirst.mockResolvedValue({
      id: 'photo-1',
      galleryId: 'gallery-1',
      archivedAt: null,
      isActive: true,
      storageKey: 'galleries/gallery-1/a.jpg',
      thumbnailKey: 'galleries/gallery-1/thumbs/a.jpg',
      mimeType: 'image/jpeg',
      originalName: 'a.jpg',
      _count: { albumPhotos: 0 },
    });
    mockStorage.readBuffer.mockResolvedValue(Buffer.from('thumb'));

    const file = await service.getPhotoFile('company-1', 'gallery-1', 'photo-1', 'thumbnail', [
      'gallery.read',
    ]);
    expect(file.mimeType).toBe('image/jpeg');
    expect(mockStorage.readBuffer).toHaveBeenCalledWith('galleries/gallery-1/thumbs/a.jpg');
  });

  it('hides files for another company', async () => {
    mockPrisma.gallery.findFirst.mockResolvedValue(null);
    await expect(
      service.getPhotoFile('company-2', 'gallery-1', 'photo-1', 'thumbnail', ['gallery.read']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('hides files for archived galleries', async () => {
    mockPrisma.gallery.findFirst.mockResolvedValue(null);
    await expect(
      service.getPhotoFile('company-1', 'gallery-1', 'photo-1', 'thumbnail', ['gallery.read']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('hides archived photos unless they remain on an album', async () => {
    mockPrisma.galleryPhoto.findFirst.mockResolvedValue({
      id: 'photo-1',
      galleryId: 'gallery-1',
      archivedAt: new Date(),
      isActive: false,
      storageKey: 'galleries/gallery-1/a.jpg',
      thumbnailKey: 'galleries/gallery-1/thumbs/a.jpg',
      mimeType: 'image/jpeg',
      originalName: 'a.jpg',
      _count: { albumPhotos: 0 },
    });

    await expect(
      service.getPhotoFile('company-1', 'gallery-1', 'photo-1', 'thumbnail', ['gallery.read']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('validates all uploads before writing files', async () => {
    mockPrisma.galleryPhoto.count.mockResolvedValue(0);

    await expect(
      service.uploadPhotos('company-1', 'user-1', 'gallery-1', [
        {
          originalname: 'bad.txt',
          mimetype: 'text/plain',
          size: 4,
          buffer: Buffer.from('nope'),
        } as Express.Multer.File,
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockStorage.saveBuffer).not.toHaveBeenCalled();
  });

  it('keeps the original when thumbnail generation fails', async () => {
    (generateJpegThumbnail as jest.Mock).mockRejectedValueOnce(new Error('thumb failed'));
    mockPrisma.galleryPhoto.count.mockResolvedValue(0);
    mockPrisma.galleryPhoto.create.mockImplementation(async ({ data }) => ({
      ...data,
      id: 'photo-1',
      clientSelected: false,
      clientSelectionNotes: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));

    const created = await service.uploadPhotos('company-1', 'user-1', 'gallery-1', [
      {
        originalname: 'ok.jpg',
        mimetype: 'image/jpeg',
        size: JPEG.length,
        buffer: JPEG,
      } as Express.Multer.File,
    ]);

    expect(created).toHaveLength(1);
    expect(mockStorage.saveBuffer).toHaveBeenCalledTimes(1);
    expect(mockPrisma.galleryPhoto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          thumbnailKey: expect.stringMatching(/galleries\/gallery-1\//),
        }),
      }),
    );
  });

  it('does not delete files still referenced by albums', async () => {
    mockPrisma.galleryPhoto.findFirst.mockResolvedValue({
      id: 'photo-1',
      galleryId: 'gallery-1',
      originalName: 'a.jpg',
      storageKey: 'galleries/gallery-1/a.jpg',
      thumbnailKey: 'galleries/gallery-1/thumbs/a.jpg',
      _count: { albumPhotos: 1 },
    });

    await service.deletePhoto('company-1', 'user-1', 'gallery-1', 'photo-1');
    expect(mockPrisma.galleryPhoto.update).toHaveBeenCalled();
    expect(mockStorage.deleteFile).not.toHaveBeenCalled();
  });

  it('archives a gallery without deleting files', async () => {
    await service.archive('company-1', 'user-1', 'gallery-1');
    expect(mockPrisma.gallery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ archivedAt: expect.any(Date), isActive: false }),
      }),
    );
    expect(mockStorage.deleteFile).not.toHaveBeenCalled();
  });
});
