import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { INVOICE_DELIVERABLE_OPTIONS } from '../utils/invoice-deliverables';

export class InvoiceDeliverablesDto {
  @ApiProperty({ type: [String], example: ['album', 'video'] })
  @IsArray()
  @IsString({ each: true })
  @IsIn([...INVOICE_DELIVERABLE_OPTIONS], { each: true })
  items!: string[];

  @ApiPropertyOptional({ enum: ['', 'pendrive', 'hard_disk'] })
  @IsOptional()
  @IsIn(['', 'pendrive', 'hard_disk'])
  videoMedia?: '' | 'pendrive' | 'hard_disk';
}
