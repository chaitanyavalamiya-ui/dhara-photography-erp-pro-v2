import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingStaffService } from './booking-staff.service';
import { BookingStaffExpenseService } from './booking-staff-expense.service';
import { BookingActivityService } from './booking-activity.service';
import { BookingStaffPaymentService } from './booking-staff-payment.service';
import { BookingEquipmentService } from './booking-equipment.service';
import { BookingProgressService } from './booking-progress.service';
import { BookingReminderService } from './booking-reminder.service';

@Module({
  controllers: [BookingsController],
  providers: [
    BookingsService,
    BookingStaffService,
    BookingStaffExpenseService,
    BookingActivityService,
    BookingStaffPaymentService,
    BookingEquipmentService,
    BookingProgressService,
    BookingReminderService,
  ],
})
export class BookingsModule {}
