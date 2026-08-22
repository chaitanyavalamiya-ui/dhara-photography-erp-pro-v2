import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ClipboardList, IndianRupee, Wallet } from 'lucide-react';
import { accountsService } from '@/services/accounts-service';
import { getAlbumOverviewMetrics, reportsService } from '@/services/reports-service';
import { bookingsService } from '@/services/bookings-service';
import { deliveriesService } from '@/services/deliveries-service';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/utils/booking-form';
import { todayIso } from '@/utils/studio-date';
import { QueryErrorPanel, isEnabledQueryLoading } from '@/components/dashboard/QueryErrorPanel';
import { DashboardAnalytics } from '@/components/dashboard/DashboardAnalytics';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { DashboardKpiCard } from '@/components/dashboard/DashboardKpiCard';
import { DashboardEmpty, DashboardSkeleton } from '@/components/dashboard/DashboardEmpty';
import { DashboardQuickActions, DASHBOARD_QUICK_ACTION_ICONS } from '@/components/dashboard/DashboardQuickActions';
import { DashboardRecentPayments } from '@/components/dashboard/DashboardRecentPayments';
import { DashboardTodayBookings } from '@/components/dashboard/DashboardTodayBookings';
import { DashboardUpcomingEvents } from '@/components/dashboard/DashboardUpcomingEvents';
import './dashboard/dashboard-page.css';

