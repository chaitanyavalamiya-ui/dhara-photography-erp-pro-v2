import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ReportDatePreset } from '../../common/utils/financial.utils';

export class ReportsDateQueryDto {
  @ApiPropertyOptional({
    enum: ['today', 'this_week', 'this_month', 'last_month', 'custom'],
    default: 'this_month',
  })
  @IsOptional()
  @IsIn(['today', 'this_week', 'this_month', 'last_month', 'custom'])
  preset?: ReportDatePreset;

  @ApiPropertyOptional({ description: 'Required when preset is custom (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Required when preset is custom (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class MonthlySummaryQueryDto {
  @ApiPropertyOptional({ default: 12, description: 'Number of months to include' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number;
}
