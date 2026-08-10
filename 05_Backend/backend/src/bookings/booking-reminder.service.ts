import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReminderDto, UpdateReminderDto } from './dto/booking-operations.dto';
import { parseOptionalDate, toDateOnlyString } from '../clients/utils/client.utils';

@Injectable()
export class BookingReminderService {
  constructor(private readonly prisma: PrismaService) {}

  async listForBooking(companyId: string, bookingId: string) {
    await this.assertBooking(companyId, bookingId);

    const reminders = await this.prisma.reminder.findMany({
      where: { companyId, bookingId, archivedAt: null },
      orderBy: [{ reminderDate: 'asc' }],
    });

    return reminders.map((reminder) => this.mapReminder(reminder));
  }

  async create(companyId: string, userId: string, bookingId: string, dto: CreateReminderDto) {
    const booking = await this.assertBooking(companyId, bookingId);

    const reminder = await this.prisma.reminder.create({
      data: {
        companyId,
        clientId: booking.clientId,
        bookingId,
        reminderType: dto.reminderType,
        reminderDate: parseOptionalDate(dto.reminderDate) ?? new Date(),
        note: dto.note?.trim() || null,
        createdById: userId,
        updatedById: userId,
      },
    });

    return this.mapReminder(reminder);
  }

  async update(
    companyId: string,
    userId: string,
    bookingId: string,
    reminderId: string,
    dto: UpdateReminderDto,
  ) {
    await this.assertBooking(companyId, bookingId);

    const existing = await this.prisma.reminder.findFirst({
      where: { id: reminderId, bookingId, companyId, archivedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Reminder not found.');
    }

    const reminder = await this.prisma.reminder.update({
      where: { id: reminderId },
      data: {
        ...(dto.reminderType !== undefined ? { reminderType: dto.reminderType } : {}),
        ...(dto.reminderDate !== undefined
          ? (() => {
              const parsed = parseOptionalDate(dto.reminderDate);
              return parsed ? { reminderDate: parsed } : {};
            })()
          : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
        ...(dto.status !== undefined
          ? {
              status: dto.status,
              completedAt: dto.status === 'completed' ? new Date() : null,
            }
          : {}),
        updatedById: userId,
      },
    });

    return this.mapReminder(reminder);
  }

  async remove(companyId: string, userId: string, bookingId: string, reminderId: string) {
    await this.assertBooking(companyId, bookingId);

    const existing = await this.prisma.reminder.findFirst({
      where: { id: reminderId, bookingId, companyId, archivedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Reminder not found.');
    }

    await this.prisma.reminder.update({
      where: { id: reminderId },
      data: {
        isActive: false,
        archivedAt: new Date(),
        updatedById: userId,
      },
    });

    return { message: 'Reminder removed successfully.' };
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

  private mapReminder(reminder: {
    id: string;
    clientId: string | null;
    bookingId: string | null;
    reminderType: string;
    reminderDate: Date;
    note: string | null;
    status: string;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: reminder.id,
      clientId: reminder.clientId,
      bookingId: reminder.bookingId,
      reminderType: reminder.reminderType,
      reminderDate: toDateOnlyString(reminder.reminderDate),
      note: reminder.note,
      status: reminder.status,
      completedAt: reminder.completedAt?.toISOString() ?? null,
      createdAt: reminder.createdAt.toISOString(),
      updatedAt: reminder.updatedAt.toISOString(),
    };
  }
}
