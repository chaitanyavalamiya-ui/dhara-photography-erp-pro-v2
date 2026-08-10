import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StaffResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  staffCode!: string;

  @ApiProperty()
  fullName!: string;

  @ApiPropertyOptional()
  mobile?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  roleLabel!: string;

  @ApiPropertyOptional()
  joiningDate?: string | null;

  @ApiProperty()
  paymentType!: string;

  @ApiProperty()
  paymentTypeLabel!: string;

  @ApiProperty()
  defaultRate!: number;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  totalAssignments!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class StaffAssignmentSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty()
  eventType!: string;

  @ApiPropertyOptional()
  eventDate?: string | null;

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
}

export class StaffExpenseSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  expenseDate!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  bookingId?: string | null;

  @ApiPropertyOptional()
  bookingNumber?: string | null;
}

export class StaffDetailResponseDto extends StaffResponseDto {
  @ApiProperty({ type: [StaffAssignmentSummaryDto] })
  upcomingBookings!: StaffAssignmentSummaryDto[];

  @ApiProperty({ type: [StaffAssignmentSummaryDto] })
  recentCompletedBookings!: StaffAssignmentSummaryDto[];

  @ApiProperty({ type: [StaffExpenseSummaryDto] })
  recentExpenses!: StaffExpenseSummaryDto[];

  @ApiProperty()
  totalExpenseAmount!: number;
}

export class PaginatedStaffResponseDto {
  @ApiProperty({ type: [StaffResponseDto] })
  items!: StaffResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
