import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiPropertyOptional({ nullable: true })
  albumId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  albumName!: string | null;

  @ApiProperty()
  deliverableType!: string;

  @ApiProperty()
  deliverableTypeLabel!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  statusLabel!: string;

  @ApiPropertyOptional({ nullable: true })
  expectedDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  deliveredDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PaginatedDeliveriesResponseDto {
  @ApiProperty({ type: [DeliveryResponseDto] })
  items!: DeliveryResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
