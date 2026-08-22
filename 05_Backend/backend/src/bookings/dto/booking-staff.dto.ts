import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
  MaxLength,
  Min,
  IsDateString,
} from 'class-validator';
import { STAFF_ROLES } from '../../staff/utils/staff.utils';

export class CreateBookingStaffDto {
  @ApiProperty()
  @IsUUID()
  staffId!: string;

  @ApiProperty({ enum: STAFF_ROLES })
  @IsString()
  @IsIn([...STAFF_ROLES])
  role!: string;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  assignmentDate?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  agreedRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Deprecated. Assignment stores payable/cost only; cash expense is created when a staff payment is marked paid.',
  })
  @IsOptional()
  syncExpense?: boolean;
}

export class UpdateBookingStaffDto {
  @ApiPropertyOptional({ enum: STAFF_ROLES })
  @IsOptional()
  @IsString()
  @IsIn([...STAFF_ROLES])
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  assignmentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  agreedRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({
    description:
      'Deprecated. Assignment stores payable/cost only; cash expense is created when a staff payment is marked paid.',
  })
  @IsOptional()
  syncExpense?: boolean;
}

export class BookingStaffMemberDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  staffCode!: string;

  @ApiProperty()
  staffName!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  roleLabel!: string;

  @ApiPropertyOptional()
  assignmentDate?: string | null;

  @ApiPropertyOptional()
  agreedRate?: number | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  expenseId?: string | null;
}

export class AssignBookingStaffDto {
  @ApiProperty({ type: [CreateBookingStaffDto] })
  @IsNotEmpty()
  assignments!: CreateBookingStaffDto[];
}
