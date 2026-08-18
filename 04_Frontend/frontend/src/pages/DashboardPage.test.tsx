import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { accountsService } from '@/services/accounts-service';
import { reportsService } from '@/services/reports-service';
import { bookingsService } from '@/services/bookings-service';
import { clientsService } from '@/services/clients-service';
import { deliveriesService } from '@/services/deliveries-service';
import { invoicesService } from '@/services/invoices-service';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/utils/booking-form';

vi.mock('@/services/accounts-service', () => ({
  accountsService: {
    getDashboard: vi.fn(),
    getPeriodSummary: vi.fn(),
    getIncome: vi.fn(),
  },
}));

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
    },
  };
});

vi.mock('@/services/bookings-service', () => ({
  bookingsService: {
    getCalendar: vi.fn(),
    list: vi.fn(),
  },
}));

vi.mock('@/services/clients-service', () => ({
  clientsService: { getUpcomingEvents: vi.fn() },
}));

vi.mock('@/services/deliveries-service', () => ({
  deliveriesService: { list: vi.fn() },
}));

vi.mock('@/services/invoices-service', () => ({
  invoicesService: { list: vi.fn() },
}));

vi.mock('@/services/equipment-service', () => ({
  equipmentService: {
    getDashboard: vi.fn().mockResolvedValue({
      onShoot: 0,
      withStaff: 0,
      missing: 0,
      damaged: 0,
      underRepair: 0,
      available: 0,
    }),
  },
}));

vi.mock('@/components/reports/ReportChartsSection', () => ({
  ReportChartsSection: () => <div>Charts</div>,
}));

const period = {
  preset: 'this_month',
  label: 'This Month',
  dateFrom: '2026-08-01',
  dateTo: '2026-08-31',
};

const emptyPage = { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <DashboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('DashboardPage overview album metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Admin User',
        email: 'admin@example.com',
        companyId: 'c1',
        permissions: [
          'dashboard.read',
          'accounts.read',
          'reports.read',
          'bookings.read',
          'clients.read',
          'delivery.read',
          'invoices.read',
        ],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });

    vi.mocked(accountsService.getDashboard).mockResolvedValue({
      amountReceived: 0,
      outstandingAmount: 0,
      netProfit: 0,
    } as never);
    vi.mocked(accountsService.getPeriodSummary).mockResolvedValue({
      period,
      bookingsCount: 0,
      totalExpenses: 0,
      netProfit: 0,
    } as never);
    vi.mocked(accountsService.getIncome).mockResolvedValue({
      ...emptyPage,
      items: [],
      totalAmount: 0,
    } as never);
    vi.mocked(bookingsService.getCalendar).mockResolvedValue([]);
    vi.mocked(bookingsService.list).mockResolvedValue(emptyPage as never);
    vi.mocked(clientsService.getUpcomingEvents).mockResolvedValue([]);
    vi.mocked(deliveriesService.list).mockResolvedValue(emptyPage as never);
    vi.mocked(invoicesService.list).mockResolvedValue(emptyPage as never);
    vi.mocked(reportsService.getDashboard).mockResolvedValue({
      period,
      totalInvoiceValue: 0,
      totalPaymentsReceived: 0,
      totalOutstanding: 0,
      totalExpenses: 0,
      netProfit: 0,
      bookingsCount: 0,
      paidInvoicesCount: 0,
      unpaidInvoicesCount: 0,
      averageBookingValue: 0,
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
      totalBookingValue: 0,
      totalInvoiceValue: 0,
      amountReceived: 0,
      outstandingAmount: 0,
      totalExpenses: 0,
      netProfit: 0,
      albumSales: 12500,
      albumVendorExpenses: 4500,
      albumProfit: 8000,
    });
  });

  it('loads reports overview and shows album sales, vendor cost, and profit', async () => {
    renderPage();

    expect(await screen.findByText('Album Sales')).toBeInTheDocument();
    expect(screen.getByText('Album Vendor Cost')).toBeInTheDocument();
    expect(screen.getByText('Album Profit')).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(12500))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(4500))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(8000))).toBeInTheDocument();
    expect(reportsService.getOverview).toHaveBeenCalledWith({ preset: 'this_month' });
  });

  it('does not fetch reports overview without reports.read', async () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Staff',
        email: 's@example.com',
        companyId: 'c1',
        permissions: ['dashboard.read', 'bookings.read'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });

    renderPage();

    expect(await screen.findByText('Welcome, Staff')).toBeInTheDocument();
    expect(reportsService.getOverview).not.toHaveBeenCalled();
    expect(screen.queryByText('Album Sales')).not.toBeInTheDocument();
  });
});
