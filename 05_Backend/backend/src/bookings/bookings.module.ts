import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingStaffService } from './booking-staff.service';
import { BookingStaffExpenseService } from './booking-staff-expense.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, BookingStaffService, BookingStaffExpenseService],
})
export class BookingsModule {}
