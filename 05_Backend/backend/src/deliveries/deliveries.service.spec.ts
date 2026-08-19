import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('DeliveriesService', () => {
  let service: DeliveriesService;

  const booking = {
    id: 'bk-1',
    companyId: 'company-1',
    branchId: 'br-1',
    clientId: 'cl-1',
    archivedAt: null,
  };

  const delivery = {
    id: 'del-1',
    companyId: 'company-1',
    bookingId: 'bk-1',
    clientId: 'cl-1',
    albumId: null,
    deliverableType: 'album',
    title: 'Wedding Album',
    status: 'pending',
    expectedDate: null,
    deliveredDate: null,
    notes: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    client: { fullName: 'Asha' },
    booking: { bookingNumber: 'BK-000001' },
    album: null,
  };

  const mockPrisma = {
    delivery: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    booking: { findFirst: jest.fn() },
    album: { findFirst: jest.fn() },
  };

  const mockAudit = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();
    service = module.get(DeliveriesService);
  });

  it('creates a delivery for a company booking', async () => {
    mockPrisma.booking.findFirst.mockResolvedValue(booking);
    mockPrisma.delivery.create.mockResolvedValue(delivery);

    const created = await service.create('company-1', 'user-1', {
      bookingId: 'bk-1',
      deliverableType: 'album',
    });

    expect(created.title).toBe('Wedding Album');
    expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
      where: { id: 'bk-1', companyId: 'company-1', archivedAt: null },
    });
    expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'create' }));
  });

  it('does not create a delivery for a booking in another company', async () => {
    mockPrisma.booking.findFirst.mockResolvedValue(null);

    await expect(
      service.create('company-2', 'user-1', {
        bookingId: 'bk-1',
        deliverableType: 'album',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockPrisma.delivery.create).not.toHaveBeenCalled();
  });

  it('rejects an album that does not belong to the booking', async () => {
    mockPrisma.booking.findFirst.mockResolvedValue(booking);
    mockPrisma.album.findFirst.mockResolvedValue(null);

    await expect(
      service.create('company-1', 'user-1', {
        bookingId: 'bk-1',
        albumId: 'album-x',
        deliverableType: 'album',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
