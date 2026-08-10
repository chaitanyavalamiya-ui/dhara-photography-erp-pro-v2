import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BookingStaffExpenseService } from './booking-staff-expense.service';
import {
  BookingStaffMemberDto,
  CreateBookingStaffDto,
  UpdateBookingStaffDto,
} from './dto/booking-staff.dto';
import { assertStaffRole, getStaffRoleLabel } from '../staff/utils/staff.utils';
import { parseOptionalDate, toDateOnlyString } from '../clients/utils/client.utils';
import { roundMoney, toDecimal } from './utils/booking.utils';

@Injectable()
export class BookingStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly expenseSync: BookingStaffExpenseService,
  ) {}

  async listForBooking(companyId: string, bookingId: string): Promise<BookingStaffMemberDto[]> {
    await this.assertBooking(companyId, bookingId);

    const assignments = await this.prisma.bookingStaff.findMany({
      where: { bookingId, archivedAt: null },
      include: {
        staff: { select: { id: true, staffCode: true, fullName: true } },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    return assignments.map((assignment) => this.mapAssignment(assignment));
  }

  async assign(
    companyId: string,
    userId: string,
    bookingId: string,
    dto: CreateBookingStaffDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BookingStaffMemberDto> {
    const booking = await this.assertBooking(companyId, bookingId);
    const role = assertStaffRole(dto.role);

    const staffMember = await this.prisma.staff.findFirst({
      where: { id: dto.staffId, companyId, archivedAt: null, isActive: true },
    });

    if (!staffMember) {
      throw new NotFoundException('Staff member not found.');
    }

    const existing = await this.prisma.bookingStaff.findFirst({
      where: { bookingId, staffId: dto.staffId, role, archivedAt: null },
    });

    if (existing) {
      throw new ConflictException('This staff member is already assigned to this role on the booking.');
    }

    const agreedRate = dto.agreedRate ?? Number(staffMember.defaultRate);
    const assignmentDate = parseOptionalDate(dto.assignmentDate) ?? booking.eventDate;

    let assignment = await this.prisma.bookingStaff.create({
      data: {
        bookingId,
        staffId: dto.staffId,
        role,
        assignmentDate,
        agreedRate: agreedRate > 0 ? toDecimal(roundMoney(agreedRate)) : null,
        notes: dto.notes?.trim() || null,
        createdById: userId,
        updatedById: userId,
      },
      include: {
        staff: { select: { id: true, staffCode: true, fullName: true } },
      },
    });

    if (dto.syncExpense !== false && agreedRate > 0) {
      const expenseId = await this.expenseSync.syncAssignmentExpense(
        companyId,
        userId,
        {
          id: assignment.id,
          companyId: booking.companyId,
          branchId: booking.branchId,
          clientId: booking.clientId,
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          staffId: staffMember.id,
          staffName: staffMember.fullName,
          role,
          roleLabel: getStaffRoleLabel(role),
          agreedRate: assignment.agreedRate,
          expenseId: null,
          assignmentDate,
        },
        ipAddress,
        userAgent,
      );

      if (expenseId) {
        assignment = await this.prisma.bookingStaff.update({
          where: { id: assignment.id },
          data: { expenseId },
          include: {
            staff: { select: { id: true, staffCode: true, fullName: true } },
          },
        });
      }
    }

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'bookings',
      action: 'assign_staff',
      recordType: 'booking_staff',
      recordId: assignment.id,
      newValue: { bookingId, staffId: dto.staffId, role },
      ipAddress,
      userAgent,
    });

    return this.mapAssignment(assignment);
  }

  async updateAssignment(
    companyId: string,
    userId: string,
    bookingId: string,
    assignmentId: string,
    dto: UpdateBookingStaffDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BookingStaffMemberDto> {
    const booking = await this.assertBooking(companyId, bookingId);

    const assignment = await this.prisma.bookingStaff.findFirst({
      where: { id: assignmentId, bookingId, archivedAt: null },
      include: {
        staff: { select: { id: true, staffCode: true, fullName: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Staff assignment not found.');
    }

    let staffMember = assignment.staff;
    if (dto.staffId && dto.staffId !== assignment.staffId) {
      const replacement = await this.prisma.staff.findFirst({
        where: { id: dto.staffId, companyId, archivedAt: null, isActive: true },
      });

      if (!replacement) {
        throw new NotFoundException('Staff member not found.');
      }

      staffMember = replacement;
    }

    const role = dto.role ? assertStaffRole(dto.role) : assignment.role;

    if (dto.staffId || dto.role) {
      const conflict = await this.prisma.bookingStaff.findFirst({
        where: {
          bookingId,
          staffId: dto.staffId ?? assignment.staffId,
          role,
          archivedAt: null,
          id: { not: assignmentId },
        },
      });

      if (conflict) {
        throw new ConflictException('This staff member is already assigned to this role on the booking.');
      }
    }

    const agreedRate =
      dto.agreedRate !== undefined ? roundMoney(dto.agreedRate) : Number(assignment.agreedRate ?? 0);
    const assignmentDate =
      dto.assignmentDate !== undefined
        ? parseOptionalDate(dto.assignmentDate)
        : assignment.assignmentDate;

    let updated = await this.prisma.bookingStaff.update({
      where: { id: assignmentId },
      data: {
        ...(dto.staffId ? { staffId: dto.staffId } : {}),
        ...(dto.role ? { role } : {}),
        ...(dto.assignmentDate !== undefined ? { assignmentDate } : {}),
        ...(dto.agreedRate !== undefined
          ? { agreedRate: agreedRate > 0 ? toDecimal(roundMoney(agreedRate)) : null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        updatedById: userId,
      },
      include: {
        staff: { select: { id: true, staffCode: true, fullName: true } },
      },
    });

    if (dto.syncExpense !== false) {
      const expenseId = await this.expenseSync.syncAssignmentExpense(
        companyId,
        userId,
        {
          id: updated.id,
          companyId: booking.companyId,
          branchId: booking.branchId,
          clientId: booking.clientId,
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          staffId: updated.staffId,
          staffName: staffMember.fullName,
          role: updated.role,
          roleLabel: getStaffRoleLabel(updated.role),
          agreedRate: updated.agreedRate,
          expenseId: updated.expenseId,
          assignmentDate: updated.assignmentDate,
        },
        ipAddress,
        userAgent,
      );

      if (expenseId !== updated.expenseId) {
        updated = await this.prisma.bookingStaff.update({
          where: { id: assignmentId },
          data: { expenseId },
          include: {
            staff: { select: { id: true, staffCode: true, fullName: true } },
          },
        });
      }
    }

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'bookings',
      action: 'update_staff_assignment',
      recordType: 'booking_staff',
      recordId: assignmentId,
      newValue: { bookingId, staffId: updated.staffId, role: updated.role },
      ipAddress,
      userAgent,
    });

    return this.mapAssignment(updated);
  }

  async removeAssignment(
    companyId: string,
    userId: string,
    bookingId: string,
    assignmentId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const booking = await this.assertBooking(companyId, bookingId);

    const assignment = await this.prisma.bookingStaff.findFirst({
      where: { id: assignmentId, bookingId, archivedAt: null },
      include: {
        staff: { select: { fullName: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Staff assignment not found.');
    }

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
        agreedRate: assignment.agreedRate,
        expenseId: assignment.expenseId,
        assignmentDate: assignment.assignmentDate,
      },
      ipAddress,
      userAgent,
    );

    await this.prisma.bookingStaff.update({
      where: { id: assignmentId },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: userId,
        expenseId: null,
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'bookings',
      action: 'remove_staff_assignment',
      recordType: 'booking_staff',
      recordId: assignmentId,
      previousValue: { bookingId, staffId: assignment.staffId, role: assignment.role },
      ipAddress,
      userAgent,
    });

    return { message: 'Staff assignment removed successfully.' };
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

  private mapAssignment(assignment: {
    id: string;
    staffId: string;
    role: string;
    assignmentDate: Date | null;
    agreedRate: { toString(): string } | null;
    notes: string | null;
    expenseId: string | null;
    staff: { id: string; staffCode: string; fullName: string };
  }): BookingStaffMemberDto {
    return {
      id: assignment.id,
      staffId: assignment.staffId,
      staffCode: assignment.staff.staffCode,
      staffName: assignment.staff.fullName,
      role: assignment.role,
      roleLabel: getStaffRoleLabel(assignment.role),
      assignmentDate: toDateOnlyString(assignment.assignmentDate),
      agreedRate: assignment.agreedRate !== null ? Number(assignment.agreedRate) : null,
      notes: assignment.notes,
      expenseId: assignment.expenseId,
    };
  }
}
