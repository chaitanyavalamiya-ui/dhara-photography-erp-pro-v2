import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingActivityService } from './booking-activity.service';
import { UpdateEventProgressDto } from './dto/booking-operations.dto';
import {
  EVENT_PROGRESS_STAGES,
  getEventProgressLabel,
} from './utils/booking-operations.utils';

@Injectable()
export class BookingProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: BookingActivityService,
  ) {}

  async getProgress(companyId: string, bookingId: string) {
    const booking = await this.assertBooking(companyId, bookingId);

    return {
      currentStage: booking.eventProgressStage,
      currentStageLabel: getEventProgressLabel(booking.eventProgressStage),
      stages: EVENT_PROGRESS_STAGES.map((stage) => ({
        stage,
        label: getEventProgressLabel(stage),
        completed:
          EVENT_PROGRESS_STAGES.indexOf(stage) <=
          EVENT_PROGRESS_STAGES.indexOf(
            booking.eventProgressStage as (typeof EVENT_PROGRESS_STAGES)[number],
          ),
      })),
    };
  }

  async updateProgress(
    companyId: string,
    userId: string,
    bookingId: string,
    dto: UpdateEventProgressDto,
  ) {
    const booking = await this.assertBooking(companyId, bookingId);
    const previousStage = booking.eventProgressStage;

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        eventProgressStage: dto.stage,
        updatedById: userId,
      },
    });

    if (previousStage !== dto.stage) {
      await this.activityService.log(
        companyId,
        bookingId,
        'progress_updated',
        `Progress updated to ${getEventProgressLabel(dto.stage)}`,
        userId,
        { previousStage, newStage: dto.stage },
      );
    }

    return {
      currentStage: updated.eventProgressStage,
      currentStageLabel: getEventProgressLabel(updated.eventProgressStage),
      stages: EVENT_PROGRESS_STAGES.map((stage) => ({
        stage,
        label: getEventProgressLabel(stage),
        completed:
          EVENT_PROGRESS_STAGES.indexOf(stage) <=
          EVENT_PROGRESS_STAGES.indexOf(
            updated.eventProgressStage as (typeof EVENT_PROGRESS_STAGES)[number],
          ),
      })),
    };
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
}
