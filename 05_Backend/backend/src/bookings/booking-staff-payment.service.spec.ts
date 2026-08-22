import { Test } from '@nestjs/testing';
import { BookingStaffPaymentService } from './booking-staff-payment.service';
import { BookingStaffExpenseService } from './booking-staff-expense.service';
import { BookingActivityService } from './booking-activity.service';
import { PrismaService } from '../prisma/prisma.service';

function money(amount: number) {
  return { toString: () => String(amount), valueOf: () => amount };
}

describe('BookingStaffPaymentService cash expense only on paid', () => {
  let service: BookingStaffPaymentService;

  const booking = {
    id: 'booking-1',
    companyId: 'company-1',
    branchId: 'branch-1',
    clientId: 'client-1',
    bookingNumber: 'BK-000001',
    archivedAt: null,
  };

  const assignment = {
    id: 'asg-1',
    staffId: 'staff-1',
    role: 'photographer',
    expenseId: null,
    staff: { fullName: 'Ravi Patel', staffCode: 'ST-0001' },
  };

  const mockPrisma = {
    booking: { findFirst: jest.fn() },
    bookingStaff: { findFirst: jest.fn(), update: jest.fn() },
    bookingStaffPayment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockExpenseSync = {
    syncAssignmentExpense: jest.fn(),
    archiveLinkedExpense: jest.fn(),
  };
  const mockActivity = { log: jest.fn() };

  function createdPayment(overrides: Record<string, unknown> = {}) {
    return {
      id: 'pay-1',
      bookingStaffId: 'asg-1',
      amount: money(2000),
      status: 'paid',
      paymentDate: new Date('2026-08-20T00:00:00.000Z'),
      paymentMode: 'cash',
      notes: null,
      recordedById: 'user-1',
      createdAt: new Date('2026-08-20T00:00:00.000Z'),
      bookingStaff: {
        role: 'photographer',
        staff: { fullName: 'Ravi Patel', staffCode: 'ST-0001' },
      },
      ...overrides,
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.booking.findFirst.mockResolvedValue(booking);
    mockPrisma.bookingStaff.findFirst.mockResolvedValue(assignment);
    mockPrisma.bookingStaffPayment.findFirst.mockResolvedValue(null);
    mockPrisma.bookingStaff.update.mockResolvedValue({ ...assignment, expenseId: null });
    mockExpenseSync.syncAssignmentExpense.mockResolvedValue('exp-pay-1');
    mockPrisma.bookingStaffPayment.create.mockResolvedValue(createdPayment());

    const module = await Test.createTestingModule({
      providers: [
        BookingStaffPaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BookingStaffExpenseService, useValue: mockExpenseSync },
        { provide: BookingActivityService, useValue: mockActivity },
      ],
    }).compile();

    service = module.get(BookingStaffPaymentService);
  });

  it('does not create a cash expense for a pending staff payment', async () => {
    mockPrisma.bookingStaffPayment.create.mockResolvedValue(
      createdPayment({ status: 'pending', amount: money(2000), id: 'pay-pending' }),
    );

    await service.create('company-1', 'user-1', 'booking-1', 'asg-1', {
      amount: 2000,
      status: 'pending',
    });

    expect(mockExpenseSync.syncAssignmentExpense).not.toHaveBeenCalled();
    expect(mockPrisma.bookingStaffPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending', expenseId: null }),
      }),
    );
  });

  it('creates one cash expense when the staff payment is marked paid', async () => {
    const result = await service.create('company-1', 'user-1', 'booking-1', 'asg-1', {
      amount: 2000,
      status: 'paid',
      paymentDate: '2026-08-20',
      paymentMode: 'cash',
    });

    expect(mockExpenseSync.syncAssignmentExpense).toHaveBeenCalledTimes(1);
    expect(mockExpenseSync.syncAssignmentExpense).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.objectContaining({ agreedRate: 2000, expenseId: null }),
      undefined,
      undefined,
    );
    expect(mockPrisma.bookingStaffPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'paid', expenseId: 'exp-pay-1' }),
      }),
    );
    expect(result.amount).toBe(2000);
    expect(result.status).toBe('paid');
  });

  it('records only the paid amount for a partial staff payment', async () => {
    mockPrisma.bookingStaffPayment.create.mockResolvedValue(
      createdPayment({ amount: money(800), id: 'pay-partial' }),
    );
    mockExpenseSync.syncAssignmentExpense.mockResolvedValue('exp-800');

    await service.create('company-1', 'user-1', 'booking-1', 'asg-1', {
      amount: 800,
      status: 'paid',
      paymentDate: '2026-08-20',
    });

    expect(mockExpenseSync.syncAssignmentExpense).toHaveBeenCalledTimes(1);
    expect(mockExpenseSync.syncAssignmentExpense).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.objectContaining({ agreedRate: 800, expenseId: null }),
      undefined,
      undefined,
    );
  });

  it('reuses an unclaimed legacy assignment expense instead of creating a second cash row', async () => {
    mockPrisma.bookingStaff.findFirst.mockResolvedValue({
      ...assignment,
      expenseId: 'legacy-exp-1',
    });
    mockPrisma.bookingStaffPayment.findFirst.mockResolvedValue(null);
    mockExpenseSync.syncAssignmentExpense.mockResolvedValue('legacy-exp-1');

    await service.create('company-1', 'user-1', 'booking-1', 'asg-1', {
      amount: 2000,
      status: 'paid',
    });

    expect(mockExpenseSync.syncAssignmentExpense).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.objectContaining({ expenseId: 'legacy-exp-1', agreedRate: 2000 }),
      undefined,
      undefined,
    );
    expect(mockPrisma.bookingStaff.update).toHaveBeenCalledWith({
      where: { id: 'asg-1' },
      data: { expenseId: null },
    });
  });

  it('does not reuse a legacy assignment expense already claimed by another payment', async () => {
    mockPrisma.bookingStaff.findFirst.mockResolvedValue({
      ...assignment,
      expenseId: 'legacy-exp-1',
    });
    mockPrisma.bookingStaffPayment.findFirst.mockResolvedValue({ id: 'other-pay' });
    mockExpenseSync.syncAssignmentExpense.mockResolvedValue('exp-new');

    await service.create('company-1', 'user-1', 'booking-1', 'asg-1', {
      amount: 1200,
      status: 'paid',
    });

    expect(mockExpenseSync.syncAssignmentExpense).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.objectContaining({ expenseId: null, agreedRate: 1200 }),
      undefined,
      undefined,
    );
  });
});
