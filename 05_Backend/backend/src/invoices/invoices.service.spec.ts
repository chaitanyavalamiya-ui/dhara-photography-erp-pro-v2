import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('InvoicesService archive and financial safety', () => {
  let service: InvoicesService;

  const existingInvoice = {
    id: 'inv-1',
    companyId: 'company-1',
    bookingId: 'bk-1',
    clientId: 'cl-1',
    invoiceNumber: 'INV-000001',
    subtotal: 10000,
    discount: 0,
    totalAmount: 10000,
    advanceAmount: 0,
    outstandingAmount: 10000,
    status: 'unpaid',
    invoiceDate: new Date('2026-08-01T00:00:00.000Z'),
    dueDate: null,
    notes: null,
    isActive: true,
    archivedAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    client: {
      id: 'cl-1',
      fullName: 'Asha',
      mobile: '9876543210',
      email: null,
      address: null,
      city: null,
    },
    booking: {
      id: 'bk-1',
      bookingNumber: 'BK-000001',
      eventType: 'Wedding',
      eventDate: new Date('2026-12-15T00:00:00.000Z'),
      eventEndDate: null,
      venue: null,
      city: null,
      notes: null,
      items: [],
    },
  };

  const mockPrisma = {
    invoice: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    payment: {
      count: jest.fn(),
      aggregate: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAudit = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.invoice.findFirst.mockResolvedValue(existingInvoice);
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      bookingId: 'bk-1',
      totalAmount: 10000,
      dueDate: null,
    });
    mockPrisma.invoice.update.mockResolvedValue(existingInvoice);
    mockPrisma.booking.update.mockResolvedValue({});
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
      fn(mockPrisma),
    );

    const module = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(InvoicesService);
  });

  it('archives when there are no active payments and resyncs booking totals', async () => {
    mockPrisma.payment.count.mockResolvedValue(0);

    const result = await service.archive('company-1', 'user-1', 'inv-1');

    expect(result).toEqual({ message: 'Invoice archived successfully.' });
    expect(mockPrisma.payment.count).toHaveBeenCalledWith({
      where: {
        invoiceId: 'inv-1',
        companyId: 'company-1',
        isActive: true,
        archivedAt: null,
      },
    });
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: false,
          archivedReason: 'Archived from invoices module',
        }),
      }),
    );
    expect(mockPrisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'bk-1' },
      data: {
        advanceAmount: expect.anything(),
        balanceAmount: expect.anything(),
      },
    });
    expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'archive' }));
  });

  it('blocks archive when an active payment exists and does not change payments or the invoice', async () => {
    mockPrisma.payment.count.mockResolvedValue(1);

    await expect(service.archive('company-1', 'user-1', 'inv-1')).rejects.toThrow(
      'Cannot archive this invoice while it has active payments. Void the payments first.',
    );
    await expect(service.archive('company-1', 'user-1', 'inv-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
    expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it('allows archive when only voided payments exist', async () => {
    mockPrisma.payment.count.mockResolvedValue(0);

    await service.archive('company-1', 'user-1', 'inv-1');

    expect(mockPrisma.payment.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          archivedAt: null,
        }),
      }),
    );
    expect(mockPrisma.invoice.update).toHaveBeenCalled();
  });
});
