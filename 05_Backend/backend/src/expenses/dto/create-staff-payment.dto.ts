import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export const STAFF_PAYMENT_MODE_CODES = ['cash', 'upi', 'bank_transfer', 'other'] as const;

export class CreateStaffPaymentDto {
  @ApiProperty()
  @IsUUID()
  staffId!: string;

  @ApiProperty({ example: 2500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: '2026-08-18' })
  @IsString()
  @IsNotEmpty()
  paymentDate!: string;

  @ApiProperty({ enum: STAFF_PAYMENT_MODE_CODES, example: 'upi' })
  @IsString()
  @IsIn([...STAFF_PAYMENT_MODE_CODES])
  paymentModeCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
