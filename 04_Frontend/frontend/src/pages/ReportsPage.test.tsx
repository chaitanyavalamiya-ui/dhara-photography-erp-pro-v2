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

describe('ReportsPage transactions running balance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsService.getDashboard).mockResolvedValue({
      period,
      totalInvoiceValue: 100000,
      totalPaymentsReceived: 78101,
      totalOutstanding: 20000,
      totalExpenses: 49112,
      netProfit: 28989,
      bookingsCount: 4,
      paidInvoicesCount: 2,
      unpaidInvoicesCount: 1,
      averageBookingValue: 30000,
    });
    vi.mocked(reportsService.getOverview).mockResolvedValue({
      period,
      totalBookingValue: 120000,
      totalInvoiceValue: 100000,
      amountReceived: 78101,
      outstandingAmount: 20000,
      totalExpenses: 49112,
      netProfit: 28989,
      albumSales: 0,
      albumVendorExpenses: 0,
      albumProfit: 0,
    });
    vi.mocked(reportsService.getCharts).mockResolvedValue({
      period,
      monthlyIncomeExpense: [],
      incomeByPaymentMethod: [],
      expensesByCategory: [],
      bookingRevenueByType: [],
    });
    vi.mocked(reportsService.getTransactions).mockResolvedValue({
      period,
      items: [
        {
          id: 'e3',
          date: '2026-08-18',
          type: 'expense',
          description: 'Latest expense',
          income: 0,
          expense: 14112,
          amount: 14112,
          runningBalance: 0,
        },
        {
          id: 'i3',
          date: '2026-08-16',
          type: 'income',
          description: 'Income 3',
          income: 13101,
          expense: 0,
          amount: 13101,
          runningBalance: 0,
        },
        {
          id: 'e2',
          date: '2026-08-12',
          type: 'expense',
          description: 'Expense 2',
          income: 0,
          expense: 15000,
          amount: 15000,
          runningBalance: 0,
        },
        {
          id: 'i2',
          date: '2026-08-08',
          type: 'income',
          description: 'Income 2',
          income: 25000,
          expense: 0,
          amount: 25000,
          runningBalance: 0,
        },
        {
          id: 'e1',
          date: '2026-08-04',
          type: 'expense',
          description: 'Expense 1',
          income: 0,
          expense: 20000,
          amount: 20000,
          runningBalance: 0,
        },
        {
          id: 'i1',
          date: '2026-08-01',
          type: 'income',
          description: 'Income 1',
          income: 40000,
          expense: 0,
          amount: 40000,
          runningBalance: 0,
        },
      ],
      total: 6,
      page: 1,
      limit: 100,
      totalPages: 1,
      totalIncome: 78101,
      totalExpense: 49112,
    });
  });

  it('recomputes the running balance so the newest row equals income minus expenses', async () => {
    renderPage();
    await screen.findAllByText('Album Sales');
    screen.getByRole('button', { name: 'Transactions' }).click();

    expect(await screen.findByText(/Income:/)).toBeInTheDocument();
    expect(screen.getAllByText(formatCurrency(78101)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(49112)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(28989)).length).toBeGreaterThan(0);
  });
});
