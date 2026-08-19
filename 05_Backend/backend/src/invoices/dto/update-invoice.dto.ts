import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { InvoiceDeliverablesDto } from './invoice-deliverables.dto';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ example: '2026-09-09' })
  @IsOptional()
  @IsString()
  dueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ type: InvoiceDeliverablesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceDeliverablesDto)
  deliverables?: InvoiceDeliverablesDto;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  advanceAmount?: number;
}
