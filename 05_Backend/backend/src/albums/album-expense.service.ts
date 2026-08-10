import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { roundMoney, toDecimal } from '../bookings/utils/booking.utils';

const ALBUM_PRINTING_CATEGORY = 'album_printing';

export interface AlbumExpenseContext {
  id: string;
  companyId: string;
  branchId: string;
  clientId: string;
  bookingId: string;
  name: string;
  vendorName?: string | null;
  vendorExpense: Prisma.Decimal | number;
  vendorExpenseId?: string | null;
  orderDate?: Date | null;
}

@Injectable()
export class AlbumExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async syncVendorExpense(
    companyId: string,
    userId: string,
    album: AlbumExpenseContext,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string | null> {
    const amount = roundMoney(Number(album.vendorExpense));

    if (amount <= 0) {
      return this.archiveLinkedExpense(companyId, userId, album, ipAddress, userAgent);
    }

    const category = await this.resolveCategory(companyId);
    const expenseDate = album.orderDate ?? new Date();
    const description = `Album printing: ${album.name}`;
    const notes = `Linked to album ${album.id}`;

    if (album.vendorExpenseId) {
      const existing = await this.prisma.expense.findFirst({
        where: { id: album.vendorExpenseId, companyId },
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
              vendorPerson: album.vendorName?.trim() || null,
              description,
              notes,
              bookingId: album.bookingId,
              clientId: album.clientId,
              branchId: album.branchId,
              categoryId: category.id,
              expenseDate,
              updatedById: userId,
            },
          });

          await this.auditService.log({
            companyId,
            actorUserId: userId,
            module: 'expenses',
            action: 'update',
            recordType: 'expense',
            recordId: revived.id,
            newValue: { amount, source: 'album_sync' },
            ipAddress,
            userAgent,
          });

          return revived.id;
        }

        const updated = await this.prisma.expense.update({
          where: { id: existing.id },
          data: {
            amount: toDecimal(amount),
            vendorPerson: album.vendorName?.trim() || null,
            description,
            notes,
            bookingId: album.bookingId,
            clientId: album.clientId,
            branchId: album.branchId,
            categoryId: category.id,
            expenseDate,
            updatedById: userId,
          },
        });

        await this.auditService.log({
          companyId,
          actorUserId: userId,
          module: 'expenses',
          action: 'update',
          recordType: 'expense',
          recordId: updated.id,
          newValue: { amount, source: 'album_sync' },
          ipAddress,
          userAgent,
        });

        return updated.id;
      }
    }

    const created = await this.prisma.expense.create({
      data: {
        companyId,
        branchId: album.branchId,
        categoryId: category.id,
        clientId: album.clientId,
        bookingId: album.bookingId,
        description,
        vendorPerson: album.vendorName?.trim() || null,
        amount: toDecimal(amount),
        expenseDate,
        notes,
        createdById: userId,
        updatedById: userId,
      },
    });

    await this.prisma.album.update({
      where: { id: album.id },
      data: { vendorExpenseId: created.id, updatedById: userId },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'expenses',
      action: 'create',
      recordType: 'expense',
      recordId: created.id,
      newValue: { amount, source: 'album_sync', albumId: album.id },
      ipAddress,
      userAgent,
    });

    return created.id;
  }

  async archiveLinkedExpense(
    companyId: string,
    userId: string,
    album: AlbumExpenseContext,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<null> {
    if (!album.vendorExpenseId) {
      return null;
    }

    const existing = await this.prisma.expense.findFirst({
      where: { id: album.vendorExpenseId, companyId, archivedAt: null },
    });

    if (existing) {
      await this.prisma.expense.update({
        where: { id: existing.id },
        data: {
          isActive: false,
          archivedAt: new Date(),
          archivedById: userId,
          archivedReason: 'Album vendor expense cleared or album archived',
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
        previousValue: { amount: Number(existing.amount) },
        ipAddress,
        userAgent,
      });
    }

    await this.prisma.album.update({
      where: { id: album.id },
      data: { vendorExpenseId: null, updatedById: userId },
    });

    return null;
  }

  private async resolveCategory(companyId: string) {
    const category = await this.prisma.masterData.findFirst({
      where: {
        companyId,
        category: 'expense_category',
        code: ALBUM_PRINTING_CATEGORY,
        isActive: true,
      },
    });

    if (!category) {
      throw new BadRequestException('Album printing expense category is not configured.');
    }

    return category;
  }
}
