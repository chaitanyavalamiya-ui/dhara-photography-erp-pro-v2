import { Test } from '@nestjs/testing';
import { BookingStaffService } from './booking-staff.service';
import { BookingStaffExpenseService } from './booking-staff-expense.service';
import { BookingActivityService } from './booking-activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

function money(amount: number) {
  return { toString: () => String(amount), valueOf: () => amount };
}

describe('BookingStaffService assignment is payable, not cash', () => {
  let service: BookingStaffService;

  const booking = {
    id: 'booking-1',
    companyId: 'company-1',
    branchId: 'branch-1',
    clientId: 'client-1',
    bookingNumber: 'BK-000001',
    eventDate: new Date('2026-08-15T00:00:00.000Z'),
    archivedAt: null,
  };

  const staffMember = {
    id: 'staff-1',
    staffCode: 'ST-0001',
    fullName: 'Ravi Patel',
    defaultRate: 2000,
    archivedAt: null,
    isActive: true,
  };

  const createdAssignment = {
    id: 'asg-1',
    staffId: 'staff-1',
    role: 'photographer',
    assignmentDate: booking.eventDate,
    agreedRate: money(2000),
    notes: null,
    expenseId: null,
    staff: { id: 'staff-1', staffCode: 'ST-0001', fullName: 'Ravi Patel' },
  };

  const mockPrisma = {
    booking: { findFirst: jest.fn() },
    staff: { findFirst: jest.fn() },
    bookingStaff: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    bookingStaffPayment: { findFirst: jest.fn() },
  };

  const mockAudit = { log: jest.fn() };
  const mockExpenseSync = {
    syncAssignmentExpense: jest.fn(),
    archiveLinkedExpense: jest.fn(),
  };
  const mockActivity = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.booking.findFirst.mockResolvedValue(booking);
    mockPrisma.staff.findFirst.mockResolvedValue(staffMember);
    mockPrisma.bookingStaff.findFirst.mockResolvedValue(null);
    mockPrisma.bookingStaff.create.mockResolvedValue(createdAssignment);
    mockPrisma.bookingStaff.update.mockResolvedValue({ ...createdAssignment, archivedAt: new Date() });
    mockPrisma.bookingStaffPayment.findFirst.mockResolvedValue(null);
    mockExpenseSync.archiveLinkedExpense.mockResolvedValue(null);

    const module = await Test.createTestingModule({
      providers: [
        BookingStaffService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: BookingStaffExpenseService, useValue: mockExpenseSync },
        { provide: BookingActivityService, useValue: mockActivity },
      ],
    }).compile();

    service = module.get(BookingStaffService);
  });

  it('stores agreed rate on assign without creating a cash expense', async () => {
    const result = await service.assign('company-1', 'user-1', 'booking-1', {
      staffId: 'staff-1',
      role: 'photographer',
      agreedRate: 2000,
      syncExpense: true,
    });

    expect(result.agreedRate).toBe(2000);
    expect(result.expenseId).toBeNull();
    expect(mockExpenseSync.syncAssignmentExpense).not.toHaveBeenCalled();
    expect(mockPrisma.bookingStaff.create).toHaveBeenCalledTimes(1);
  });

  it('updates agreed rate without creating or updating a cash expense', async () => {
    mockPrisma.bookingStaff.findFirst.mockResolvedValue(createdAssignment);
    mockPrisma.bookingStaff.update.mockResolvedValue({
      ...createdAssignment,
      agreedRate: money(2500),
    });

    const result = await service.updateAssignment(
      'company-1',
      'user-1',
      'booking-1',
      'asg-1',
      { agreedRate: 2500, syncExpense: true },
    );

    expect(result.agreedRate).toBe(2500);
    expect(mockExpenseSync.syncAssignmentExpense).not.toHaveBeenCalled();
  });

  it('archives an unclaimed assignment-era expense on remove, not a paid payment expense', async () => {
    mockPrisma.bookingStaff.findFirst.mockResolvedValue({
      ...createdAssignment,
      expenseId: 'legacy-exp-1',
      staff: { fullName: 'Ravi Patel' },
    });
    mockPrisma.bookingStaffPayment.findFirst.mockResolvedValue(null);

    await service.removeAssignment('company-1', 'user-1', 'booking-1', 'asg-1');

    expect(mockExpenseSync.archiveLinkedExpense).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.objectContaining({ expenseId: 'legacy-exp-1' }),
      undefined,
      undefined,
    );
  });

  it('does not archive a cash expense already claimed by a staff payment', async () => {
    mockPrisma.bookingStaff.findFirst.mockResolvedValue({
      ...createdAssignment,
      expenseId: 'paid-exp-1',
      staff: { fullName: 'Ravi Patel' },
    });
    mockPrisma.bookingStaffPayment.findFirst.mockResolvedValue({ id: 'pay-1' });

    await service.removeAssignment('company-1', 'user-1', 'booking-1', 'asg-1');

    expect(mockExpenseSync.archiveLinkedExpense).not.toHaveBeenCalled();
  });
});
