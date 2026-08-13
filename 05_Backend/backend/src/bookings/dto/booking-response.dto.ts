import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStaffMemberDto } from './booking-staff.dto';

export class BookingItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  serviceRateId?: string | null;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unit!: string;

  @ApiProperty()
  rate!: number;

  @ApiProperty()
  days!: number;

  @ApiProperty()
  amount!: number;

  @ApiPropertyOptional()
  notes?: string | null;
}

export class BookingClientSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  mobile!: string;

  @ApiPropertyOptional()
  email?: string | null;
}

export class BookingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty({ type: BookingClientSummaryDto })
  client!: BookingClientSummaryDto;

  @ApiProperty()
  eventType!: string;

  @ApiPropertyOptional()
  eventDate?: string | null;

  @ApiPropertyOptional()
  eventEndDate?: string | null;

  @ApiPropertyOptional()
  venue?: string | null;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  statusCode!: string;

  @ApiProperty({ type: [BookingItemResponseDto] })
  items!: BookingItemResponseDto[];

  @ApiProperty()
  servicesSummary!: string;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  discount!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  advanceAmount!: number;

  @ApiProperty()
  balanceAmount!: number;

  @ApiProperty({ enum: ['Paid', 'Partial', 'Unpaid'] })
  paymentStatus!: 'Paid' | 'Partial' | 'Unpaid';

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ type: [BookingStaffMemberDto] })
  team?: BookingStaffMemberDto[];
}

export class PaginatedBookingsResponseDto {
  @ApiProperty({ type: [BookingResponseDto] })
  items!: BookingResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CalendarBookingEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty()
  eventType!: string;

  @ApiPropertyOptional()
  eventDate?: string | null;

  @ApiPropertyOptional()
  eventEndDate?: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  statusCode!: string;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  balanceAmount!: number;

  @ApiPropertyOptional()
  venue?: string | null;
}

export class ServiceRateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  defaultRate!: number;

  @ApiProperty()
  unit!: string;

  @ApiProperty()
  sortOrder!: number;
}
