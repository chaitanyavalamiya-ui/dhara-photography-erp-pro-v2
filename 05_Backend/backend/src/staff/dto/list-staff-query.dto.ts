import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { STAFF_ROLES } from '../utils/staff.utils';

export class ListStaffQueryDto {
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

  @ApiPropertyOptional({ description: 'Search by name, code, mobile, or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'all'], default: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all' = 'active';

  @ApiPropertyOptional({ enum: STAFF_ROLES })
  @IsOptional()
  @IsIn([...STAFF_ROLES])
  role?: string;

  @ApiPropertyOptional({
    enum: ['fullName', 'staffCode', 'role', 'mobile', 'joiningDate', 'createdAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['fullName', 'staffCode', 'role', 'mobile', 'joiningDate', 'createdAt'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
