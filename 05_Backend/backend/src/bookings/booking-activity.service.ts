import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    companyId: string,
    bookingId: string,
    activityType: string,
    message: string,
    userId?: string,
    metadata?: Record<string, unknown>,
    occurredAt?: Date,
  ): Promise<void> {
    await this.prisma.bookingActivity.create({
      data: {
        companyId,
        bookingId,
        activityType,
        message,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
        occurredAt: occurredAt ?? new Date(),
        createdById: userId,
      },
    });
  }

  async listForBooking(companyId: string, bookingId: string) {
    return this.prisma.bookingActivity.findMany({
      where: { companyId, bookingId },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
