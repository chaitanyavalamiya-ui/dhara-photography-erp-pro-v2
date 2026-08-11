import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { DELIVERABLE_TYPES, DELIVERY_STATUSES } from '../utils/delivery.utils';

export class ListDeliveriesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['all', ...DELIVERY_STATUSES], default: 'all' })
  @IsOptional()
  @IsIn(['all', ...DELIVERY_STATUSES])
  status?: string = 'all';

  @ApiPropertyOptional({ enum: ['all', ...DELIVERABLE_TYPES], default: 'all' })
  @IsOptional()
  @IsIn(['all', ...DELIVERABLE_TYPES])
  deliverableType?: string = 'all';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    enum: ['createdAt', 'expectedDate', 'deliveredDate', 'title', 'status'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'expectedDate', 'deliveredDate', 'title', 'status'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
