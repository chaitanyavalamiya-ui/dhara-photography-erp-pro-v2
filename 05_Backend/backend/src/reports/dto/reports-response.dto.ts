import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportDateRangeDto {
  @ApiProperty()
  preset!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  dateFrom!: string;

  @ApiProperty()
  dateTo!: string;
}

export class ReportsOverviewDto {
  @ApiProperty({ type: ReportDateRangeDto })
  period!: ReportDateRangeDto;

  @ApiProperty()
  totalBookingValue!: number;

  @ApiProperty()
  totalInvoiceValue!: number;

  @ApiProperty()
  amountReceived!: number;

  @ApiProperty()
  outstandingAmount!: number;

  @ApiProperty()
  totalExpenses!: number;

  @ApiProperty()
  netProfit!: number;

  @ApiProperty()
  albumSales!: number;

  @ApiProperty()
  albumVendorExpenses!: number;

  @ApiProperty()
  albumProfit!: number;
}

export class BookingReportRowDto {
  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty()
  clientName!: string;

  @ApiPropertyOptional()
  eventDate?: string | null;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  received!: number;

  @ApiProperty()
  outstanding!: number;

  @ApiProperty()
  expenses!: number;

  @ApiProperty()
  profit!: number;
}

export class PaymentReportRowDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  receiptNumber?: string | null;

  @ApiProperty()
  paymentDate!: string;

  @ApiPropertyOptional()
  invoiceNumber?: string | null;

  @ApiProperty()
  clientName!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  paymentMethod!: string;
}

export class ExpenseReportRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  expenseNumber!: string;

  @ApiProperty()
  expenseDate!: string;

  @ApiProperty()
  category!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  amount!: number;

  @ApiPropertyOptional()
  bookingNumber?: string | null;

  @ApiPropertyOptional()
  albumName?: string | null;
}

export class ProfitReportDto {
  @ApiProperty({ type: ReportDateRangeDto })
  period!: ReportDateRangeDto;

  @ApiProperty()
  revenue!: number;

  @ApiProperty()
  received!: number;

  @ApiProperty()
  expenses!: number;

  @ApiProperty()
  profit!: number;

  @ApiProperty()
  profitPercent!: number;
}

export class MonthlySummaryRowDto {
  @ApiProperty()
  year!: number;

  @ApiProperty()
  month!: number;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  revenue!: number;

  @ApiProperty()
  received!: number;

  @ApiProperty()
  expenses!: number;

  @ApiProperty()
  profit!: number;

  @ApiProperty()
  bookingsCount!: number;
}

export class PaginatedReportDto<T> {
  @ApiProperty({ type: ReportDateRangeDto })
  period!: ReportDateRangeDto;

  @ApiProperty()
  items!: T[];

  @ApiProperty()
  total!: number;
}
