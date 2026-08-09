import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClientResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clientNumber!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  mobile!: string;

  @ApiPropertyOptional()
  whatsapp?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  dateOfBirth?: string | null;

  @ApiPropertyOptional()
  anniversaryDate?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  totalBookings!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  outstandingBalance!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PaginatedClientsResponseDto {
  @ApiProperty({ type: [ClientResponseDto] })
  items!: ClientResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class UpcomingClientEventDto {
  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty()
  mobile!: string;

  @ApiProperty({ enum: ['birthday', 'anniversary'] })
  eventType!: 'birthday' | 'anniversary';

  @ApiProperty()
  eventDate!: string;

  @ApiProperty()
  daysUntil!: number;
}
