import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('ClientsService', () => {
  let service: ClientsService;

  const mockPrisma = {
    client: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    companyBranch: { findFirst: jest.fn() },
    masterData: { findFirst: jest.fn() },
    clientBranch: { create: jest.fn() },
    booking: { count: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockAudit = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) =>
      callback(mockPrisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(ClientsService);
  });

  it('lists archived clients when status is inactive or all', async () => {
    mockPrisma.client.findMany.mockResolvedValue([]);
    mockPrisma.client.count.mockResolvedValue(0);

    await service.findAll('company-1', { status: 'inactive', page: 1, limit: 20 });
    expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          OR: [{ isActive: false }, { archivedAt: { not: null } }],
        }),
      }),
    );

    await service.findAll('company-1', { status: 'all', page: 1, limit: 20 });
    expect(mockPrisma.client.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1' },
      }),
    );
  });

  it('scopes list queries to the requested company', async () => {
    mockPrisma.client.findMany.mockResolvedValue([]);
    mockPrisma.client.count.mockResolvedValue(0);

    await service.findAll('company-a', { status: 'active', page: 1, limit: 20 });
    expect(mockPrisma.client.findMany.mock.calls[0][0].where.companyId).toBe('company-a');
  });

  it('rejects creating a client with a duplicate active mobile', async () => {
    mockPrisma.client.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create('company-1', 'user-1', {
        fullName: 'Asha',
        mobile: '9876543210',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('restores an archived client and writes an audit log', async () => {
    const archived = {
      id: 'c1',
      companyId: 'company-1',
      clientNumber: 'CLT-000001',
      fullName: 'Asha',
      mobile: '9876543210',
      normalizedMobile: '9876543210',
      email: null,
      normalizedEmail: null,
      whatsapp: null,
      city: null,
      isActive: false,
      archivedAt: new Date(),
      statusId: null,
      status: { label: 'Inactive' },
      bookings: [],
      invoices: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.client.findFirst
      .mockResolvedValueOnce(archived)
      .mockResolvedValueOnce(null);
    mockPrisma.masterData.findFirst.mockResolvedValue({ id: 'active-status' });
    mockPrisma.client.update.mockResolvedValue({
      ...archived,
      isActive: true,
      archivedAt: null,
      status: { label: 'Active' },
    });

    const restored = await service.restore('company-1', 'user-1', 'c1');
    expect(restored.isActive).toBe(true);
    expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'restore' }));
  });

  it('does not restore a client from another company', async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null);
    await expect(service.restore('company-2', 'user-1', 'c1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks archive when the client still has active bookings', async () => {
    mockPrisma.client.findFirst.mockResolvedValue({
      id: 'c1',
      companyId: 'company-1',
      clientNumber: 'CLT-000001',
      fullName: 'Asha',
      mobile: '9876543210',
      isActive: true,
      archivedAt: null,
      status: { label: 'Active' },
      bookings: [],
      invoices: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.booking.count.mockResolvedValue(2);

    await expect(service.archive('company-1', 'user-1', 'c1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mockPrisma.client.update).not.toHaveBeenCalled();
  });
});
