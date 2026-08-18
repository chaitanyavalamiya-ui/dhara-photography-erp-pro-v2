import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('PaymentsService.void', () => {
  let service: PaymentsService;

  const mockPrisma = {
    payment: {
      findFirst: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    invoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAudit = { log: jest.fn() };

  const activePayment = {
    id: 'pay-1',
    companyId: 'company-1',
    invoiceId: 'inv-1',
    amount: 5000,
    receiptNumber: 'RCPT-000001',
    isActive: true,
    archivedAt: null,
    invoice: { invoiceNumber: 'INV-000001', totalAmount: 10000, outstandingAmount: 5000 },
    booking: { bookingNumber: 'BK-000001' },
    client: { fullName: 'Asha', mobile: '9876543210' },
    paymentMode: { code: 'cash', label: 'Cash' },
    bookingId: 'bk-1',
    clientId: 'cl-1',
    paymentDate: new Date('2026-08-10T00:00:00.000Z'),
    transactionReference: null,
    notes: null,
    createdAt: new Date('2026-08-10T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
      fn(mockPrisma),
    );

    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  it('voids an active payment, resyncs invoice outstanding, and writes an audit log', async () => {
    mockPrisma.payment.update.mockResolvedValue({
      ...activePayment,
      isActive: false,
      archivedAt: new Date('2026-08-18T00:00:00.000Z'),
    });
    mockPrisma.payment.findFirst
      .mockResolvedValueOnce(activePayment)
      .mockResolvedValueOnce({
        ...activePayment,
        isActive: false,
        archivedAt: new Date('2026-08-18T00:00:00.000Z'),
        invoice: { ...activePayment.invoice, outstandingAmount: 10000 },
      });
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      bookingId: 'bk-1',
      totalAmount: 10000,
      dueDate: null,
    });
    mockPrisma.invoice.update.mockResolvedValue({});
    mockPrisma.booking.update.mockResolvedValue({});

    const result = await service.void('company-1', 'user-1', 'pay-1');

    expect(result.isVoided).toBe(true);
    expect(result.remainingBalance).toBe(10000);
    expect(mockPrisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: false,
          archivedReason: 'voided',
        }),
      }),
    );
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'void', recordId: 'pay-1' }),
    );
  });

  it('rejects a second void of the same payment', async () => {
    mockPrisma.payment.findFirst.mockResolvedValue({
      ...activePayment,
      isActive: false,
      archivedAt: new Date('2026-08-18T00:00:00.000Z'),
    });

    await expect(service.void('company-1', 'user-1', 'pay-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mockPrisma.payment.update).not.toHaveBeenCalled();
  });
});
