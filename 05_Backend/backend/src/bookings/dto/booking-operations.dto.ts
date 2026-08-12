import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  EQUIPMENT_STATUSES,
  EVENT_PROGRESS_STAGES,
  REMINDER_STATUSES,
  REMINDER_TYPES,
  STAFF_PAYMENT_STATUSES,
} from '../utils/booking-operations.utils';

export class CreateStaffPaymentDto {
  @ApiProperty({ example: 5000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ enum: STAFF_PAYMENT_STATUSES, default: 'pending' })
  @IsOptional()
  @IsIn([...STAFF_PAYMENT_STATUSES])
  status?: string;

  @ApiPropertyOptional({ example: '2026-12-15' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ example: 'cash' })
  @IsOptional()
  @IsString()
  paymentMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateStaffPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ enum: STAFF_PAYMENT_STATUSES })
  @IsOptional()
  @IsIn([...STAFF_PAYMENT_STATUSES])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateBookingEquipmentDto {
  @ApiProperty({ example: 'Camera Body' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  equipmentName!: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityIssued?: number;
}

export class CheckoutEquipmentDto {
  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantityIssued!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuedByName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  conditionCheckout?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  checkoutNotes?: string;
}

export class ReturnEquipmentDto {
  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityReturned!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  conditionReturn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  missingQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  damagedQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  repairQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  returnNotes?: string;
}

export class UpdateEventProgressDto {
  @ApiProperty({ enum: EVENT_PROGRESS_STAGES })
  @IsIn([...EVENT_PROGRESS_STAGES])
  stage!: string;
}

export class CreateReminderDto {
  @ApiProperty({ enum: REMINDER_TYPES })
  @IsIn([...REMINDER_TYPES])
  reminderType!: string;

  @ApiProperty({ example: '2026-12-15' })
  @IsDateString()
  reminderDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class UpdateReminderDto {
  @ApiPropertyOptional({ enum: REMINDER_TYPES })
  @IsOptional()
  @IsIn([...REMINDER_TYPES])
  reminderType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reminderDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ enum: REMINDER_STATUSES })
  @IsOptional()
  @IsIn([...REMINDER_STATUSES])
  status?: string;
}
