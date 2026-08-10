import { apiClient, ApiResponse } from './api-client';

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

export const accountsService = {
  async getDashboard(): Promise<AccountsDashboard> {
    const { data } = await apiClient.get<ApiResponse<AccountsDashboard>>('/accounts/dashboard');
    return data.data;
  },

  async getTransactions(): Promise<AccountTransaction[]> {
    const { data } = await apiClient.get<ApiResponse<AccountTransaction[]>>('/accounts/transactions');
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
