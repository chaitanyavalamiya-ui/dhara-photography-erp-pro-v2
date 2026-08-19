import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BOOKING_CLIENT_CHANGE_LOCKED_MESSAGE } from './utils/booking.utils';
import { INVOICE_TOTAL_BELOW_PAYMENTS_MESSAGE } from '../common/utils/financial.utils';

describe('BookingsService client change', () => {
  let service: BookingsService;

  const existing = {
    id: 'booking-1',
    bookingNumber: 'BK-000001',
    companyId: 'company-1',
    clientId: 'client-current',
    eventType: 'Wedding',
    eventDate: new Date('2026-12-15T00:00:00.000Z'),
    eventEndDate: new Date('2026-12-16T00:00:00.000Z'),
    venue: null,
    city: null,
    notes: null,
    discount: 0,
    subtotal: 5000,
    totalAmount: 5000,
    advanceAmount: 0,
    balanceAmount: 5000,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    client: {
      id: 'client-current',
      fullName: 'Rahul Patel',
      mobile: '9999999999',
      email: null,
    },
    status: { id: 'status-1', code: 'enquiry', label: 'Enquiry' },
    items: [
      {
        id: 'item-1',
        serviceRateId: null,
        serviceName: 'Photography',
        quantity: 1,
        unit: 'day',
        rate: 5000,
        days: 1,
        amount: 5000,
        notes: null,
      },
    ],
  };

  const mockPrisma = {
    booking: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    client: { findFirst: jest.fn() },
    invoice: { findFirst: jest.fn(), count: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    payment: { count: jest.fn(), aggregate: jest.fn() },
    gallery: { count: jest.fn() },
    album: { count: jest.fn() },
    delivery: { count: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockAudit = { log: jest.fn() };

  function mockDependentCounts(overrides: Partial<Record<string, number>> = {}) {
    mockPrisma.invoice.count.mockResolvedValue(overrides.invoices ?? 0);
    mockPrisma.payment.count.mockResolvedValue(overrides.payments ?? 0);
    mockPrisma.gallery.count.mockResolvedValue(overrides.galleries ?? 0);
    mockPrisma.album.count.mockResolvedValue(overrides.albums ?? 0);
    mockPrisma.delivery.count.mockResolvedValue(overrides.deliveries ?? 0);
  }

  function expectCountsScopedToCompany() {
    for (const model of ['invoice', 'payment', 'gallery', 'album', 'delivery'] as const) {
      expect(mockPrisma[model].count).toHaveBeenCalledWith({
        where: { companyId: 'company-1', bookingId: 'booking-1' },
      });
    }
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.booking.findFirst.mockResolvedValue(existing);
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) =>
      callback(mockPrisma),
    );
    mockPrisma.invoice.findFirst.mockResolvedValue(null);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mockDependentCounts();

    const module = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(BookingsService);
  });

  it('rejects changing clientId when an invoice exists for the booking', async () => {
    mockDependentCounts({ invoices: 1 });

    await expect(
      service.update('company-1', 'user-1', 'booking-1', { clientId: 'client-other' }),
    ).rejects.toThrow(BOOKING_CLIENT_CHANGE_LOCKED_MESSAGE);

    expectCountsScopedToCompany();
    expect(mockPrisma.client.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });

  it.each([
    ['payment', { payments: 1 }],
    ['gallery', { galleries: 1 }],
    ['album', { albums: 1 }],
    ['delivery', { deliveries: 1 }],
  ] as const)('rejects changing clientId when a %s exists', async (_label, counts) => {
    mockDependentCounts(counts);

    await expect(
      service.update('company-1', 'user-1', 'booking-1', { clientId: 'client-other' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows other updates when clientId is unchanged even if dependents exist', async () => {
    mockDependentCounts({ invoices: 2, galleries: 1 });
    mockPrisma.booking.update.mockResolvedValue(existing);

    await service.update('company-1', 'user-1', 'booking-1', {
      clientId: 'client-current',
      venue: 'New venue',
    });

    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'client-current',
          venue: 'New venue',
        }),
      }),
    );
  });

  it('allows changing clientId when the booking has no dependents, scoped to the company', async () => {
    mockDependentCounts();
    mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-other' });
    mockPrisma.booking.update.mockResolvedValue({
      ...existing,
      clientId: 'client-other',
      client: { ...existing.client, id: 'client-other' },
    });

    await service.update('company-1', 'user-1', 'booking-1', { clientId: 'client-other' });

    expectCountsScopedToCompany();
    expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'client-other',
        companyId: 'company-1',
        archivedAt: null,
        isActive: true,
      },
    });
    expect(mockPrisma.booking.update).toHaveBeenCalled();
  });

  it('does not rewrite branchId when clientId is allowed to change', async () => {
    mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-other', primaryBranchId: 'branch-2' });
    mockPrisma.booking.update.mockResolvedValue({
      ...existing,
      clientId: 'client-other',
      client: { ...existing.client, id: 'client-other' },
    });

    await service.update('company-1', 'user-1', 'booking-1', { clientId: 'client-other' });

    const updateData = mockPrisma.booking.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(updateData.branchId).toBeUndefined();
    expect(updateData.clientId).toBe('client-other');
  });

  it('marks findOne as client-change locked using company-scoped dependent counts', async () => {
    mockPrisma.booking.findFirst.mockResolvedValue({
      ...existing,
      staffAssignments: [],
    });
    mockDependentCounts({ payments: 1 });

    const result = await service.findOne('company-1', 'booking-1');

    expect(result.clientChangeLocked).toBe(true);
    expectCountsScopedToCompany();
  });

  it('marks findOne as unlocked when no dependents exist', async () => {
    mockPrisma.booking.findFirst.mockResolvedValue({
      ...existing,
      staffAssignments: [],
    });

    const result = await service.findOne('company-1', 'booking-1');

    expect(result.clientChangeLocked).toBe(false);
  });

  it('does not look up a client in another company when changing clientId', async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null);

    await expect(
      service.update('company-1', 'user-1', 'booking-1', { clientId: 'foreign-client' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(mockPrisma.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 'company-1', id: 'foreign-client' }),
      }),
    );
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });

  it('rejects lowering the invoiced booking total below active payments', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1' });
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 4000 } });

    await expect(
      service.update('company-1', 'user-1', 'booking-1', { discount: 2000 }),
    ).rejects.toThrow(INVOICE_TOTAL_BELOW_PAYMENTS_MESSAGE);

    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

  it('updates invoiced booking totals when they still cover active payments', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1' });
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 2000 } });
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      bookingId: 'booking-1',
      totalAmount: 5000,
      dueDate: null,
    });
    mockPrisma.booking.update.mockResolvedValue(existing);
    mockPrisma.invoice.update.mockResolvedValue({});

    await service.update('company-1', 'user-1', 'booking-1', { discount: 0 });

    expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalAmount: expect.anything(),
        }),
      }),
    );
    expect(mockPrisma.booking.update).toHaveBeenCalled();
  });
});
