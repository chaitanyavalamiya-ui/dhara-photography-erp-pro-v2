import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import {
  PaginatedStaffResponseDto,
  StaffDetailResponseDto,
  StaffResponseDto,
} from './dto/staff-response.dto';
import {
  normalizeEmail,
  normalizeIndianMobile,
  parseOptionalDate,
  toDateOnlyString,
  validateIndianMobile,
} from '../clients/utils/client.utils';
import { roundMoney, toDecimal } from '../bookings/utils/booking.utils';
import {
  assertPaymentType,
  assertStaffRole,
  getPaymentTypeLabel,
  getStaffRoleLabel,
} from './utils/staff.utils';

type StaffWithCounts = Prisma.StaffGetPayload<{
  include: {
    _count: { select: { assignments: true } };
  };
}>;

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    companyId: string,
    query: ListStaffQueryDto,
  ): Promise<PaginatedStaffResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const where = this.buildWhereClause(companyId, query.search, query.status, query.role);
    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const [staffMembers, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        include: { _count: { select: { assignments: { where: { archivedAt: null } } } } },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.staff.count({ where }),
    ]);

    return {
      items: staffMembers.map((member) => this.mapStaff(member)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(companyId: string, id: string): Promise<StaffDetailResponseDto> {
    const member = await this.prisma.staff.findFirst({
      where: { id, companyId, archivedAt: null },
      include: { _count: { select: { assignments: { where: { archivedAt: null } } } } },
    });

    if (!member) {
      throw new NotFoundException('Staff member not found.');
    }

    const today = this.startOfDay(new Date());

    const assignments = await this.prisma.bookingStaff.findMany({
      where: { staffId: id, archivedAt: null, booking: { companyId, archivedAt: null } },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            eventType: true,
            eventDate: true,
          },
        },
      },
      orderBy: { assignmentDate: 'desc' },
    });

    const upcomingBookings = assignments
      .filter((assignment) => {
        const eventDate = assignment.assignmentDate ?? assignment.booking.eventDate;
        return eventDate ? eventDate >= today : true;
      })
      .slice(0, 10)
      .map((assignment) => this.mapAssignment(assignment));

    const recentCompletedBookings = assignments
      .filter((assignment) => {
        const eventDate = assignment.assignmentDate ?? assignment.booking.eventDate;
        return eventDate ? eventDate < today : false;
      })
      .slice(0, 10)
      .map((assignment) => this.mapAssignment(assignment));

    const expenses = await this.prisma.expense.findMany({
      where: { companyId, staffId: id, archivedAt: null, isActive: true },
      include: { booking: { select: { bookingNumber: true } } },
      orderBy: { expenseDate: 'desc' },
      take: 10,
    });

    const expenseAggregate = await this.prisma.expense.aggregate({
      where: { companyId, staffId: id, archivedAt: null, isActive: true },
      _sum: { amount: true },
    });

    return {
      ...this.mapStaff(member),
      upcomingBookings,
      recentCompletedBookings,
      recentExpenses: expenses.map((expense) => ({
        id: expense.id,
        amount: Number(expense.amount),
        expenseDate: expense.expenseDate.toISOString().slice(0, 10),
        description: expense.description,
        bookingId: expense.bookingId,
        bookingNumber: expense.booking?.bookingNumber ?? null,
      })),
      totalExpenseAmount: Number(expenseAggregate._sum.amount ?? 0),
    };
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateStaffDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<StaffResponseDto> {
    const role = assertStaffRole(dto.role);
    const paymentType = assertPaymentType(dto.paymentType ?? 'per_event');

    const branch = await this.prisma.companyBranch.findFirst({
      where: { companyId, isActive: true, archivedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    if (!branch) {
      throw new NotFoundException('No active branch found for this company.');
    }

    const normalizedMobile = dto.mobile?.trim()
      ? normalizeIndianMobile(dto.mobile.trim())
      : null;
    if (normalizedMobile) {
      validateIndianMobile(dto.mobile!.trim());
    }

    const normalizedEmailValue = normalizeEmail(dto.email);
    await this.assertUniqueContact(companyId, normalizedMobile, normalizedEmailValue);

    const staffCode = await this.generateStaffCode(companyId);

    const member = await this.prisma.staff.create({
      data: {
        companyId,
        branchId: branch.id,
        staffCode,
        fullName: dto.fullName.trim(),
        mobile: dto.mobile?.trim() || null,
        normalizedMobile,
        email: dto.email?.trim() || null,
        normalizedEmail: normalizedEmailValue,
        address: dto.address?.trim() || null,
        role,
        joiningDate: parseOptionalDate(dto.joiningDate),
        paymentType,
        defaultRate: toDecimal(roundMoney(dto.defaultRate ?? 0)),
        notes: dto.notes?.trim() || null,
        isActive: dto.isActive ?? true,
        createdById: userId,
        updatedById: userId,
      },
      include: { _count: { select: { assignments: true } } },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'staff',
      action: 'create',
      recordType: 'staff',
      recordId: member.id,
      newValue: this.auditSnapshot(member),
      ipAddress,
      userAgent,
    });

    return this.mapStaff(member);
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateStaffDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<StaffResponseDto> {
    const existing = await this.prisma.staff.findFirst({
      where: { id, companyId, archivedAt: null },
      include: { _count: { select: { assignments: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Staff member not found.');
    }

    let normalizedMobile = existing.normalizedMobile;
    if (dto.mobile !== undefined) {
      normalizedMobile = dto.mobile?.trim()
        ? normalizeIndianMobile(dto.mobile.trim())
        : null;
      if (normalizedMobile) {
        validateIndianMobile(dto.mobile!.trim());
      }
    }

    let normalizedEmailValue = existing.normalizedEmail;
    if (dto.email !== undefined) {
      normalizedEmailValue = normalizeEmail(dto.email);
    }

    await this.assertUniqueContact(companyId, normalizedMobile, normalizedEmailValue, id);

    const updated = await this.prisma.staff.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.mobile !== undefined
          ? { mobile: dto.mobile?.trim() || null, normalizedMobile }
          : {}),
        ...(dto.email !== undefined
          ? { email: dto.email?.trim() || null, normalizedEmail: normalizedEmailValue }
          : {}),
        ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
        ...(dto.role !== undefined ? { role: assertStaffRole(dto.role) } : {}),
        ...(dto.joiningDate !== undefined
          ? { joiningDate: parseOptionalDate(dto.joiningDate) }
          : {}),
        ...(dto.paymentType !== undefined
          ? { paymentType: assertPaymentType(dto.paymentType) }
          : {}),
        ...(dto.defaultRate !== undefined
          ? { defaultRate: toDecimal(roundMoney(dto.defaultRate)) }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedById: userId,
      },
      include: { _count: { select: { assignments: { where: { archivedAt: null } } } } },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'staff',
      action: 'update',
      recordType: 'staff',
      recordId: id,
      previousValue: this.auditSnapshot(existing),
      newValue: this.auditSnapshot(updated),
      ipAddress,
      userAgent,
    });

    return this.mapStaff(updated);
  }

  async archive(
    companyId: string,
    userId: string,
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const existing = await this.prisma.staff.findFirst({
      where: { id, companyId, archivedAt: null },
      include: { _count: { select: { assignments: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Staff member not found.');
    }

    await this.prisma.staff.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: userId,
        archivedReason: 'Archived from staff module',
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'staff',
      action: 'archive',
      recordType: 'staff',
      recordId: id,
      previousValue: this.auditSnapshot(existing),
      ipAddress,
      userAgent,
    });

    return { message: 'Staff member archived successfully.' };
  }

  private mapStaff(member: StaffWithCounts): StaffResponseDto {
    return {
      id: member.id,
      staffCode: member.staffCode,
      fullName: member.fullName,
      mobile: member.mobile,
      email: member.email,
      address: member.address,
      role: member.role,
      roleLabel: getStaffRoleLabel(member.role),
      joiningDate: toDateOnlyString(member.joiningDate),
      paymentType: member.paymentType,
      paymentTypeLabel: getPaymentTypeLabel(member.paymentType),
      defaultRate: Number(member.defaultRate),
      notes: member.notes,
      isActive: member.isActive,
      totalAssignments: member._count.assignments,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };
  }

  private mapAssignment(assignment: {
    id: string;
    role: string;
    assignmentDate: Date | null;
    agreedRate: Prisma.Decimal | null;
    notes: string | null;
    booking: {
      id: string;
      bookingNumber: string;
      eventType: string;
      eventDate: Date | null;
    };
  }) {
    return {
      id: assignment.id,
      bookingId: assignment.booking.id,
      bookingNumber: assignment.booking.bookingNumber,
      eventType: assignment.booking.eventType,
      eventDate: toDateOnlyString(assignment.booking.eventDate),
      role: assignment.role,
      roleLabel: getStaffRoleLabel(assignment.role),
      assignmentDate: toDateOnlyString(assignment.assignmentDate),
      agreedRate: assignment.agreedRate !== null ? Number(assignment.agreedRate) : null,
      notes: assignment.notes,
    };
  }

  private buildWhereClause(
    companyId: string,
    search?: string,
    status: 'active' | 'inactive' | 'all' = 'active',
    role?: string,
  ): Prisma.StaffWhereInput {
    const where: Prisma.StaffWhereInput = {
      companyId,
      archivedAt: null,
    };

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (role) {
      where.role = role;
    }

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { mobile: { contains: term } },
        { email: { contains: term, mode: 'insensitive' } },
        { staffCode: { contains: term, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildOrderBy(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Prisma.StaffOrderByWithRelationInput {
    switch (sortBy) {
      case 'fullName':
        return { fullName: sortOrder };
      case 'staffCode':
        return { staffCode: sortOrder };
      case 'role':
        return { role: sortOrder };
      case 'mobile':
        return { mobile: sortOrder };
      case 'joiningDate':
        return { joiningDate: sortOrder };
      default:
        return { createdAt: sortOrder };
    }
  }

  private async assertUniqueContact(
    companyId: string,
    normalizedMobile: string | null,
    normalizedEmail: string | null,
    excludeStaffId?: string,
  ): Promise<void> {
    if (normalizedMobile) {
      const mobileConflict = await this.prisma.staff.findFirst({
        where: {
          companyId,
          normalizedMobile,
          archivedAt: null,
          ...(excludeStaffId ? { id: { not: excludeStaffId } } : {}),
        },
      });

      if (mobileConflict) {
        throw new ConflictException('A staff member with this mobile already exists.');
      }
    }

    if (normalizedEmail) {
      const emailConflict = await this.prisma.staff.findFirst({
        where: {
          companyId,
          normalizedEmail,
          archivedAt: null,
          ...(excludeStaffId ? { id: { not: excludeStaffId } } : {}),
        },
      });

      if (emailConflict) {
        throw new ConflictException('A staff member with this email already exists.');
      }
    }
  }

  private async generateStaffCode(companyId: string): Promise<string> {
    const count = await this.prisma.staff.count({ where: { companyId } });
    return `STF-${String(count + 1).padStart(6, '0')}`;
  }

  private auditSnapshot(member: StaffWithCounts): Prisma.InputJsonValue {
    return {
      staffCode: member.staffCode,
      fullName: member.fullName,
      mobile: member.mobile,
      email: member.email,
      role: member.role,
      isActive: member.isActive,
    };
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
