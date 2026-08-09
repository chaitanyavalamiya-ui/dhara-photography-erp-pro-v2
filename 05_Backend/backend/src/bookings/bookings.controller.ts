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

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

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
