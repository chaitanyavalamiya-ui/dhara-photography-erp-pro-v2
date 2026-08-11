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

export class ReportsDashboardDto {
  @ApiProperty({ type: ReportDateRangeDto })
  period!: ReportDateRangeDto;

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
  unpaidInvoicesCount!: number;

  @ApiProperty()
  averageBookingValue!: number;
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

  @ApiPropertyOptional()
  bookingNumber?: string | null;

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

  @ApiPropertyOptional()
  staffName?: string | null;
}

export class ProfitReportDto {
  @ApiProperty({ type: ReportDateRangeDto })
  period!: ReportDateRangeDto;

  @ApiProperty()
  cashReceived!: number;

  @ApiProperty()
  totalExpenses!: number;

  @ApiProperty()
  netProfit!: number;

  @ApiProperty()
  profitMarginPercent!: number;

  @ApiProperty()
  invoiceRevenue!: number;
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

  @ApiProperty()
  outstanding!: number;

  @ApiProperty()
  staffPayments!: number;
}

export class StaffReportRowDto {
  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  staffName!: string;

  @ApiProperty()
  staffCode!: string;

  @ApiProperty()
  assignmentsCount!: number;

  @ApiProperty()
  totalPayments!: number;

  @ApiProperty()
  monthlyCost!: number;
}

export class ChartDataPointDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  value!: number;
}

export class MonthlyChartRowDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  income!: number;

  @ApiProperty()
  expenses!: number;

  @ApiProperty()
  profit!: number;
}

export class ReportsChartsDto {
  @ApiProperty({ type: ReportDateRangeDto })
  period!: ReportDateRangeDto;

  @ApiProperty({ type: [MonthlyChartRowDto] })
  monthlyIncomeExpense!: MonthlyChartRowDto[];

  @ApiProperty({ type: [ChartDataPointDto] })
  incomeByPaymentMethod!: ChartDataPointDto[];

  @ApiProperty({ type: [ChartDataPointDto] })
  expensesByCategory!: ChartDataPointDto[];

  @ApiProperty({ type: [ChartDataPointDto] })
  bookingRevenueByType!: ChartDataPointDto[];
}

export class PaginatedReportDto<T> {
  @ApiProperty({ type: ReportDateRangeDto })
  period!: ReportDateRangeDto;

  @ApiProperty()
  items!: T[];

  @ApiProperty()
  total!: number;
}
