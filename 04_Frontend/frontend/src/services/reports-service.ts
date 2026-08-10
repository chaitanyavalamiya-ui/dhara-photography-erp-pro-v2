import { apiClient, ApiResponse } from './api-client';

export type ReportDatePreset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export interface ReportDateRange {
  preset: string;
  label: string;
  dateFrom: string;
  dateTo: string;
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
}

export interface ProfitReport {
  period: ReportDateRange;
  revenue: number;
  received: number;
  expenses: number;
  profit: number;
  profitPercent: number;
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
}

export interface ReportListResponse<T> {
  period: ReportDateRange;
  items: T[];
  total: number;
}

export interface ReportsQueryParams {
  preset?: ReportDatePreset;
  dateFrom?: string;
  dateTo?: string;
}

export const REPORT_DATE_PRESETS: { value: ReportDatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom' },
];

export const reportsService = {
  async getOverview(params: ReportsQueryParams = {}): Promise<ReportsOverview> {
    const { data } = await apiClient.get<ApiResponse<ReportsOverview>>('/reports/overview', {
      params,
    });
    return data.data;
  },

  async getBookingReport(params: ReportsQueryParams = {}): Promise<ReportListResponse<BookingReportRow>> {
    const { data } = await apiClient.get<ApiResponse<ReportListResponse<BookingReportRow>>>(
      '/reports/bookings',
      { params },
    );
    return data.data;
  },

  async getPaymentReport(params: ReportsQueryParams = {}): Promise<ReportListResponse<PaymentReportRow>> {
    const { data } = await apiClient.get<ApiResponse<ReportListResponse<PaymentReportRow>>>(
      '/reports/payments',
      { params },
    );
    return data.data;
  },

  async getExpenseReport(params: ReportsQueryParams = {}): Promise<ReportListResponse<ExpenseReportRow>> {
    const { data } = await apiClient.get<ApiResponse<ReportListResponse<ExpenseReportRow>>>(
      '/reports/expenses',
      { params },
    );
    return data.data;
  },

  async getProfitReport(params: ReportsQueryParams = {}): Promise<ProfitReport> {
    const { data } = await apiClient.get<ApiResponse<ProfitReport>>('/reports/profit', { params });
    return data.data;
  },

  async getMonthlySummary(months = 12): Promise<MonthlySummaryRow[]> {
    const { data } = await apiClient.get<ApiResponse<MonthlySummaryRow[]>>(
      '/reports/monthly-summary',
      { params: { months } },
    );
    return data.data;
  },
};
