import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import { tmpdir } from 'os';
import { GalleriesService } from './galleries.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { generateJpegThumbnailFromPath } from './utils/thumbnail.utils';
import { MAX_UPLOAD_FILE_SIZE_BYTES, uploadFileTooLargeMessage } from './utils/gallery.utils';

jest.mock('./utils/thumbnail.utils', () => ({
  generateJpegThumbnailFromPath: jest.fn(async () => Buffer.from('thumb-bytes')),
}));

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 1)]);

function writeTempFile(name: string, contents: Buffer): string {
  const dir = mkdtempSync(join(tmpdir(), 'dhara-upload-'));
  const path = join(dir, name);
  writeFileSync(path, contents);
  return path;
}

function diskFile(path: string, overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'files',
    originalname: 'ok.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: JPEG.length,
    destination: dirname(path),
    filename: basename(path),
    path,
    stream: undefined as never,
    buffer: undefined as never,
    ...overrides,
  };
}

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
    saveFromPath: jest.fn(),
    resolveAbsolutePath: jest.fn((key: string) => `/uploads/${key}`),
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

  it('rejects invalid MIME without writing originals', async () => {
    mockPrisma.galleryPhoto.count.mockResolvedValue(0);
    const path = writeTempFile('bad.txt', Buffer.from('nope'));

    await expect(
      service.uploadPhotos('company-1', 'user-1', 'gallery-1', [
        diskFile(path, {
          originalname: 'bad.txt',
          mimetype: 'text/plain',
          size: 4,
        }),
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockStorage.saveFromPath).not.toHaveBeenCalled();
    expect(mockStorage.saveBuffer).not.toHaveBeenCalled();
  });

  it('rejects invalid magic bytes without writing originals', async () => {
    mockPrisma.galleryPhoto.count.mockResolvedValue(0);
    const path = writeTempFile('spoof.jpg', Buffer.from('not-a-jpeg'));

    await expect(
      service.uploadPhotos('company-1', 'user-1', 'gallery-1', [
        diskFile(path, { originalname: 'spoof.jpg', size: 10 }),
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockStorage.saveFromPath).not.toHaveBeenCalled();
  });

  it('rejects oversize files using the configured 200 MB message', async () => {
    mockPrisma.galleryPhoto.count.mockResolvedValue(0);
    const path = writeTempFile('huge.jpg', JPEG);

    await expect(
      service.uploadPhotos('company-1', 'user-1', 'gallery-1', [
        diskFile(path, { size: MAX_UPLOAD_FILE_SIZE_BYTES + 1 }),
      ]),
    ).rejects.toThrow(uploadFileTooLargeMessage());

    expect(mockStorage.saveFromPath).not.toHaveBeenCalled();
  });

  it('accepts a mocked 200 MB original and stores it from disk', async () => {
    mockPrisma.galleryPhoto.count.mockResolvedValue(0);
    mockPrisma.galleryPhoto.create.mockImplementation(async ({ data }) => ({
      ...data,
      id: 'photo-1',
      clientSelected: false,
      clientSelectionNotes: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));
    const path = writeTempFile('ok.jpg', JPEG);

    const created = await service.uploadPhotos('company-1', 'user-1', 'gallery-1', [
      diskFile(path, { size: MAX_UPLOAD_FILE_SIZE_BYTES }),
    ]);

    expect(created).toHaveLength(1);
    expect(mockStorage.saveFromPath).toHaveBeenCalledTimes(1);
    expect(mockStorage.saveBuffer).toHaveBeenCalledTimes(1);
    expect(generateJpegThumbnailFromPath).toHaveBeenCalled();
  });

  it('keeps the original when thumbnail generation fails', async () => {
    (generateJpegThumbnailFromPath as jest.Mock).mockRejectedValueOnce(new Error('thumb failed'));
    mockPrisma.galleryPhoto.count.mockResolvedValue(0);
    mockPrisma.galleryPhoto.create.mockImplementation(async ({ data }) => ({
      ...data,
      id: 'photo-1',
      clientSelected: false,
      clientSelectionNotes: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));
    const path = writeTempFile('ok.jpg', JPEG);

    const created = await service.uploadPhotos('company-1', 'user-1', 'gallery-1', [
      diskFile(path),
    ]);

    expect(created).toHaveLength(1);
    expect(mockStorage.saveFromPath).toHaveBeenCalledTimes(1);
    expect(mockStorage.saveBuffer).not.toHaveBeenCalled();
    expect(mockPrisma.galleryPhoto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          thumbnailKey: expect.stringMatching(/galleries\/gallery-1\//),
        }),
      }),
    );
  });

  it('cleans written files when the database insert fails', async () => {
    mockPrisma.galleryPhoto.count.mockResolvedValue(0);
    mockPrisma.galleryPhoto.create.mockRejectedValue(new Error('db down'));
    const path = writeTempFile('ok.jpg', JPEG);

    await expect(
      service.uploadPhotos('company-1', 'user-1', 'gallery-1', [diskFile(path)]),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockStorage.deleteFile).toHaveBeenCalled();
  });

  it('keeps an earlier successful file when a later file in the same request fails', async () => {
    mockPrisma.galleryPhoto.count.mockResolvedValue(0);
    mockPrisma.galleryPhoto.create.mockImplementation(async ({ data }) => ({
      ...data,
      id: 'photo-ok',
      clientSelected: false,
      clientSelectionNotes: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));
    const okPath = writeTempFile('ok.jpg', JPEG);
    const badPath = writeTempFile('bad.jpg', Buffer.from('nope'));

    await expect(
      service.uploadPhotos('company-1', 'user-1', 'gallery-1', [
        diskFile(okPath),
        diskFile(badPath, { originalname: 'bad.jpg' }),
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockPrisma.galleryPhoto.create).toHaveBeenCalledTimes(1);
    expect(mockStorage.saveFromPath).toHaveBeenCalledTimes(1);
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
