import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingActivityService } from './booking-activity.service';
import { BookingStaffExpenseService } from './booking-staff-expense.service';
import { CreateStaffPaymentDto, UpdateStaffPaymentDto } from './dto/booking-operations.dto';
import { getStaffRoleLabel } from '../staff/utils/staff.utils';
import { parseOptionalDate, toDateOnlyString } from '../clients/utils/client.utils';
import { roundMoney, toDecimal } from './utils/booking.utils';
import { formatCurrencyForActivity } from './utils/booking-operations.helpers';

@Injectable()
export class BookingStaffPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: BookingActivityService,
    private readonly expenseSync: BookingStaffExpenseService,
  ) {}

  async listForBooking(companyId: string, bookingId: string) {
    await this.assertBooking(companyId, bookingId);

    const payments = await this.prisma.bookingStaffPayment.findMany({
      where: { companyId, bookingId, archivedAt: null },
      include: {
        bookingStaff: {
          include: { staff: { select: { fullName: true, staffCode: true } } },
        },
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    });

    return payments.map((payment) => this.mapPayment(payment));
  }

  async listForAssignment(companyId: string, bookingId: string, assignmentId: string) {
    await this.assertAssignment(companyId, bookingId, assignmentId);

    const payments = await this.prisma.bookingStaffPayment.findMany({
      where: { companyId, bookingId, bookingStaffId: assignmentId, archivedAt: null },
      include: {
        bookingStaff: {
          include: { staff: { select: { fullName: true, staffCode: true } } },
        },
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    });

    return payments.map((payment) => this.mapPayment(payment));
  }

  async create(
    companyId: string,
    userId: string,
    bookingId: string,
    assignmentId: string,
    dto: CreateStaffPaymentDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { booking, assignment } = await this.assertAssignment(companyId, bookingId, assignmentId);
    const status = dto.status ?? 'pending';
    const amount = roundMoney(dto.amount);
    const paymentDate = dto.paymentDate ? parseOptionalDate(dto.paymentDate) : null;

    let expenseId: string | null = null;
    if (status === 'paid') {
      expenseId = await this.syncPaidExpense(
        companyId,
        userId,
        booking,
        assignment,
        amount,
        paymentDate ?? new Date(),
        ipAddress,
        userAgent,
      );
    }

    const payment = await this.prisma.bookingStaffPayment.create({
      data: {
        companyId,
        bookingId,
        bookingStaffId: assignmentId,
        amount: toDecimal(amount),
        status,
        paymentDate,
        paymentMode: dto.paymentMode?.trim() || null,
        notes: dto.notes?.trim() || null,
        expenseId,
        recordedById: userId,
        createdById: userId,
        updatedById: userId,
      },
      include: {
        bookingStaff: {
          include: { staff: { select: { fullName: true, staffCode: true } } },
        },
      },
    });

    await this.activityService.log(
      companyId,
      bookingId,
      'staff_payment',
      `${formatCurrencyForActivity(amount)} ${status === 'paid' ? 'paid to' : 'recorded for'} ${assignment.staff.fullName} (${getStaffRoleLabel(assignment.role)})`,
      userId,
      { paymentId: payment.id, assignmentId, status },
      paymentDate ?? new Date(),
    );

    return this.mapPayment(payment);
  }

  async update(
    companyId: string,
    userId: string,
    bookingId: string,
    assignmentId: string,
    paymentId: string,
    dto: UpdateStaffPaymentDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { booking, assignment } = await this.assertAssignment(companyId, bookingId, assignmentId);

    const existing = await this.prisma.bookingStaffPayment.findFirst({
      where: { id: paymentId, bookingId, bookingStaffId: assignmentId, companyId, archivedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Staff payment not found.');
    }

    const status = dto.status ?? existing.status;
    const amount = dto.amount !== undefined ? roundMoney(dto.amount) : Number(existing.amount);
    const paymentDate =
      dto.paymentDate !== undefined
        ? parseOptionalDate(dto.paymentDate)
        : existing.paymentDate;

    let expenseId = existing.expenseId;
    if (status === 'paid') {
      expenseId = await this.syncPaidExpense(
        companyId,
        userId,
        booking,
        assignment,
        amount,
        paymentDate ?? new Date(),
        ipAddress,
        userAgent,
        expenseId,
        paymentId,
      );
    } else if (existing.status === 'paid' && existing.expenseId) {
      await this.archivePaymentExpense(
        companyId,
        userId,
        booking,
        assignment,
        existing.expenseId,
        ipAddress,
        userAgent,
      );
      expenseId = null;
    }

    const payment = await this.prisma.bookingStaffPayment.update({
      where: { id: paymentId },
      data: {
        ...(dto.amount !== undefined ? { amount: toDecimal(amount) } : {}),
        ...(dto.status !== undefined ? { status } : {}),
        ...(dto.paymentDate !== undefined ? { paymentDate } : {}),
        ...(dto.paymentMode !== undefined ? { paymentMode: dto.paymentMode?.trim() || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        expenseId,
        recordedById: userId,
        updatedById: userId,
      },
      include: {
        bookingStaff: {
          include: { staff: { select: { fullName: true, staffCode: true } } },
        },
      },
    });

    if (dto.status === 'paid' && existing.status !== 'paid') {
      await this.activityService.log(
        companyId,
        bookingId,
        'staff_payment',
        `${formatCurrencyForActivity(amount)} paid to ${assignment.staff.fullName} (${getStaffRoleLabel(assignment.role)})`,
        userId,
        { paymentId: payment.id, assignmentId },
        paymentDate ?? new Date(),
      );
    }

    return this.mapPayment(payment);
  }

  async remove(
    companyId: string,
    userId: string,
    bookingId: string,
    assignmentId: string,
    paymentId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { booking, assignment } = await this.assertAssignment(companyId, bookingId, assignmentId);

    const existing = await this.prisma.bookingStaffPayment.findFirst({
      where: { id: paymentId, bookingId, bookingStaffId: assignmentId, companyId, archivedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Staff payment not found.');
    }

    if (existing.expenseId) {
      await this.archivePaymentExpense(
        companyId,
        userId,
        booking,
        assignment,
        existing.expenseId,
        ipAddress,
        userAgent,
      );
    }

    await this.prisma.bookingStaffPayment.update({
      where: { id: paymentId },
      data: {
        isActive: false,
        archivedAt: new Date(),
        expenseId: null,
        updatedById: userId,
      },
    });

    return { message: 'Staff payment removed successfully.' };
  }

  private async archivePaymentExpense(
    companyId: string,
    userId: string,
    booking: { id: string; companyId: string; branchId: string; clientId: string; bookingNumber: string },
    assignment: {
      id: string;
      staffId: string;
      role: string;
      staff: { fullName: string };
    },
    expenseId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.expenseSync.archiveLinkedExpense(
      companyId,
      userId,
      {
        id: assignment.id,
        companyId: booking.companyId,
        branchId: booking.branchId,
        clientId: booking.clientId,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        staffId: assignment.staffId,
        staffName: assignment.staff.fullName,
        role: assignment.role,
        roleLabel: getStaffRoleLabel(assignment.role),
        agreedRate: 0,
        expenseId,
      },
      ipAddress,
      userAgent,
    );
  }

  private async resolvePaidExpenseId(
    companyId: string,
    assignment: { expenseId: string | null },
    existingExpenseId?: string | null,
    currentPaymentId?: string,
  ): Promise<string | null> {
    if (existingExpenseId) {
      return existingExpenseId;
    }

    if (!assignment.expenseId) {
      return null;
    }

    const claimedByOtherPayment = await this.prisma.bookingStaffPayment.findFirst({
      where: {
        companyId,
        expenseId: assignment.expenseId,
        archivedAt: null,
        isActive: true,
        ...(currentPaymentId ? { id: { not: currentPaymentId } } : {}),
      },
    });

    return claimedByOtherPayment ? null : assignment.expenseId;
  }

  private async syncPaidExpense(
    companyId: string,
    userId: string,
    booking: { id: string; companyId: string; branchId: string; clientId: string; bookingNumber: string },
    assignment: {
      id: string;
      staffId: string;
      role: string;
      staff: { fullName: string };
      expenseId: string | null;
    },
    amount: number,
    paymentDate: Date,
    ipAddress?: string,
    userAgent?: string,
    existingExpenseId?: string | null,
    currentPaymentId?: string,
  ): Promise<string | null> {
    const expenseId = await this.resolvePaidExpenseId(
      companyId,
      assignment,
      existingExpenseId,
      currentPaymentId,
    );

    const synced = await this.expenseSync.syncAssignmentExpense(
      companyId,
      userId,
      {
        id: assignment.id,
        companyId: booking.companyId,
        branchId: booking.branchId,
        clientId: booking.clientId,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        staffId: assignment.staffId,
        staffName: assignment.staff.fullName,
        role: assignment.role,
        roleLabel: getStaffRoleLabel(assignment.role),
        agreedRate: amount,
        expenseId,
        assignmentDate: paymentDate,
      },
      ipAddress,
      userAgent,
    );

    if (synced && assignment.expenseId && assignment.expenseId === synced) {
      await this.prisma.bookingStaff.update({
        where: { id: assignment.id },
        data: { expenseId: null },
      });
    }

    return synced;
  }

  private async assertBooking(companyId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId, archivedAt: null },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    return booking;
  }

  private async assertAssignment(companyId: string, bookingId: string, assignmentId: string) {
    const booking = await this.assertBooking(companyId, bookingId);

    const assignment = await this.prisma.bookingStaff.findFirst({
      where: { id: assignmentId, bookingId, archivedAt: null },
      include: { staff: { select: { fullName: true, staffCode: true } } },
    });

    if (!assignment) {
      throw new NotFoundException('Staff assignment not found.');
    }

    return { booking, assignment };
  }

  private mapPayment(payment: {
    id: string;
    bookingStaffId: string;
    amount: { toString(): string };
    status: string;
    paymentDate: Date | null;
    paymentMode: string | null;
    notes: string | null;
    recordedById: string | null;
    createdAt: Date;
    bookingStaff: {
      role: string;
      staff: { fullName: string; staffCode: string };
    };
  }) {
    return {
      id: payment.id,
      bookingStaffId: payment.bookingStaffId,
      staffName: payment.bookingStaff.staff.fullName,
      staffCode: payment.bookingStaff.staff.staffCode,
      role: payment.bookingStaff.role,
      roleLabel: getStaffRoleLabel(payment.bookingStaff.role),
      amount: Number(payment.amount),
      status: payment.status,
      paymentDate: toDateOnlyString(payment.paymentDate),
      paymentMode: payment.paymentMode,
      notes: payment.notes,
      recordedById: payment.recordedById,
      createdAt: payment.createdAt.toISOString(),
    };
  }
}
