import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { DELIVERABLE_TYPES, DELIVERY_STATUSES } from '../utils/delivery.utils';

export class CreateDeliveryDto {
  @ApiProperty()
  @IsUUID()
  bookingId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  albumId?: string;

  @ApiProperty({ enum: DELIVERABLE_TYPES })
  @IsString()
  @IsIn([...DELIVERABLE_TYPES])
  deliverableType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: DELIVERY_STATUSES, default: 'pending' })
  @IsOptional()
  @IsIn([...DELIVERY_STATUSES])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveredDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateDeliveryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  albumId?: string | null;

  @ApiPropertyOptional({ enum: DELIVERABLE_TYPES })
  @IsOptional()
  @IsIn([...DELIVERABLE_TYPES])
  deliverableType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: DELIVERY_STATUSES })
  @IsOptional()
  @IsIn([...DELIVERY_STATUSES])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveredDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
