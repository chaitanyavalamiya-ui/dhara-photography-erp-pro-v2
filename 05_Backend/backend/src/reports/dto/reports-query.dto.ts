import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ReportDatePreset } from '../../common/utils/financial.utils';

const DATE_PRESETS = [
  'today',
  'this_week',
  'this_month',
  'last_month',
  'this_year',
  'custom',
] as const;

export class ReportsDateQueryDto {
  @ApiPropertyOptional({
    enum: DATE_PRESETS,
    default: 'this_month',
  })
  @IsOptional()
  @IsIn(DATE_PRESETS)
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

export class ReportsIncomeQueryDto extends ReportsDateQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

export class ReportsExpensesQueryDto extends ReportsDateQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class ReportsTransactionsQueryDto extends ReportsDateQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['all', 'income', 'expense'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'income', 'expense'])
  type?: 'all' | 'income' | 'expense' = 'all';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

export class MonthlySummaryQueryDto {
  @ApiPropertyOptional({ default: 12, description: 'Number of months to include (rolling)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number;

  @ApiPropertyOptional({ description: 'Calendar year for 12-month report (e.g. 2026)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}
