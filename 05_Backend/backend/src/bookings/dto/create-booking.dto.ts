import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
  IsDateString,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { BOOKING_EVENT_TYPES } from '../utils/booking.utils';

export class CreateBookingItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceRateId?: string;

  @ApiProperty({ example: 'Photography' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  serviceName!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty({ example: 'day', enum: ['day', 'piece'] })
  @IsIn(['day', 'piece'])
  unit!: string;

  @ApiProperty({ example: 5000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate!: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  days!: number;

  @ApiPropertyOptional({ example: 10000, description: 'Computed line total; recalculated server-side' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  clientId!: string;

  @ApiProperty({ enum: BOOKING_EVENT_TYPES })
  @IsIn([...BOOKING_EVENT_TYPES])
  eventType!: string;

  @ApiProperty({ example: '2026-12-15' })
  @IsDateString()
  eventDate!: string;

  @ApiPropertyOptional({ example: '2026-12-17' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsDateString()
  eventEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  venue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ enum: ['enquiry', 'confirmed', 'completed', 'cancelled'], default: 'enquiry' })
  @IsOptional()
  @IsIn(['enquiry', 'confirmed', 'completed', 'cancelled'])
  statusCode?: string;

  @ApiProperty({ type: [CreateBookingItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBookingItemDto)
  items!: CreateBookingItemDto[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  advanceAmount?: number;
}
