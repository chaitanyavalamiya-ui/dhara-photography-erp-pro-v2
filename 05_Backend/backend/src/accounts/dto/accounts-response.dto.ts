import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class MonthlyReportQueryDto {
  @ApiPropertyOptional({ default: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

export class AccountsDashboardDto {
  @ApiProperty()
  totalRevenue!: number;

  @ApiProperty()
  amountReceived!: number;

  @ApiProperty()
  outstandingAmount!: number;

  @ApiProperty()
  totalExpenses!: number;

  @ApiProperty()
  netProfit!: number;

  @ApiProperty()
  thisMonthRevenue!: number;

  @ApiProperty()
  thisMonthExpenses!: number;

  @ApiProperty()
  thisMonthProfit!: number;
}

export class MonthlyReportDto {
  @ApiProperty()
  year!: number;

  @ApiProperty()
  month!: number;

  @ApiProperty()
  totalInvoiceValue!: number;

  @ApiProperty()
  totalPaymentsReceived!: number;

  @ApiProperty()
  totalOutstanding!: number;

  @ApiProperty()
  totalExpenses!: number;

  @ApiProperty()
  netProfit!: number;

  @ApiProperty()
  bookingsCount!: number;

  @ApiProperty()
  paidInvoicesCount!: number;

  @ApiProperty()
  partiallyPaidInvoicesCount!: number;

  @ApiProperty()
  unpaidInvoicesCount!: number;
}

export class AccountTransactionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  date!: string;

  @ApiProperty()
  type!: 'income' | 'expense';

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional()
  bookingNumber?: string | null;

  @ApiPropertyOptional()
  clientName?: string | null;

  @ApiProperty()
  income!: number;

  @ApiProperty()
  expense!: number;

  @ApiPropertyOptional()
  paymentMethod?: string | null;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  runningBalance!: number;
}

export class BookingProfitabilityDto {
  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty()
  totalBookingAmount!: number;

  @ApiProperty()
  totalReceived!: number;

  @ApiProperty()
  balance!: number;

  @ApiProperty()
  totalExpenses!: number;

  @ApiProperty()
  netProfit!: number;

  @ApiProperty()
  profitMarginPercent!: number;

  @ApiProperty()
  invoiceNumber?: string | null;
}