/** LOCKED DASHBOARD — DO NOT MODIFY WITHOUT EXPLICIT USER APPROVAL */
export function DashboardPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canAccounts = hasPermission('accounts.read');
  const canReports = hasPermission('reports.read');
  const canBookings = hasPermission('bookings.read');
  const canDeliveries = hasPermission('delivery.read');
  const canCreateBooking = hasPermission('bookings.create');
  const canCreateClient = hasPermission('clients.create');
  const canCreateInvoice = hasPermission('invoices.create');
  const canCreateExpense = hasPermission('expenses.create');
  const canClients = hasPermission('clients.read');
  const canInvoices = hasPermission('invoices.read');
  const canExpenses = hasPermission('expenses.read');

  const today = todayIso();

  const accountsDashboardQuery = useQuery({
    queryKey: ['accounts', 'dashboard'],
    queryFn: accountsService.getDashboard,
    enabled: canAccounts,
  });
  const monthSummaryQuery = useQuery({
    queryKey: ['accounts', 'summary', 'this_month'],
    queryFn: () => accountsService.getPeriodSummary({ preset: 'this_month' }),
    enabled: canAccounts,
  });
  const reportsDashboardQuery = useQuery({
    queryKey: ['reports', 'dashboard', 'this_month'],
    queryFn: () => reportsService.getDashboard({ preset: 'this_month' }),
    enabled: canReports,
  });
  const reportsOverviewQuery = useQuery({
    queryKey: ['reports', 'overview', 'this_month'],
    queryFn: () => reportsService.getOverview({ preset: 'this_month' }),
    enabled: canReports,
  });
  const chartsQuery = useQuery({
    queryKey: ['reports', 'charts', 'this_month'],
    queryFn: () => reportsService.getCharts({ preset: 'this_month' }),
    enabled: canReports,
  });
  const todayBookingsQuery = useQuery({
    queryKey: ['bookings', 'calendar', today],
    queryFn: () => bookingsService.getCalendar({ dateFrom: today, dateTo: today }),
    enabled: canBookings,
  });
  const upcomingBookingsQuery = useQuery({
    queryKey: ['bookings', 'dashboard', 'upcoming'],
    queryFn: () =>
      bookingsService.list({ limit: 6, sortBy: 'eventDate', sortOrder: 'asc', dateFrom: today }),
    enabled: canBookings,
  });
  const recentIncomeQuery = useQuery({
    queryKey: ['accounts', 'income', 'dashboard'],
    queryFn: () => accountsService.getIncome({ preset: 'this_month', limit: 5 }),
    enabled: canAccounts,
  });
  const pendingDeliveriesQuery = useQuery({
    queryKey: ['deliveries', 'dashboard', 'pending'],
    queryFn: () =>
      deliveriesService.list({ status: 'pending', sortBy: 'expectedDate', sortOrder: 'asc', limit: 20 }),
    enabled: canDeliveries,
  });

  const allTime = accountsDashboardQuery.data;
  const month = monthSummaryQuery.data;
  const reportsMonth = reportsDashboardQuery.data;
  const sparkline = chartsQuery.data?.monthlyIncomeExpense.map((row) => row.income) ?? [];

  const kpiCards = useMemo(() => {
    const cards: {
      label: string;
      value: string;
      trend: string;
      icon: typeof CalendarDays;
      tone?: 'violet' | 'green' | 'gold' | 'blue';
      meter?: number;
      sparkline?: number[];
      roboTarget?: string;
    }[] = [];

    const totalBookings = canReports && reportsMonth
      ? reportsMonth.bookingsCount
      : canAccounts && month && !monthSummaryQuery.isError
        ? month.bookingsCount
        : undefined;
    if (totalBookings !== undefined) {
      const unpaid = reportsMonth?.unpaidInvoicesCount;
      cards.push({
        label: 'Total Bookings',
        value: String(totalBookings),
        trend: reportsMonth ? `${reportsMonth.unpaidInvoicesCount} unpaid invoices` : (month?.period.label ?? 'This month'),
        icon: CalendarDays,
        tone: 'violet',
        meter: totalBookings > 0 && unpaid !== undefined ? Math.min(1, unpaid / totalBookings) : undefined,
      });
    }

    if (canBookings && !todayBookingsQuery.isError && !todayBookingsQuery.isLoading) {
      const todayRevenue = (todayBookingsQuery.data ?? []).reduce((sum, item) => sum + item.totalAmount, 0);
      const monthRevenue = allTime?.thisMonthRevenue;
      cards.push({
        label: "Today's Revenue",
        value: formatCurrency(todayRevenue),
        trend: `${todayBookingsQuery.data?.length ?? 0} shoots today`,
        icon: IndianRupee,
        tone: 'green',
        sparkline,
        meter: monthRevenue && monthRevenue > 0 ? Math.min(1, todayRevenue / monthRevenue) : undefined,
        roboTarget: 'today-bookings',
      });
    }

    if (canAccounts && allTime && !accountsDashboardQuery.isError) {
      const received = allTime.amountReceived;
      const outstanding = allTime.outstandingAmount;
      const denom = received + outstanding;
      cards.push({
        label: 'Pending Payment',
        value: formatCurrency(outstanding),
        trend: 'Outstanding client balances',
        icon: Wallet,
        tone: 'gold',
        sparkline,
        meter: denom > 0 ? outstanding / denom : undefined,
        roboTarget: 'cash-received',
      });
    }

    const unpaid = reportsMonth?.unpaidInvoicesCount;
    const pendingDeliveriesCount = canDeliveries && !pendingDeliveriesQuery.isError && !pendingDeliveriesQuery.isLoading
      ? (pendingDeliveriesQuery.data?.total ?? pendingDeliveriesQuery.data?.items.length ?? 0)
      : 0;
    if (unpaid !== undefined || (canDeliveries && pendingDeliveriesQuery.data)) {
      const pendingWork = (unpaid ?? 0) + pendingDeliveriesCount;
      cards.push({
        label: 'Pending Work',
        value: String(pendingWork),
        trend: 'Unpaid invoices and pending deliveries',
        icon: ClipboardList,
        tone: 'blue',
        meter: pendingWork > 0 ? Math.min(1, pendingDeliveriesCount / pendingWork) : undefined,
      });
    }

    return cards.slice(0, 4);
  }, [
    allTime,
    month,
    reportsMonth,
    sparkline,
    canAccounts,
    canReports,
    canBookings,
    canDeliveries,
    accountsDashboardQuery.isError,
    monthSummaryQuery.isError,
    monthSummaryQuery.isLoading,
    reportsDashboardQuery.isError,
    reportsDashboardQuery.isLoading,
    todayBookingsQuery.data,
    todayBookingsQuery.isLoading,
    todayBookingsQuery.isError,
    pendingDeliveriesQuery.data,
    pendingDeliveriesQuery.isError,
    pendingDeliveriesQuery.isLoading,
  ]);

  const snapshotLoading =
    isEnabledQueryLoading(canAccounts, accountsDashboardQuery) ||
    isEnabledQueryLoading(canAccounts, monthSummaryQuery) ||
    isEnabledQueryLoading(canReports, reportsDashboardQuery) ||
    isEnabledQueryLoading(canBookings, todayBookingsQuery);

  const snapshotErrorQuery = [
    canAccounts && accountsDashboardQuery.isError ? accountsDashboardQuery : null,
    canBookings && todayBookingsQuery.isError ? todayBookingsQuery : null,
  ].find((query) => query !== null);

  const retrySnapshot = () => {
    if (canAccounts && accountsDashboardQuery.isError) void accountsDashboardQuery.refetch();
    if (canBookings && todayBookingsQuery.isError) void todayBookingsQuery.refetch();
  };

  const quickActions = [
    (canCreateBooking || canBookings) && {
      label: 'New Booking',
      description: 'Schedule a studio shoot',
      to: '/bookings',
      icon: DASHBOARD_QUICK_ACTION_ICONS.booking,
    },
    (canCreateClient || canClients) && {
      label: 'Add Client',
      description: 'Grow the studio CRM',
      to: '/clients',
      icon: DASHBOARD_QUICK_ACTION_ICONS.client,
    },
    (canCreateInvoice || canInvoices) && {
      label: 'Create Invoice',
      description: 'Bill a confirmed booking',
      to: '/invoices',
      icon: DASHBOARD_QUICK_ACTION_ICONS.invoice,
    },
    (canCreateExpense || canExpenses) && {
      label: 'Add Expense',
      description: 'Record a studio cost',
      to: '/expenses',
      icon: DASHBOARD_QUICK_ACTION_ICONS.expense,
    },
  ].filter(Boolean) as { label: string; description: string; to: string; icon: typeof CalendarDays }[];

  return (
    <div className="dhara-dashboard">
      <DashboardHero />

      <div>
        {snapshotErrorQuery ? (
          <div className="mb-3">
            <QueryErrorPanel
              error={snapshotErrorQuery.error}
              fallback="Failed to load studio snapshot."
              onRetry={retrySnapshot}
            />
          </div>
        ) : null}
        {kpiCards.length > 0 || snapshotLoading ? (
          <div className="dhara-dash-kpis">
            {kpiCards.map((card) => (
              <DashboardKpiCard key={card.label} {...card} />
            ))}
            {snapshotLoading
              ? Array.from({ length: Math.max(0, 4 - kpiCards.length) }).map((_, i) => (
                  <DashboardSkeleton key={`kpi-loading-${i}`} />
                ))
              : null}
          </div>
        ) : snapshotErrorQuery ? null : (
          <DashboardEmpty message="Studio metrics will appear once booking and accounts data is available." />
        )}
      </div>

      <div className="dhara-dash-mid">
        {canReports && (
          <DashboardAnalytics
            charts={chartsQuery.data}
            loading={chartsQuery.isLoading}
            error={chartsQuery.isError ? chartsQuery.error : null}
            onRetry={() => void chartsQuery.refetch()}
          />
        )}
        <DashboardQuickActions actions={quickActions} />
      </div>

      {canReports && reportsOverviewQuery.data ? (
        <div className="dhara-dash-album">
          {getAlbumOverviewMetrics(reportsOverviewQuery.data).map((metric, index) => (
            <article key={metric.key} className={`dhara-dash-kpi is-${['gold', 'purple', 'cyan'][index % 3]}`}>
              <h3>{metric.label}</h3>
              <strong>{formatCurrency(metric.value)}</strong>
              <p className="dhara-dash-kpi-trend">This month</p>
            </article>
          ))}
        </div>
      ) : null}

      <div className="dhara-dash-bottom">
        {canBookings && (
          <DashboardTodayBookings
            bookings={todayBookingsQuery.data}
            loading={todayBookingsQuery.isLoading}
            error={todayBookingsQuery.isError ? todayBookingsQuery.error : null}
            onRetry={() => void todayBookingsQuery.refetch()}
          />
        )}
        {canAccounts && (
          <DashboardRecentPayments
            payments={recentIncomeQuery.data?.items}
            loading={recentIncomeQuery.isLoading}
            error={recentIncomeQuery.isError ? recentIncomeQuery.error : null}
            onRetry={() => void recentIncomeQuery.refetch()}
          />
        )}
        {canBookings && (
          <DashboardUpcomingEvents
            bookings={upcomingBookingsQuery.data}
            loading={upcomingBookingsQuery.isLoading}
            error={upcomingBookingsQuery.isError ? upcomingBookingsQuery.error : null}
            onRetry={() => void upcomingBookingsQuery.refetch()}
          />
        )}
      </div>
    </div>
  );
}
