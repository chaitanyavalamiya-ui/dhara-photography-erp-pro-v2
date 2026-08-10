import { apiClient, ApiResponse } from './api-client';
import type { ReportDatePreset } from './reports-service';

export type AccountsDatePreset = ReportDatePreset;

export interface AccountsPeriod {
  preset: string;
  label: string;
  dateFrom: string;
  dateTo: string;
}

export interface AccountsDashboard {
  totalRevenue: number;
  amountReceived: number;
  outstandingAmount: number;
  totalExpenses: number;
  netProfit: number;
  thisMonthRevenue: number;
  thisMonthExpenses: number;
  thisMonthProfit: number;
  totalAlbumOrderValue: number;
  totalAlbumVendorExpense: number;
  totalAlbumProfit: number;
  totalStaffPayments: number;
  thisMonthStaffPayments: number;
}

export interface AccountsPeriodSummary {
  period: AccountsPeriod;
  totalInvoiceValue: number;
  amountReceived: number;
  outstandingAmount: number;
  totalExpenses: number;
  staffPayments: number;
  netProfit: number;
  albumOrderValue: number;
  albumVendorExpense: number;
  albumProfit: number;
  bookingsCount: number;
}

export interface IncomeRow {
  id: string;
  receiptNumber: string | null;
  paymentDate: string;
  clientName: string;
  invoiceNumber?: string | null;
  bookingNumber?: string | null;
  paymentMethod: string;
  amount: number;
}

export interface PaginatedIncome {
  period: AccountsPeriod;
  items: IncomeRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totalAmount: number;
}

export interface ExpenseCategoryBreakdown {
  categoryCode: string;
  categoryLabel: string;
  amount: number;
  count: number;
  isStaffCategory: boolean;
}

export interface AccountsExpenseBreakdown {
  period: AccountsPeriod;
  totalExpenses: number;
  staffPayments: number;
  categories: ExpenseCategoryBreakdown[];
}

export interface StaffPaymentRow {
  id: string;
  expenseDate: string;
  staffId: string;
  staffName: string;
  staffCode: string;
  bookingId?: string | null;
  bookingNumber?: string | null;
  description?: string | null;
  amount: number;
  source: 'staff_assignment' | 'manual';
}

export interface PaginatedStaffPayments {
  period: AccountsPeriod;
  items: StaffPaymentRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totalAmount: number;
}

export interface ProfitLoss {
  period: AccountsPeriod;
  invoiceRevenue: number;
  cashReceived: number;
  totalExpenses: number;
  staffPayments: number;
  netProfit: number;
  profitMarginPercent: number;
  albumOrderValue: number;
  albumVendorExpense: number;
}

export interface MonthlyFinancialRow {
  year: number;
  month: number;
  label: string;
  invoiceRevenue: number;
  cashReceived: number;
  expenses: number;
  staffPayments: number;
  profit: number;
  bookingsCount: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  totalInvoiceValue: number;
  totalPaymentsReceived: number;
  totalOutstanding: number;
  totalExpenses: number;
  netProfit: number;
  bookingsCount: number;
  paidInvoicesCount: number;
  partiallyPaidInvoicesCount: number;
  unpaidInvoicesCount: number;
}

export interface AccountTransaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  description: string;
  bookingNumber?: string | null;
  clientName?: string | null;
  income: number;
  expense: number;
  paymentMethod?: string | null;
  amount: number;
  runningBalance: number;
}

export interface PaginatedAccountTransactions {
  period: AccountsPeriod;
  items: AccountTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totalIncome: number;
  totalExpense: number;
}

export interface BookingProfitability {
  bookingId: string;
  bookingNumber: string;
  clientName: string;
  totalBookingAmount: number;
  totalReceived: number;
  balance: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  invoiceNumber?: string | null;
}

export interface AccountsDateParams {
  preset?: AccountsDatePreset;
  dateFrom?: string;
  dateTo?: string;
}

export const ACCOUNTS_DATE_PRESETS: { value: AccountsDatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

function buildDateParams(params: AccountsDateParams = {}) {
  if (params.preset === 'custom') {
    return { preset: params.preset, dateFrom: params.dateFrom, dateTo: params.dateTo };
  }
  return { preset: params.preset ?? 'this_month' };
}

export const accountsService = {
  async getDashboard(): Promise<AccountsDashboard> {
    const { data } = await apiClient.get<ApiResponse<AccountsDashboard>>('/accounts/dashboard');
    return data.data;
  },

  async getPeriodSummary(params: AccountsDateParams = {}): Promise<AccountsPeriodSummary> {
    const { data } = await apiClient.get<ApiResponse<AccountsPeriodSummary>>('/accounts/summary', {
      params: buildDateParams(params),
    });
    return data.data;
  },

  async getIncome(
    params: AccountsDateParams & { search?: string; page?: number; limit?: number } = {},
  ): Promise<PaginatedIncome> {
    const { data } = await apiClient.get<ApiResponse<PaginatedIncome>>('/accounts/income', {
      params: { ...buildDateParams(params), search: params.search, page: params.page, limit: params.limit },
    });
    return data.data;
  },

  async getExpenseBreakdown(params: AccountsDateParams = {}): Promise<AccountsExpenseBreakdown> {
    const { data } = await apiClient.get<ApiResponse<AccountsExpenseBreakdown>>(
      '/accounts/expense-breakdown',
      { params: buildDateParams(params) },
    );
    return data.data;
  },

  async getStaffPayments(
    params: AccountsDateParams & { search?: string; page?: number; limit?: number } = {},
  ): Promise<PaginatedStaffPayments> {
    const { data } = await apiClient.get<ApiResponse<PaginatedStaffPayments>>(
      '/accounts/staff-payments',
      { params: { ...buildDateParams(params), search: params.search, page: params.page, limit: params.limit },
    });
    return data.data;
  },

  async getProfitLoss(params: AccountsDateParams = {}): Promise<ProfitLoss> {
    const { data } = await apiClient.get<ApiResponse<ProfitLoss>>('/accounts/profit-loss', {
      params: buildDateParams(params),
    });
    return data.data;
  },

  async getMonthlySummary(months = 12): Promise<MonthlyFinancialRow[]> {
    const { data } = await apiClient.get<ApiResponse<MonthlyFinancialRow[]>>(
      '/accounts/monthly-summary',
      { params: { months } },
    );
    return data.data;
  },

  async getTransactions(
    params: AccountsDateParams & {
      search?: string;
      type?: 'all' | 'income' | 'expense';
      page?: number;
      limit?: number;
    } = {},
  ): Promise<PaginatedAccountTransactions> {
    const { data } = await apiClient.get<ApiResponse<PaginatedAccountTransactions>>(
      '/accounts/transactions',
      {
        params: {
          ...buildDateParams(params),
          search: params.search,
          type: params.type,
          page: params.page,
          limit: params.limit,
        },
      },
    );
    return data.data;
  },

  async getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    const { data } = await apiClient.get<ApiResponse<MonthlyReport>>('/accounts/monthly-report', {
      params: { year, month },
    });
    return data.data;
  },

  async getBookingProfit(bookingId: string): Promise<BookingProfitability> {
    const { data } = await apiClient.get<ApiResponse<BookingProfitability>>(
      `/accounts/booking-profit/${bookingId}`,
    );
    return data.data;
  },
};
