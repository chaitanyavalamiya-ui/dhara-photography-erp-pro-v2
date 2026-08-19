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

  describe('parent-link consistency', () => {
    const createdExpense = {
      id: 'exp-1',
      amount: 100,
      expenseDate: new Date('2026-08-18T00:00:00.000Z'),
      description: 'Travel',
      vendorPerson: null,
      referenceNumber: null,
      notes: null,
      clientId: null,
      bookingId: null,
      staffId: null,
      invoiceId: null,
      createdAt: new Date('2026-08-18T00:00:00.000Z'),
      category: { code: 'travel', label: 'Travel' },
      paymentMode: null,
      client: null,
      booking: null,
      staff: null,
      invoice: null,
    };

    function stubCreate(overrides: Record<string, unknown> = {}) {
      mockPrisma.masterData.findFirst.mockResolvedValue({ id: 'cat-1', code: 'travel' });
      mockPrisma.companyBranch.findFirst.mockResolvedValue({ id: 'branch-default' });
      mockPrisma.expense.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        ...createdExpense,
        ...data,
        ...overrides,
        client: data.clientId ? { fullName: 'Asha' } : null,
        booking: data.bookingId ? { bookingNumber: 'BK-000001' } : null,
        staff: data.staffId ? { fullName: 'Ravi' } : null,
        invoice: data.invoiceId ? { invoiceNumber: 'INV-000001' } : null,
      }));
    }

    it('creates with the booking canonical client and branch when they match', async () => {
      stubCreate();
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        clientId: 'client-1',
        branchId: 'branch-booking',
      });

      await service.create('company-1', 'user-1', {
        categoryCode: 'travel',
        amount: 100,
        expenseDate: '2026-08-18',
        bookingId: 'booking-1',
        clientId: 'client-1',
      });

      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'booking-1', companyId: 'company-1' }),
        }),
      );
      expect(mockPrisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingId: 'booking-1',
            clientId: 'client-1',
            branchId: 'branch-booking',
          }),
        }),
      );
    });

    it('rejects a client that does not match the booking', async () => {
      stubCreate();
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        clientId: 'client-1',
        branchId: 'branch-booking',
      });

      await expect(
        service.create('company-1', 'user-1', {
          categoryCode: 'travel',
          amount: 100,
          expenseDate: '2026-08-18',
          bookingId: 'booking-1',
          clientId: 'client-other',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create('company-1', 'user-1', {
          categoryCode: 'travel',
          amount: 100,
          expenseDate: '2026-08-18',
          bookingId: 'booking-1',
          clientId: 'client-other',
        }),
      ).rejects.toThrow('Expense client must match the selected booking client.');
      expect(mockPrisma.expense.create).not.toHaveBeenCalled();
    });

    it('rewrites client and branch from the new booking when bookingId changes', async () => {
      stubCreate();
      mockPrisma.expense.findFirst.mockResolvedValue({
        ...createdExpense,
        clientId: 'client-old',
        bookingId: 'booking-old',
        staffId: null,
        invoiceId: null,
      });
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-new',
        clientId: 'client-new',
        branchId: 'branch-new',
      });
      mockPrisma.expense.update.mockResolvedValue({
        ...createdExpense,
        clientId: 'client-new',
        bookingId: 'booking-new',
      });

      await service.update('company-1', 'user-1', 'exp-1', { bookingId: 'booking-new' });

      expect(mockPrisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingId: 'booking-new',
            clientId: 'client-new',
            branchId: 'branch-new',
          }),
        }),
      );
    });

    it('rejects an invoice from another booking', async () => {
      stubCreate();
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        clientId: 'client-1',
        branchId: 'branch-booking',
      });
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-other',
        bookingId: 'booking-other',
      });

      await expect(
        service.create('company-1', 'user-1', {
          categoryCode: 'travel',
          amount: 100,
          expenseDate: '2026-08-18',
          bookingId: 'booking-1',
          invoiceId: 'inv-other',
        }),
      ).rejects.toThrow('Invoice does not belong to the selected booking.');
      expect(mockPrisma.expense.create).not.toHaveBeenCalled();
    });

    it('rejects an invoice from another company', async () => {
      stubCreate();
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.create('company-1', 'user-1', {
          categoryCode: 'travel',
          amount: 100,
          expenseDate: '2026-08-18',
          invoiceId: 'inv-foreign',
        }),
      ).rejects.toThrow('Invoice not found in this company.');
      expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'inv-foreign', companyId: 'company-1' }),
        }),
      );
      expect(mockPrisma.expense.create).not.toHaveBeenCalled();
    });

    it('rejects staff from another company', async () => {
      stubCreate();
      mockPrisma.staff.findFirst.mockResolvedValue(null);

      await expect(
        service.create('company-1', 'user-1', {
          categoryCode: 'travel',
          amount: 100,
          expenseDate: '2026-08-18',
          staffId: 'staff-foreign',
        }),
      ).rejects.toThrow('Staff member not found in this company.');
      expect(mockPrisma.staff.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'staff-foreign', companyId: 'company-1' }),
        }),
      );
      expect(mockPrisma.expense.create).not.toHaveBeenCalled();
    });

    it('still creates a standalone expense without a booking', async () => {
      stubCreate();

      await service.create('company-1', 'user-1', {
        categoryCode: 'travel',
        amount: 100,
        expenseDate: '2026-08-18',
      });

      expect(mockPrisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            branchId: 'branch-default',
            bookingId: null,
            clientId: null,
            invoiceId: null,
            staffId: null,
          }),
        }),
      );
    });
  });
});
