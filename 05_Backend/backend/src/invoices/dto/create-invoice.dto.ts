import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { InvoiceDeliverablesDto } from './invoice-deliverables.dto';

export class CreateInvoiceDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  bookingId!: string;

  @ApiPropertyOptional({ example: '2026-09-09' })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: InvoiceDeliverablesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceDeliverablesDto)
  deliverables?: InvoiceDeliverablesDto;
}
