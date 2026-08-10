import { apiClient, ApiResponse } from './api-client';
import type {
  AccountTransaction,
  BookingProfitability,
  PaginatedAccountTransactions,
  PaginatedIncome,
} from './accounts-service';

export type ReportDatePreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface ReportDateRange {
  preset: string;
  label: string;
  dateFrom: string;
  dateTo: string;
}

export interface ReportsDashboard {
  period: ReportDateRange;
  totalInvoiceValue: number;
  totalPaymentsReceived: number;
  totalOutstanding: number;
  totalExpenses: number;
  netProfit: number;
  bookingsCount: number;
  paidInvoicesCount: number;
  unpaidInvoicesCount: number;
  averageBookingValue: number;
}

export interface ReportsOverview {
  period: ReportDateRange;
  totalBookingValue: number;
  totalInvoiceValue: number;
  amountReceived: number;
  outstandingAmount: number;
  totalExpenses: number;
  netProfit: number;
  albumSales: number;
  albumVendorExpenses: number;
  albumProfit: number;
}

export interface BookingReportRow {
  bookingId: string;
  bookingNumber: string;
  clientName: string;
  eventDate?: string | null;
  totalAmount: number;
  received: number;
  outstanding: number;
  expenses: number;
  profit: number;
}

export interface PaymentReportRow {
  id: string;
  receiptNumber?: string | null;
  paymentDate: string;
  invoiceNumber?: string | null;
  bookingNumber?: string | null;
  clientName: string;
  amount: number;
  paymentMethod: string;
}

export interface ExpenseReportRow {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  category: string;
  description?: string | null;
  amount: number;
  bookingNumber?: string | null;
  albumName?: string | null;
  staffName?: string | null;
}

export interface ProfitReport {
  period: ReportDateRange;
  cashReceived: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  invoiceRevenue: number;
}

export interface MonthlySummaryRow {
  year: number;
  month: number;
  label: string;
  revenue: number;
  received: number;
  expenses: number;
  profit: number;
  bookingsCount: number;
  outstanding: number;
}

export interface StaffReportRow {
  staffId: string;
  staffName: string;
  staffCode: string;
  assignmentsCount: number;
  totalPayments: number;
  monthlyCost: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface MonthlyChartRow {
  label: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface ReportsCharts {
  period: ReportDateRange;
  monthlyIncomeExpense: MonthlyChartRow[];
  incomeByPaymentMethod: ChartDataPoint[];
  expensesByCategory: ChartDataPoint[];
  bookingRevenueByType: ChartDataPoint[];
}

export interface ReportListResponse<T> {
  period: ReportDateRange;
  items: T[];
  total: number;
}

export interface PaymentReportResponse extends ReportListResponse<PaymentReportRow> {
  totalAmount: number;
}

export interface ExpenseReportResponse extends ReportListResponse<ExpenseReportRow> {
  totalAmount: number;
}

export interface ReportsQueryParams {
  preset?: ReportDatePreset;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportsSearchParams extends ReportsQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReportsTransactionsParams extends ReportsSearchParams {
  type?: 'all' | 'income' | 'expense';
}

export const REPORT_DATE_PRESETS: { value: ReportDatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
];

export const reportsService = {
  async getDashboard(params: ReportsQueryParams = {}): Promise<ReportsDashboard> {
    const { data } = await apiClient.get<ApiResponse<ReportsDashboard>>('/reports/dashboard', {
      params,
    });
    return data.data;
  },

  async getOverview(params: ReportsQueryParams = {}): Promise<ReportsOverview> {
    const { data } = await apiClient.get<ApiResponse<ReportsOverview>>('/reports/overview', {
      params,
    });
    return data.data;
  },

  async getIncome(params: ReportsSearchParams = {}): Promise<PaginatedIncome> {
    const { data } = await apiClient.get<ApiResponse<PaginatedIncome>>('/reports/income', {
      params,
    });
    return data.data;
  },

  async getBookingReport(
    params: ReportsQueryParams = {},
  ): Promise<ReportListResponse<BookingReportRow>> {
    const { data } = await apiClient.get<ApiResponse<ReportListResponse<BookingReportRow>>>(
      '/reports/bookings',
      { params },
    );
    return data.data;
  },

  async getBookingProfitability(bookingId: string): Promise<BookingProfitability> {
    const { data } = await apiClient.get<ApiResponse<BookingProfitability>>(
      `/reports/bookings/${bookingId}/profitability`,
    );
    return data.data;
  },

  async getPaymentReport(params: ReportsSearchParams = {}): Promise<PaymentReportResponse> {
    const { data } = await apiClient.get<ApiResponse<PaymentReportResponse>>('/reports/payments', {
      params,
    });
    return data.data;
  },

  async getExpenseReport(params: ReportsSearchParams = {}): Promise<ExpenseReportResponse> {
    const { data } = await apiClient.get<ApiResponse<ExpenseReportResponse>>('/reports/expenses', {
      params,
    });
    return data.data;
  },

  async getProfitReport(params: ReportsQueryParams = {}): Promise<ProfitReport> {
    const { data } = await apiClient.get<ApiResponse<ProfitReport>>('/reports/profit', { params });
    return data.data;
  },

  async getStaffReport(
    params: ReportsQueryParams = {},
  ): Promise<ReportListResponse<StaffReportRow>> {
    const { data } = await apiClient.get<ApiResponse<ReportListResponse<StaffReportRow>>>(
      '/reports/staff',
      { params },
    );
    return data.data;
  },

  async getTransactions(params: ReportsTransactionsParams = {}): Promise<PaginatedAccountTransactions> {
    const { data } = await apiClient.get<ApiResponse<PaginatedAccountTransactions>>(
      '/reports/transactions',
      { params },
    );
    return data.data;
  },

  async getCharts(params: ReportsQueryParams = {}): Promise<ReportsCharts> {
    const { data } = await apiClient.get<ApiResponse<ReportsCharts>>('/reports/charts', {
      params,
    });
    return data.data;
  },

  async getMonthlySummary(options?: { months?: number; year?: number }): Promise<MonthlySummaryRow[]> {
    const { data } = await apiClient.get<ApiResponse<MonthlySummaryRow[]>>(
      '/reports/monthly-summary',
      { params: options },
    );
    return data.data;
  },
};

export type { AccountTransaction, BookingProfitability, PaginatedAccountTransactions, PaginatedIncome };
