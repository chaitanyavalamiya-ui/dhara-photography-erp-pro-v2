import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListClientsQueryDto {
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

  @ApiPropertyOptional({ description: 'Search by name, mobile, email, or city' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'all'], default: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all' = 'active';

  @ApiPropertyOptional({
    enum: [
      'fullName',
      'mobile',
      'email',
      'city',
      'createdAt',
      'totalBookings',
      'totalAmount',
      'outstandingBalance',
    ],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn([
    'fullName',
    'mobile',
    'email',
    'city',
    'createdAt',
    'totalBookings',
    'totalAmount',
    'outstandingBalance',
  ])
  sortBy?:
    | 'fullName'
    | 'mobile'
    | 'email'
    | 'city'
    | 'createdAt'
    | 'totalBookings'
    | 'totalAmount'
    | 'outstandingBalance' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
