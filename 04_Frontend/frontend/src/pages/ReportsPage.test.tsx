import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsPage } from './ReportsPage';
import { reportsService } from '@/services/reports-service';
import { formatCurrency } from '@/utils/booking-form';

vi.mock('@/services/reports-service', async () => {
  const actual = await vi.importActual<typeof import('@/services/reports-service')>(
    '@/services/reports-service',
  );
  return {
    ...actual,
    reportsService: {
      getDashboard: vi.fn(),
      getOverview: vi.fn(),
      getCharts: vi.fn(),
      getIncome: vi.fn(),
      getPaymentReport: vi.fn(),
      getExpenseReport: vi.fn(),
      getProfitReport: vi.fn(),
      getBookingReport: vi.fn(),
      getStaffReport: vi.fn(),
      getMonthlySummary: vi.fn(),
      getTransactions: vi.fn(),
      getBookingProfitability: vi.fn(),
    },
  };
});

vi.mock('@/components/reports/ReportChartsSection', () => ({
  ReportChartsSection: () => <div>Charts</div>,
}));

const period = {
  preset: 'this_month',
  label: 'This Month',
  dateFrom: '2026-08-01',
  dateTo: '2026-08-31',
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ReportsPage />
    </QueryClientProvider>,
  );
}

describe('ReportsPage overview album metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsService.getDashboard).mockResolvedValue({
      period,
      totalInvoiceValue: 100000,
      totalPaymentsReceived: 80000,
      totalOutstanding: 20000,
      totalExpenses: 30000,
      netProfit: 50000,
      bookingsCount: 4,
      paidInvoicesCount: 2,
      unpaidInvoicesCount: 1,
      averageBookingValue: 30000,
    });
    vi.mocked(reportsService.getCharts).mockResolvedValue({
      period,
      monthlyIncomeExpense: [],
      incomeByPaymentMethod: [],
      expensesByCategory: [],
      bookingRevenueByType: [],
    });
    vi.mocked(reportsService.getOverview).mockResolvedValue({
      period,
      totalBookingValue: 120000,
      totalInvoiceValue: 100000,
      amountReceived: 80000,
      outstandingAmount: 20000,
      totalExpenses: 30000,
      netProfit: 50000,
      albumSales: 25000,
      albumVendorExpenses: 8000,
      albumProfit: 17000,
    });
  });

  it('loads GET /reports/overview and shows album sales, vendor cost, and profit', async () => {
    renderPage();

    expect((await screen.findAllByText('Album Sales')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Album Vendor Cost').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Album Profit').length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(25000)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(8000)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(17000)).length).toBeGreaterThan(0);
    expect(reportsService.getOverview).toHaveBeenCalledWith(
      expect.objectContaining({ preset: 'this_month' }),
    );
  });

  it('displays the overview album profit value even when it is not sales minus vendor cost', async () => {
    vi.mocked(reportsService.getOverview).mockResolvedValue({
      period,
      totalBookingValue: 120000,
      totalInvoiceValue: 100000,
      amountReceived: 80000,
      outstandingAmount: 20000,
      totalExpenses: 30000,
      netProfit: 50000,
      albumSales: 25000,
      albumVendorExpenses: 8000,
      albumProfit: 99999,
    });

    renderPage();

    expect(await screen.findAllByText('Album Profit')).toHaveLength(2);
    expect(screen.getAllByText(formatCurrency(99999)).length).toBeGreaterThan(0);
    expect(screen.queryByText(formatCurrency(17000))).not.toBeInTheDocument();
  });
});
