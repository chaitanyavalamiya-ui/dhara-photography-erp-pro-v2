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

  @ApiProperty({ description: 'Sum of active album selling prices (not added to invoice revenue)' })
  totalAlbumOrderValue!: number;

  @ApiProperty({ description: 'Sum of active album vendor expenses (also included in totalExpenses when synced)' })
  totalAlbumVendorExpense!: number;

  @ApiProperty({ description: 'Album order value minus vendor expense (informational)' })
  totalAlbumProfit!: number;

  @ApiProperty({ description: 'All-time staff-linked expense payments' })
  totalStaffPayments!: number;

  @ApiProperty({ description: 'Staff payments in current month' })
  thisMonthStaffPayments!: number;
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

export class AccountsPeriodDto {
  @ApiProperty()
  preset!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  dateFrom!: string;

  @ApiProperty()
  dateTo!: string;
}

export class AccountsPeriodSummaryDto {
  @ApiProperty({ type: AccountsPeriodDto })
  period!: AccountsPeriodDto;

  @ApiProperty()
  totalInvoiceValue!: number;

  @ApiProperty()
  amountReceived!: number;

  @ApiProperty()
  outstandingAmount!: number;

  @ApiProperty()
  totalExpenses!: number;

  @ApiProperty()
  staffPayments!: number;

  @ApiProperty()
  netProfit!: number;

  @ApiProperty({ description: 'Album order value in period (informational, not invoice revenue)' })
  albumOrderValue!: number;

  @ApiProperty({ description: 'Album vendor expense in period (subset of totalExpenses when synced)' })
  albumVendorExpense!: number;

  @ApiProperty()
  albumProfit!: number;

  @ApiProperty()
  bookingsCount!: number;
}

export class IncomeRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  receiptNumber!: string | null;

  @ApiProperty()
  paymentDate!: string;

  @ApiProperty()
  clientName!: string;

  @ApiPropertyOptional()
  invoiceNumber?: string | null;

  @ApiPropertyOptional()
  bookingNumber?: string | null;

  @ApiProperty()
  paymentMethod!: string;

  @ApiProperty()
  amount!: number;
}

export class PaginatedIncomeDto {
  @ApiProperty({ type: AccountsPeriodDto })
  period!: AccountsPeriodDto;

  @ApiProperty({ type: [IncomeRowDto] })
  items!: IncomeRowDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  totalAmount!: number;
}

export class ExpenseCategoryBreakdownDto {
  @ApiProperty()
  categoryCode!: string;

  @ApiProperty()
  categoryLabel!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  isStaffCategory!: boolean;
}

export class AccountsExpenseBreakdownDto {
  @ApiProperty({ type: AccountsPeriodDto })
  period!: AccountsPeriodDto;

  @ApiProperty()
  totalExpenses!: number;

  @ApiProperty()
  staffPayments!: number;

  @ApiProperty({ type: [ExpenseCategoryBreakdownDto] })
  categories!: ExpenseCategoryBreakdownDto[];
}

export class StaffPaymentRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  expenseDate!: string;

  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  staffName!: string;

  @ApiProperty()
  staffCode!: string;

  @ApiPropertyOptional()
  bookingId?: string | null;

  @ApiPropertyOptional()
  bookingNumber?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  source!: 'staff_assignment' | 'manual';
}

export class PaginatedStaffPaymentsDto {
  @ApiProperty({ type: AccountsPeriodDto })
  period!: AccountsPeriodDto;

  @ApiProperty({ type: [StaffPaymentRowDto] })
  items!: StaffPaymentRowDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  totalAmount!: number;
}

export class ProfitLossDto {
  @ApiProperty({ type: AccountsPeriodDto })
  period!: AccountsPeriodDto;

  @ApiProperty({ description: 'Invoice value in period (accrual reference)' })
  invoiceRevenue!: number;

  @ApiProperty({ description: 'Cash received in period (income basis for profit)' })
  cashReceived!: number;

  @ApiProperty()
  totalExpenses!: number;

  @ApiProperty()
  staffPayments!: number;

  @ApiProperty({ description: 'cashReceived - totalExpenses' })
  netProfit!: number;

  @ApiProperty()
  profitMarginPercent!: number;

  @ApiProperty({ description: 'Album sales in period (informational)' })
  albumOrderValue!: number;

  @ApiProperty()
  albumVendorExpense!: number;
}

export class MonthlyFinancialRowDto {
  @ApiProperty()
  year!: number;

  @ApiProperty()
  month!: number;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  invoiceRevenue!: number;

  @ApiProperty()
  cashReceived!: number;

  @ApiProperty()
  expenses!: number;

  @ApiProperty()
  staffPayments!: number;

  @ApiProperty()
  profit!: number;

  @ApiProperty()
  bookingsCount!: number;
}

export class PaginatedAccountTransactionsDto {
  @ApiProperty({ type: AccountsPeriodDto })
  period!: AccountsPeriodDto;

  @ApiProperty({ type: [AccountTransactionDto] })
  items!: AccountTransactionDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  totalIncome!: number;

  @ApiProperty()
  totalExpense!: number;
}
