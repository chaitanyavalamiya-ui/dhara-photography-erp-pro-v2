import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { BookingsService } from './bookings.service';
import { BookingStaffService } from './booking-staff.service';
import { BookingActivityService } from './booking-activity.service';
import { BookingStaffPaymentService } from './booking-staff-payment.service';
import { BookingEquipmentService } from './booking-equipment.service';
import { BookingProgressService } from './booking-progress.service';
import { BookingReminderService } from './booking-reminder.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import {
  CalendarBookingsQueryDto,
  ListBookingsQueryDto,
} from './dto/list-bookings-query.dto';
import {
  BookingResponseDto,
  CalendarBookingEventDto,
  PaginatedBookingsResponseDto,
  ServiceRateResponseDto,
} from './dto/booking-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  BookingStaffMemberDto,
  CreateBookingStaffDto,
  UpdateBookingStaffDto,
} from './dto/booking-staff.dto';
import {
  CheckoutEquipmentDto,
  CreateBookingEquipmentDto,
  CreateReminderDto,
  CreateStaffPaymentDto,
  ReturnEquipmentDto,
  UpdateEventProgressDto,
  UpdateReminderDto,
  UpdateStaffPaymentDto,
} from './dto/booking-operations.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly bookingStaffService: BookingStaffService,
    private readonly activityService: BookingActivityService,
    private readonly staffPaymentService: BookingStaffPaymentService,
    private readonly equipmentService: BookingEquipmentService,
    private readonly progressService: BookingProgressService,
    private readonly reminderService: BookingReminderService,
  ) {}

  @Get()
  @RequirePermissions('bookings.read')
  @ApiOperation({ summary: 'List bookings with search, filter, and sort' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListBookingsQueryDto,
  ): Promise<PaginatedBookingsResponseDto> {
    return this.bookingsService.findAll(user.companyId, query);
  }

  @Get('calendar')
  @RequirePermissions('bookings.read')
  @ApiOperation({ summary: 'Calendar-ready booking events' })
  async getCalendar(
    @CurrentUser() user: JwtPayload,
    @Query() query: CalendarBookingsQueryDto,
  ): Promise<CalendarBookingEventDto[]> {
    return this.bookingsService.getCalendar(user.companyId, query);
  }

  @Get('service-rates')
  @RequirePermissions('bookings.read')
  @ApiOperation({ summary: 'List studio service rates' })
  async getServiceRates(
    @CurrentUser() user: JwtPayload,
  ): Promise<ServiceRateResponseDto[]> {
    return this.bookingsService.getServiceRates(user.companyId);
  }

  @Get(':id/staff')
  @RequirePermissions('bookings.read')
  @ApiOperation({ summary: 'List staff assigned to a booking' })
  async listStaff(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<BookingStaffMemberDto[]> {
    return this.bookingStaffService.listForBooking(user.companyId, id);
  }

  @Post(':id/staff')
  @RequirePermissions('staff.assign')
  @ApiOperation({ summary: 'Assign staff to a booking' })
  async assignStaff(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateBookingStaffDto,
    @Req() req: Request,
  ): Promise<BookingStaffMemberDto> {
    return this.bookingStaffService.assign(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id/staff/:assignmentId')
  @RequirePermissions('staff.assign')
  @ApiOperation({ summary: 'Update a booking staff assignment' })
  async updateStaffAssignment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateBookingStaffDto,
    @Req() req: Request,
  ): Promise<BookingStaffMemberDto> {
    return this.bookingStaffService.updateAssignment(
      user.companyId,
      user.sub,
      id,
      assignmentId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id/staff/:assignmentId')
  @RequirePermissions('staff.assign')
  @ApiOperation({ summary: 'Remove staff from a booking' })
  async removeStaffAssignment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.bookingStaffService.removeAssignment(
      user.companyId,
      user.sub,
      id,
      assignmentId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get(':id/staff-payments')
  @RequirePermissions('bookings.read')
  @ApiOperation({ summary: 'List all staff payments for a booking' })
  async listStaffPayments(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.staffPaymentService.listForBooking(user.companyId, id);
  }

  @Get(':id/staff/:assignmentId/payments')
  @RequirePermissions('bookings.read')
  @ApiOperation({ summary: 'List staff payments for an assignment' })
  async listAssignmentPayments(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.staffPaymentService.listForAssignment(user.companyId, id, assignmentId);
  }

  @Post(':id/staff/:assignmentId/payments')
  @RequirePermissions('bookings.update')
  @ApiOperation({ summary: 'Record staff payment for an assignment' })
  async createStaffPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: CreateStaffPaymentDto,
    @Req() req: Request,
  ) {
    return this.staffPaymentService.create(
      user.companyId,
      user.sub,
      id,
      assignmentId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id/staff/:assignmentId/payments/:paymentId')
  @RequirePermissions('bookings.update')
  @ApiOperation({ summary: 'Update staff payment' })
  async updateStaffPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdateStaffPaymentDto,
    @Req() req: Request,
  ) {
    return this.staffPaymentService.update(
      user.companyId,
      user.sub,
      id,
      assignmentId,
      paymentId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id/staff/:assignmentId/payments/:paymentId')
  @RequirePermissions('bookings.update')
  @ApiOperation({ summary: 'Remove staff payment' })
  async removeStaffPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.staffPaymentService.remove(user.companyId, user.sub, id, assignmentId, paymentId);
  }

  @Get(':id/equipment')
  @RequirePermissions('bookings.read')
  @ApiOperation({ summary: 'List equipment for a booking' })
  async listEquipment(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.equipmentService.listForBooking(user.companyId, id);
  }

  @Post(':id/equipment')
  @RequirePermissions('bookings.update')
  @ApiOperation({ summary: 'Add equipment item to booking' })
  async createEquipment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateBookingEquipmentDto,
  ) {
    return this.equipmentService.create(user.companyId, user.sub, id, dto);
  }

  @Patch(':id/equipment/:equipmentId/checkout')
  @RequirePermissions('bookings.update')
  @ApiOperation({ summary: 'Checkout equipment for event' })
  async checkoutEquipment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('equipmentId') equipmentId: string,
    @Body() dto: CheckoutEquipmentDto,
  ) {
    return this.equipmentService.checkout(user.companyId, user.sub, id, equipmentId, dto);
  }

  @Patch(':id/equipment/:equipmentId/return')
  @RequirePermissions('bookings.update')
  @ApiOperation({ summary: 'Return equipment after event' })
  async returnEquipment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('equipmentId') equipmentId: string,
    @Body() dto: ReturnEquipmentDto,
  ) {
    return this.equipmentService.returnEquipment(user.companyId, user.sub, id, equipmentId, dto);
  }

  @Delete(':id/equipment/:equipmentId')
  @RequirePermissions('bookings.update')
  @ApiOperation({ summary: 'Remove equipment item' })
  async removeEquipment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('equipmentId') equipmentId: string,
  ) {
    return this.equipmentService.remove(user.companyId, user.sub, id, equipmentId);
  }

  @Get(':id/progress')
  @RequirePermissions('bookings.read')
  @ApiOperation({ summary: 'Get event progress for booking' })
  async getProgress(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.progressService.getProgress(user.companyId, id);
  }

  @Patch(':id/progress')
  @RequirePermissions('bookings.update')
  @ApiOperation({ summary: 'Update event progress stage' })
  async updateProgress(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEventProgressDto,
  ) {
    return this.progressService.updateProgress(user.companyId, user.sub, id, dto);
  }

  @Get(':id/activities')
  @RequirePermissions('bookings.read')
  @ApiOperation({ summary: 'List booking activity history' })
  async listActivities(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const activities = await this.activityService.listForBooking(user.companyId, id);
    return activities.map((activity) => ({
      id: activity.id,
      activityType: activity.activityType,
      message: activity.message,
      metadata: activity.metadata,
      occurredAt: activity.occurredAt.toISOString(),
      createdById: activity.createdById,
    }));
  }

  @Get(':id/reminders')
  @RequirePermissions('bookings.read')
  @ApiOperation({ summary: 'List reminders for booking' })
  async listReminders(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.reminderService.listForBooking(user.companyId, id);
  }

  @Post(':id/reminders')
  @RequirePermissions('bookings.update')
  @ApiOperation({ summary: 'Create reminder for booking' })
  async createReminder(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateReminderDto,
  ) {
    return this.reminderService.create(user.companyId, user.sub, id, dto);
  }

  @Patch(':id/reminders/:reminderId')
  @RequirePermissions('bookings.update')
  @ApiOperation({ summary: 'Update reminder' })
  async updateReminder(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('reminderId') reminderId: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.reminderService.update(user.companyId, user.sub, id, reminderId, dto);
  }

  @Delete(':id/reminders/:reminderId')
  @RequirePermissions('bookings.update')
  @ApiOperation({ summary: 'Remove reminder' })
  async removeReminder(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('reminderId') reminderId: string,
  ) {
    return this.reminderService.remove(user.companyId, user.sub, id, reminderId);
  }

  @Get(':id')
  @RequirePermissions('bookings.read')
  @ApiOperation({ summary: 'Get booking details' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions('bookings.create')
  @ApiOperation({ summary: 'Create a new booking' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBookingDto,
    @Req() req: Request,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.create(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id')
  @RequirePermissions('bookings.update')
  @ApiOperation({ summary: 'Update an existing booking' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @Req() req: Request,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.update(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @RequirePermissions('bookings.archive')
  @ApiOperation({ summary: 'Archive (delete) a booking' })
  async archive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.bookingsService.archive(
      user.companyId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
