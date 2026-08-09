import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExpenseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  categoryCode!: string;

  @ApiProperty()
  categoryLabel!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  expenseDate!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  vendorPerson?: string | null;

  @ApiPropertyOptional()
  paymentModeCode?: string | null;

  @ApiPropertyOptional()
  paymentModeLabel?: string | null;

  @ApiPropertyOptional()
  referenceNumber?: string | null;

  @ApiPropertyOptional()
  clientId?: string | null;

  @ApiPropertyOptional()
  clientName?: string | null;

  @ApiPropertyOptional()
  bookingId?: string | null;

  @ApiPropertyOptional()
  bookingNumber?: string | null;

  @ApiPropertyOptional()
  invoiceId?: string | null;

  @ApiPropertyOptional()
  invoiceNumber?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class PaginatedExpensesResponseDto {
  @ApiProperty({ type: [ExpenseResponseDto] })
  items!: ExpenseResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
