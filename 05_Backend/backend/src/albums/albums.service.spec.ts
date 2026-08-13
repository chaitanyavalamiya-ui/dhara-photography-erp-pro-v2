import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AlbumsService } from './albums.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AlbumExpenseService } from './album-expense.service';

describe('AlbumsService photo membership', () => {
  let service: AlbumsService;

  const album = {
    id: 'album-1',
    companyId: 'company-1',
    bookingId: 'booking-1',
    galleryId: 'gallery-1',
    client: { fullName: 'Asha' },
    booking: { bookingNumber: 'BK-000001' },
    gallery: { id: 'gallery-1', name: 'Wedding', archivedAt: null, isActive: true },
    _count: { photos: 0 },
    albumPrice: 0,
    vendorExpense: 0,
    vendorExpenseId: null,
    pageCount: 20,
    albumType: 'standard',
    status: 'pending',
    orderDate: null,
    expectedDeliveryDate: null,
    actualDeliveryDate: null,
    vendorName: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    name: 'Album',
    clientId: 'client-1',
  };

  const mockPrisma = {
    album: { findFirst: jest.fn() },
    galleryPhoto: { findMany: jest.fn() },
    albumPhoto: { count: jest.fn(), upsert: jest.fn() },
  };
  const mockAudit = { log: jest.fn() };
  const mockExpense = { syncVendorExpense: jest.fn(), archiveLinkedExpense: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.album.findFirst.mockResolvedValue(album);

    const module = await Test.createTestingModule({
      providers: [
        AlbumsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: AlbumExpenseService, useValue: mockExpense },
      ],
    }).compile();

    service = module.get(AlbumsService);
  });

  it('rejects archived gallery photos for new album selections', async () => {
    mockPrisma.galleryPhoto.findMany.mockResolvedValue([]);

    await expect(
      service.addPhotos('company-1', 'user-1', 'album-1', ['photo-archived']),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockPrisma.galleryPhoto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          galleryId: 'gallery-1',
          archivedAt: null,
          isActive: true,
        }),
      }),
    );
    expect(mockPrisma.albumPhoto.upsert).not.toHaveBeenCalled();
  });

  it('rejects photos that belong to a different gallery', async () => {
    mockPrisma.galleryPhoto.findMany.mockResolvedValue([]);

    await expect(
      service.addPhotos('company-1', 'user-1', 'album-1', ['photo-other-gallery']),
    ).rejects.toThrow('One or more photos are invalid for this album gallery.');
  });
});
