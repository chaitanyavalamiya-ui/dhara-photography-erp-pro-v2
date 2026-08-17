import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('ExpensesService', () => {
  let service: ExpensesService;

  const mockPrisma = {
    expense: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    masterData: { findFirst: jest.fn() },
    companyBranch: { findFirst: jest.fn() },
    booking: { findFirst: jest.fn() },
    client: { findFirst: jest.fn() },
    invoice: { findFirst: jest.fn() },
    staff: { findFirst: jest.fn() },
  };

  const mockAudit = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(ExpensesService);
  });

  it('lists active company expenses with a filtered total amount', async () => {
    mockPrisma.expense.findMany.mockResolvedValue([]);
    mockPrisma.expense.count.mockResolvedValue(0);
    mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

    const result = await service.findAll('company-1', { page: 1, limit: 20 });

    expect(result.totalAmount).toBe(0);
    expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          archivedAt: null,
          isActive: true,
        }),
      }),
    );
  });

  it('filters by payment method when a valid code is provided', async () => {
    mockPrisma.masterData.findFirst.mockResolvedValue({ id: 'pm-1', code: 'upi' });
    mockPrisma.expense.findMany.mockResolvedValue([]);
    mockPrisma.expense.count.mockResolvedValue(0);
    mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 1200 } });

    const result = await service.findAll('company-1', {
      page: 1,
      limit: 20,
      paymentModeCode: 'upi',
    });

    expect(result.totalAmount).toBe(1200);
    expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ paymentModeId: 'pm-1' }),
      }),
    );
  });

  it('rejects an inverted date range', async () => {
    await expect(
      service.findAll('company-1', {
        page: 1,
        limit: 20,
        dateFrom: '2026-08-16',
        dateTo: '2026-08-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.expense.findMany).not.toHaveBeenCalled();
  });

  it('rejects an invalid expense category', async () => {
    mockPrisma.masterData.findFirst.mockResolvedValue(null);

    await expect(
      service.create('company-1', 'user-1', {
        categoryCode: 'unknown',
        amount: 100,
        expenseDate: '2026-08-16',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records a staff payment as a single staff-category expense', async () => {
    mockPrisma.staff.findFirst.mockResolvedValue({
      id: 'staff-1',
      fullName: 'Ravi Photographer',
    });
    mockPrisma.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BK-000008',
      clientId: 'client-1',
      branchId: 'branch-1',
    });
    mockPrisma.masterData.findFirst
      .mockResolvedValueOnce({ id: 'cat-staff', code: 'staff' })
      .mockResolvedValueOnce({ id: 'pm-upi', code: 'upi' });
    mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
    mockPrisma.expense.create.mockResolvedValue({
      id: 'exp-1',
      amount: 2500,
      expenseDate: new Date('2026-08-18T00:00:00.000Z'),
      description: 'Staff Payment — Ravi Photographer (BK-000008)',
      vendorPerson: 'Ravi Photographer',
      referenceNumber: 'UPI-99',
      notes: 'Shoot day',
      clientId: 'client-1',
      bookingId: 'booking-1',
      staffId: 'staff-1',
      invoiceId: null,
      createdAt: new Date('2026-08-18T00:00:00.000Z'),
      category: { code: 'staff', label: 'Staff' },
      paymentMode: { code: 'upi', label: 'UPI' },
      client: { fullName: 'UAT Test Client' },
      booking: { bookingNumber: 'BK-000008' },
      staff: { fullName: 'Ravi Photographer' },
      invoice: null,
    });

    const result = await service.createStaffPayment('company-1', 'user-1', {
      staffId: 'staff-1',
      amount: 2500,
      paymentDate: '2026-08-18',
      paymentModeCode: 'upi',
      bookingId: 'booking-1',
      referenceNumber: 'UPI-99',
      notes: 'Shoot day',
    });

    expect(result.categoryCode).toBe('staff');
    expect(result.staffId).toBe('staff-1');
    expect(result.bookingNumber).toBe('BK-000008');
    expect(result.description).toContain('Staff Payment');
    expect(mockPrisma.expense.create).toHaveBeenCalledTimes(1);
  });

  it('rejects staff payments for inactive staff', async () => {
    mockPrisma.staff.findFirst.mockResolvedValue(null);

    await expect(
      service.createStaffPayment('company-1', 'user-1', {
        staffId: 'staff-inactive',
        amount: 500,
        paymentDate: '2026-08-18',
        paymentModeCode: 'cash',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.expense.create).not.toHaveBeenCalled();
  });
});
