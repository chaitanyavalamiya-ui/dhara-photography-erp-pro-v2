import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { roundMoney, toDecimal } from './utils/booking.utils';
import { parseOptionalDate } from '../clients/utils/client.utils';

const STAFF_EXPENSE_CATEGORY = 'staff';

export interface BookingStaffExpenseContext {
  id: string;
  companyId: string;
  branchId: string;
  clientId: string;
  bookingId: string;
  bookingNumber: string;
  staffId: string;
  staffName: string;
  role: string;
  roleLabel: string;
  agreedRate: Prisma.Decimal | number | null;
  expenseId?: string | null;
  assignmentDate?: Date | null;
}

@Injectable()
export class BookingStaffExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async syncAssignmentExpense(
    companyId: string,
    userId: string,
    context: BookingStaffExpenseContext,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string | null> {
    const amount = roundMoney(Number(context.agreedRate ?? 0));

    if (amount <= 0) {
      return this.archiveLinkedExpense(companyId, userId, context, ipAddress, userAgent);
    }

    const category = await this.resolveCategory(companyId);
    const expenseDate = context.assignmentDate ?? new Date();
    const description = `${context.roleLabel} payment: ${context.staffName} (${context.bookingNumber})`;
    const notes = `Linked to booking staff assignment ${context.id}`;

    if (context.expenseId) {
      const existing = await this.prisma.expense.findFirst({
        where: { id: context.expenseId, companyId },
      });

      if (existing) {
        if (existing.archivedAt) {
          const revived = await this.prisma.expense.update({
            where: { id: existing.id },
            data: {
              isActive: true,
              archivedAt: null,
              archivedById: null,
              archivedReason: null,
              amount: toDecimal(amount),
              vendorPerson: context.staffName,
              description,
              notes,
              bookingId: context.bookingId,
              clientId: context.clientId,
              staffId: context.staffId,
              branchId: context.branchId,
              categoryId: category.id,
              expenseDate,
              updatedById: userId,
            },
          });

          await this.logExpenseAudit(companyId, userId, 'update', revived.id, amount, ipAddress, userAgent);
          return revived.id;
        }

        const updated = await this.prisma.expense.update({
          where: { id: existing.id },
          data: {
            amount: toDecimal(amount),
            vendorPerson: context.staffName,
            description,
            notes,
            bookingId: context.bookingId,
            clientId: context.clientId,
            staffId: context.staffId,
            branchId: context.branchId,
            categoryId: category.id,
            expenseDate,
            updatedById: userId,
          },
        });

        await this.logExpenseAudit(companyId, userId, 'update', updated.id, amount, ipAddress, userAgent);
        return updated.id;
      }
    }

    const created = await this.prisma.expense.create({
      data: {
        companyId,
        branchId: context.branchId,
        categoryId: category.id,
        clientId: context.clientId,
        bookingId: context.bookingId,
        staffId: context.staffId,
        description,
        vendorPerson: context.staffName,
        amount: toDecimal(amount),
        expenseDate,
        notes,
        createdById: userId,
        updatedById: userId,
      },
    });

    await this.logExpenseAudit(companyId, userId, 'create', created.id, amount, ipAddress, userAgent);
    return created.id;
  }

  async archiveLinkedExpense(
    companyId: string,
    userId: string,
    context: BookingStaffExpenseContext,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string | null> {
    if (!context.expenseId) {
      return null;
    }

    const existing = await this.prisma.expense.findFirst({
      where: { id: context.expenseId, companyId, archivedAt: null },
    });

    if (!existing) {
      return null;
    }

    await this.prisma.expense.update({
      where: { id: existing.id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: userId,
        archivedReason: 'Staff assignment removed or rate cleared',
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'expenses',
      action: 'archive',
      recordType: 'expense',
      recordId: existing.id,
      previousValue: { amount: Number(existing.amount), source: 'booking_staff_sync' },
      ipAddress,
      userAgent,
    });

    return null;
  }

  private async resolveCategory(companyId: string) {
    const category = await this.prisma.masterData.findFirst({
      where: { companyId, category: 'expense_category', code: STAFF_EXPENSE_CATEGORY, isActive: true },
    });

    if (!category) {
      throw new BadRequestException('Staff expense category is not configured.');
    }

    return category;
  }

  private async logExpenseAudit(
    companyId: string,
    userId: string,
    action: 'create' | 'update',
    expenseId: string,
    amount: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'expenses',
      action,
      recordType: 'expense',
      recordId: expenseId,
      newValue: { amount, source: 'booking_staff_sync' },
      ipAddress,
      userAgent,
    });
  }
}
