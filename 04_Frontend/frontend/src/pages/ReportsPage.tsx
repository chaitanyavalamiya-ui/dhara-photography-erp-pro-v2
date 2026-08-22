import { useMemo, useState, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  BookImage,
  BookOpen,
  CalendarRange,
  Search,
  TrendingDown,
  TrendingUp,
  UserCog,
  Wallet,
} from 'lucide-react';
import {
  getAlbumOverviewMetrics,
  REPORT_DATE_PRESETS,
  ReportDatePreset,
  reportsService,
} from '@/services/reports-service';
import { withLedgerRunningBalances } from '@/utils/running-balance';
import { BookingProfitabilityModal } from '@/components/reports/BookingProfitabilityModal';
import { ReportChartsSection } from '@/components/reports/ReportChartsSection';
import { ReportExportBar } from '@/components/reports/ReportExportBar';
import { ReportsCountUp } from '@/components/reports/ReportsCountUp';
import { formatCurrency } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { firstOfMonthIso, getStudioDateParts, todayIso } from '@/utils/studio-date';
import { cn } from '@/utils/cn';
import './reports/reports-page.css';

type ReportTab =
  | 'dashboard'
  | 'income'
  | 'payments'
  | 'expenses'
  | 'profit'
  | 'bookings'
  | 'staff'
  | 'monthly'
  | 'transactions';

type KpiTone = 'is-gold' | 'is-green' | 'is-rose' | 'is-amber' | 'is-cyan' | 'is-purple';

function ReportsHeroArt() {
  return (
    <svg viewBox="0 0 240 190" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="rptHeroGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#c9a227" />
        </linearGradient>
        <linearGradient id="rptHeroCyan" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle cx="132" cy="96" r="78" stroke="url(#rptHeroGold)" strokeOpacity="0.22" />
      <circle cx="132" cy="96" r="56" stroke="url(#rptHeroGold)" strokeOpacity="0.42" strokeWidth="1.5" />
      <path d="M58 148 L86 92 L112 118 L148 58 L176 88 L204 42" stroke="url(#rptHeroCyan)" strokeWidth="2.4" />
      <rect x="62" y="118" width="14" height="30" rx="3" fill="#4ade80" fillOpacity="0.85" />
      <rect x="86" y="96" width="14" height="52" rx="3" fill="#ffd45a" fillOpacity="0.9" />
      <rect x="110" y="108" width="14" height="40" rx="3" fill="#22d3ee" fillOpacity="0.85" />
      <rect x="134" y="72" width="14" height="76" rx="3" fill="#ffd45a" fillOpacity="0.95" />
      <rect x="158" y="88" width="14" height="60" rx="3" fill="#c084fc" fillOpacity="0.85" />
      <circle cx="148" cy="58" r="5" fill="#ffe08a" />
    </svg>
  );
}

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('dashboard');
  const [preset, setPreset] = useState<ReportDatePreset>('this_month');
  const [dateFrom, setDateFrom] = useState(firstOfMonthIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [applied, setApplied] = useState({
    preset: 'this_month' as ReportDatePreset,
    dateFrom: firstOfMonthIso(),
    dateTo: todayIso(),
  });
  const [filterError, setFilterError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [txnType, setTxnType] = useState<'all' | 'income' | 'expense'>('all');
  const [monthlyYear, setMonthlyYear] = useState(getStudioDateParts().year);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    if (applied.preset === 'custom') {
      return { preset: applied.preset, dateFrom: applied.dateFrom, dateTo: applied.dateTo };
    }
    return { preset: applied.preset };
  }, [applied]);

  const applyFilters = (nextPreset = preset, nextFrom = dateFrom, nextTo = dateTo) => {
    if (nextPreset === 'custom') {
      if (!nextFrom || !nextTo) {
        setFilterError('Custom range requires both start and end dates.');
        return;
      }
      if (nextFrom > nextTo) {
        setFilterError('Start date must be on or before end date.');
        return;
      }
    }
    setFilterError(null);
    setApplied({ preset: nextPreset, dateFrom: nextFrom, dateTo: nextTo });
  };

  const selectPreset = (value: ReportDatePreset) => {
    setPreset(value);
    if (value !== 'custom') {
      applyFilters(value, dateFrom, dateTo);
    }
  };

  const dashboardQuery = useQuery({
    queryKey: ['reports', 'dashboard', queryParams],
    queryFn: () => reportsService.getDashboard(queryParams),
    enabled: tab !== 'monthly',
  });

  const overviewQuery = useQuery({
    queryKey: ['reports', 'overview', queryParams],
    queryFn: () => reportsService.getOverview(queryParams),
    enabled: tab === 'dashboard',
  });

  const chartsQuery = useQuery({
    queryKey: ['reports', 'charts', queryParams],
    queryFn: () => reportsService.getCharts(queryParams),
    enabled: tab === 'dashboard',
  });

  const incomeQuery = useQuery({
    queryKey: ['reports', 'income', queryParams, search],
    queryFn: () => reportsService.getIncome({ ...queryParams, search: search || undefined, limit: 100 }),
    enabled: tab === 'income',
  });

  const paymentsQuery = useQuery({
    queryKey: ['reports', 'payments', queryParams, search],
    queryFn: () =>
      reportsService.getPaymentReport({ ...queryParams, search: search || undefined, limit: 100 }),
    enabled: tab === 'payments',
  });

  const expensesQuery = useQuery({
    queryKey: ['reports', 'expenses', queryParams, search],
    queryFn: () => reportsService.getExpenseReport({ ...queryParams, search: search || undefined }),
    enabled: tab === 'expenses',
  });

  const profitQuery = useQuery({
    queryKey: ['reports', 'profit', queryParams],
    queryFn: () => reportsService.getProfitReport(queryParams),
    enabled: tab === 'profit',
  });

  const bookingsQuery = useQuery({
    queryKey: ['reports', 'bookings', queryParams],
    queryFn: () => reportsService.getBookingReport(queryParams),
    enabled: tab === 'bookings',
  });

  const staffQuery = useQuery({
    queryKey: ['reports', 'staff', queryParams],
    queryFn: () => reportsService.getStaffReport(queryParams),
    enabled: tab === 'staff',
  });

  const monthlyQuery = useQuery({
    queryKey: ['reports', 'monthly-summary', monthlyYear],
    queryFn: () => reportsService.getMonthlySummary({ year: monthlyYear }),
    enabled: tab === 'monthly',
  });

  const transactionsQuery = useQuery({
    queryKey: ['reports', 'transactions', queryParams, search, txnType],
    queryFn: () =>
      reportsService.getTransactions({
        ...queryParams,
        search: search || undefined,
        type: txnType,
        limit: 100,
      }),
    enabled: tab === 'transactions',
  });

  const bookingDetailQuery = useQuery({
    queryKey: ['reports', 'booking-profitability', selectedBookingId],
    queryFn: () => reportsService.getBookingProfitability(selectedBookingId!),
    enabled: Boolean(selectedBookingId),
  });

  const dashboard = dashboardQuery.data;
  const periodLabel =
    dashboard?.period.label ??
    incomeQuery.data?.period.label ??
    expensesQuery.data?.period.label ??
    profitQuery.data?.period.label ??
    bookingsQuery.data?.period.label ??
    staffQuery.data?.period.label ??
    transactionsQuery.data?.period.label;

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'income', label: 'Income' },
    { id: 'payments', label: 'Payments' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'profit', label: 'Profit & Loss' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'staff', label: 'Staff Payments' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'transactions', label: 'Transactions' },
  ];

  const activeError =
    (tab === 'dashboard' && (dashboardQuery.error || overviewQuery.error || chartsQuery.error)) ||
    (tab === 'income' && incomeQuery.error) ||
    (tab === 'payments' && paymentsQuery.error) ||
    (tab === 'expenses' && expensesQuery.error) ||
    (tab === 'profit' && profitQuery.error) ||
    (tab === 'bookings' && bookingsQuery.error) ||
    (tab === 'staff' && staffQuery.error) ||
    (tab === 'monthly' && monthlyQuery.error) ||
    (tab === 'transactions' && transactionsQuery.error);

  const isLoading =
    (tab === 'dashboard' &&
      (dashboardQuery.isLoading || overviewQuery.isLoading || chartsQuery.isLoading)) ||
    (tab === 'income' && incomeQuery.isLoading) ||
    (tab === 'payments' && paymentsQuery.isLoading) ||
    (tab === 'expenses' && expensesQuery.isLoading) ||
    (tab === 'profit' && profitQuery.isLoading) ||
    (tab === 'bookings' && bookingsQuery.isLoading) ||
    (tab === 'staff' && staffQuery.isLoading) ||
    (tab === 'monthly' && monthlyQuery.isLoading) ||
    (tab === 'transactions' && transactionsQuery.isLoading);

  const retryActive = () => {
    if (tab === 'dashboard') {
      void dashboardQuery.refetch();
      void overviewQuery.refetch();
      void chartsQuery.refetch();
      return;
    }
    if (tab === 'income') void incomeQuery.refetch();
    if (tab === 'payments') void paymentsQuery.refetch();
    if (tab === 'expenses') void expensesQuery.refetch();
    if (tab === 'profit') void profitQuery.refetch();
    if (tab === 'bookings') void bookingsQuery.refetch();
    if (tab === 'staff') void staffQuery.refetch();
    if (tab === 'monthly') void monthlyQuery.refetch();
    if (tab === 'transactions') void transactionsQuery.refetch();
  };

  const coreSummaryCards = dashboard
    ? [
        {
          label: 'Total Invoice Value',
          value: dashboard.totalInvoiceValue,
          icon: TrendingUp,
          tone: 'is-gold' as KpiTone,
        },
        {
          label: 'Total Received',
          value: dashboard.totalPaymentsReceived,
          icon: ArrowDownLeft,
          tone: 'is-green' as KpiTone,
        },
        {
          label: 'Total Expenses',
          value: dashboard.totalExpenses,
          icon: ArrowUpRight,
          tone: 'is-rose' as KpiTone,
        },
        {
          label: 'Outstanding (period invoices)',
          value: dashboard.totalOutstanding,
          icon: Wallet,
          tone: 'is-amber' as KpiTone,
        },
        {
          label: 'Net Profit',
          value: dashboard.netProfit,
          icon: dashboard.netProfit >= 0 ? TrendingUp : TrendingDown,
          tone: (dashboard.netProfit >= 0 ? 'is-green' : 'is-rose') as KpiTone,
        },
        {
          label: 'Bookings',
          value: dashboard.bookingsCount,
          icon: BookOpen,
          tone: 'is-gold' as KpiTone,
          isCount: true,
        },
      ]
    : [];

  const albumOverviewCards = overviewQuery.data
    ? getAlbumOverviewMetrics(overviewQuery.data).map((metric) => ({
        label: metric.label,
        value: metric.value,
        icon:
          metric.key === 'albumSales'
            ? BookImage
            : metric.key === 'albumVendorCost'
              ? ArrowUpRight
              : metric.value >= 0
                ? TrendingUp
                : TrendingDown,
        tone: (metric.key === 'albumVendorCost'
          ? 'is-rose'
          : metric.key === 'albumProfit'
            ? metric.value >= 0
              ? 'is-green'
              : 'is-rose'
            : 'is-gold') as KpiTone,
      }))
    : [];

  const dashboardCards = dashboard
    ? [
        {
          label: 'Total Invoice Value',
          value: dashboard.totalInvoiceValue,
          icon: TrendingUp,
          tone: 'is-gold' as KpiTone,
        },
        {
          label: 'Payments Received',
          value: dashboard.totalPaymentsReceived,
          icon: ArrowDownLeft,
          tone: 'is-green' as KpiTone,
        },
        {
          label: 'Outstanding (period invoices)',
          value: dashboard.totalOutstanding,
          icon: Wallet,
          tone: 'is-amber' as KpiTone,
        },
        {
          label: 'Total Expenses',
          value: dashboard.totalExpenses,
          icon: ArrowUpRight,
          tone: 'is-rose' as KpiTone,
        },
        {
          label: 'Net Profit / Loss',
          value: dashboard.netProfit,
          icon: dashboard.netProfit >= 0 ? TrendingUp : TrendingDown,
          tone: (dashboard.netProfit >= 0 ? 'is-green' : 'is-rose') as KpiTone,
        },
        {
          label: 'Bookings',
          value: dashboard.bookingsCount,
          icon: BookOpen,
          tone: 'is-gold' as KpiTone,
          isCount: true,
        },
        {
          label: 'Paid Invoices',
          value: dashboard.paidInvoicesCount,
          icon: TrendingUp,
          tone: 'is-green' as KpiTone,
          isCount: true,
        },
        {
          label: 'Unpaid Invoices',
          value: dashboard.unpaidInvoicesCount,
          icon: TrendingDown,
          tone: 'is-amber' as KpiTone,
          isCount: true,
        },
        {
          label: 'Avg Booking Value',
          value: dashboard.averageBookingValue,
          icon: BarChart3,
          tone: 'is-cyan' as KpiTone,
        },
        ...albumOverviewCards,
      ]
    : [];

  const incomeRows = (incomeQuery.data?.items ?? []).map((row) => [
    row.paymentDate,
    row.receiptNumber ?? '—',
    row.clientName,
    row.invoiceNumber ?? '—',
    row.bookingNumber ?? '—',
    row.paymentMethod,
    row.amount,
  ]);

  const paymentRows = (paymentsQuery.data?.items ?? []).map((row) => [
    row.paymentDate,
    row.receiptNumber ?? '—',
    row.clientName,
    row.invoiceNumber ?? '—',
    row.bookingNumber ?? '—',
    row.paymentMethod,
    row.amount,
  ]);

  const expenseRows = (expensesQuery.data?.items ?? []).map((row) => [
    row.expenseDate,
    row.category,
    row.description ?? '—',
    row.staffName ?? '—',
    row.bookingNumber ?? '—',
    row.amount,
  ]);

  const bookingRows = (bookingsQuery.data?.items ?? []).map((row) => [
    row.bookingNumber,
    row.clientName,
    row.eventDate ?? '—',
    row.totalAmount,
    row.received,
    row.outstanding,
    row.expenses,
    row.profit,
  ]);

  const staffRows = (staffQuery.data?.items ?? []).map((row) => [
    row.staffName,
    row.staffCode,
    row.assignmentsCount,
    row.totalPayments,
    row.monthlyCost,
  ]);

  const monthlyRows = (monthlyQuery.data ?? []).map((row) => [
    row.label,
    row.bookingsCount,
    row.revenue,
    row.received,
    row.expenses,
    row.staffPayments ?? 0,
    row.profit,
    row.outstanding,
  ]);

  const transactionItems = withLedgerRunningBalances(transactionsQuery.data?.items ?? []);

  const txnRows = transactionItems.map((row) => [
    row.date,
    row.type,
    row.description,
    row.clientName ?? '—',
    row.bookingNumber ?? '—',
    row.paymentMethod ?? '—',
    row.income,
    row.expense,
    row.runningBalance,
  ]);

  return (
    <>
    <div className="dhara-rpt">
      <div className="dhara-rpt-ambient" aria-hidden>
        <span className="dhara-rpt-orb is-maroon" />
        <span className="dhara-rpt-orb is-gold" />
        <span className="dhara-rpt-orb is-cyan" />
        <span className="dhara-rpt-orb is-purple" />
        <span className="dhara-rpt-grid-bg" />
      </div>

      <section className="dhara-rpt-hero">
        <span className="dhara-rpt-lens" aria-hidden />
        <span className="dhara-rpt-particles" aria-hidden />
        <div>
          <p className="dhara-rpt-kicker">Dhara Photography ERP Pro</p>
          <h2>Reports & Analytics</h2>
          <p className="dhara-rpt-hero-copy">રિપોર્ટ — આવક, ખર્ચ અને નફો</p>
          {periodLabel && tab !== 'monthly' && (
            <p className="dhara-rpt-period">
              <CalendarRange />
              Period: {periodLabel}
            </p>
          )}
        </div>
        <div className="dhara-rpt-hero-art">
          <span className="dhara-rpt-hero-halo" aria-hidden />
          <ReportsHeroArt />
        </div>
      </section>

      {tab !== 'monthly' && (
        <section className="dhara-rpt-panel">
          <p className="dhara-rpt-section-title">Date range</p>
          <div className="dhara-rpt-presets">
            {REPORT_DATE_PRESETS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn('dhara-rpt-chip', preset === item.value && 'is-on')}
                onClick={() => selectPreset(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="dhara-rpt-toolbar-row" style={{ marginTop: '1rem' }}>
              <div className="dhara-rpt-field">
                <label htmlFor="reports-date-from">From</label>
                <input
                  id="reports-date-from"
                  type="date"
                  className="dhara-rpt-input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="dhara-rpt-field">
                <label htmlFor="reports-date-to">To</label>
                <input
                  id="reports-date-to"
                  type="date"
                  className="dhara-rpt-input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="dhara-rpt-hero-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="dhara-rpt-btn is-gold" onClick={() => applyFilters()}>
              Apply Filters
            </button>
          </div>
          {filterError && <p className="dhara-rpt-err">{filterError}</p>}
        </section>
      )}

      <div className="dhara-rpt-tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn('dhara-rpt-tab', tab === item.id && 'is-on')}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {(tab === 'income' || tab === 'payments' || tab === 'expenses' || tab === 'transactions') && (
        <section className="dhara-rpt-panel">
          <div className="dhara-rpt-toolbar-row">
            <div className="dhara-rpt-input-wrap" style={{ flex: '1 1 18rem' }}>
              <Search />
              <input
                className="dhara-rpt-input is-icon"
                placeholder="Search reports…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
              />
            </div>
            <button type="button" className="dhara-rpt-btn is-gold" onClick={() => setSearch(searchInput)}>
              Search
            </button>
            {tab === 'transactions' && (
              <div className="dhara-rpt-presets">
                {(['all', 'income', 'expense'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={cn('dhara-rpt-chip', txnType === type && 'is-on')}
                    onClick={() => setTxnType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {tab === 'monthly' && (
        <section className="dhara-rpt-panel">
          <div className="dhara-rpt-field" style={{ maxWidth: '12rem' }}>
            <label htmlFor="reports-year">Year</label>
            <select
              id="reports-year"
              className="dhara-rpt-input"
              value={monthlyYear}
              onChange={(e) => setMonthlyYear(Number(e.target.value))}
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const year = getStudioDateParts().year - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </section>
      )}

      {activeError && (
        <div className="dhara-rpt-error">
          <BarChart3 />
          <p>{getApiErrorMessage(activeError, 'Failed to load report data.')}</p>
          <button type="button" className="dhara-rpt-btn is-gold" onClick={retryActive}>
            Retry
          </button>
        </div>
      )}

      {tab !== 'monthly' && tab !== 'dashboard' && (
        <ReportSummaryCards cards={coreSummaryCards} loading={dashboardQuery.isLoading} />
      )}

      {isLoading ? (
        <div className="dhara-rpt-kpis">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="dhara-rpt-skeleton" style={{ minHeight: '8.5rem' }} />
          ))}
        </div>
      ) : (
        <>
          {tab === 'dashboard' && dashboard && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <ReportExportBar
                  reportId="report-export-dashboard"
                  reportTitle={`Reports-Dashboard-${dashboard.period.dateFrom}`}
                  headers={['Metric', 'Value']}
                  rows={dashboardCards.map((c) => [
                    c.label,
                    'isCount' in c && c.isCount ? c.value : formatCurrency(c.value as number),
                  ])}
                />
              </div>
              <div
                id="report-export-dashboard"
                aria-hidden="true"
                className="pointer-events-none fixed -left-[9999px] top-0 z-[-1] w-[210mm] space-y-6 bg-white p-6 text-[#1a1a1a]"
              >
                <div className="border-b-4 border-[#6b1d3a] pb-3">
                  <h2 className="text-xl font-bold text-[#6b1d3a]">Dhara Photography Patan</h2>
                  <p className="text-sm text-[#b8860b]">Reports Dashboard — {dashboard.period.label}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dashboardCards.map((card) => (
                    <div key={card.label} className="rounded-lg border border-[#b8860b]/20 p-4">
                      <p className="text-xs uppercase text-gray-500">{card.label}</p>
                      <p className="mt-2 text-xl font-bold text-[#6b1d3a]">
                        {'isCount' in card && card.isCount ? card.value : formatCurrency(card.value as number)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dhara-rpt-kpis">
                {dashboardCards.map((card) => (
                  <KpiCard key={card.label} {...card} />
                ))}
              </div>
              <ReportChartsSection charts={chartsQuery.data} />
            </div>
          )}

          {tab === 'income' && incomeQuery.data && (
            <div id="report-export-income" className="space-y-4">
              <div className="dhara-rpt-toolbar-head">
                <p className="dhara-rpt-note" style={{ margin: 0 }}>
                  Total:{' '}
                  <span className="dhara-rpt-amt is-gold">{formatCurrency(incomeQuery.data.totalAmount)}</span> (
                  {incomeQuery.data.total} payments)
                </p>
                <ReportExportBar
                  reportId="report-export-income"
                  reportTitle={`Income-Report-${incomeQuery.data.period.dateFrom}`}
                  headers={['Date', 'Receipt', 'Client', 'Invoice', 'Booking', 'Method', 'Amount']}
                  rows={incomeRows}
                />
              </div>
              <ReportTable
                headers={['Date', 'Receipt', 'Client', 'Invoice', 'Booking', 'Method', 'Amount']}
                rows={incomeRows.map((r) => [
                  r[0] as string,
                  r[1] as string,
                  r[2] as string,
                  r[3] as string,
                  r[4] as string,
                  r[5] as string,
                  formatCurrency(r[6] as number),
                ])}
                emptyMessage="No income records for this period."
              />
            </div>
          )}

          {tab === 'payments' && paymentsQuery.data && (
            <div id="report-export-payments" className="space-y-4">
              <div className="dhara-rpt-toolbar-head">
                <p className="dhara-rpt-note" style={{ margin: 0 }}>
                  Total:{' '}
                  <span className="dhara-rpt-amt is-gold">{formatCurrency(paymentsQuery.data.totalAmount)}</span> (
                  {paymentsQuery.data.total} payments)
                </p>
                <ReportExportBar
                  reportId="report-export-payments"
                  reportTitle={`Payments-Report-${paymentsQuery.data.period.dateFrom}`}
                  headers={['Date', 'Receipt', 'Client', 'Invoice', 'Booking', 'Method', 'Amount']}
                  rows={paymentRows}
                />
              </div>
              <ReportTable
                headers={['Date', 'Receipt', 'Client', 'Invoice', 'Booking', 'Method', 'Amount']}
                rows={paymentRows.map((r) => [
                  r[0] as string,
                  r[1] as string,
                  r[2] as string,
                  r[3] as string,
                  r[4] as string,
                  r[5] as string,
                  formatCurrency(r[6] as number),
                ])}
                emptyMessage="No payments recorded for this period."
              />
            </div>
          )}

          {tab === 'expenses' && expensesQuery.data && (
            <div id="report-export-expenses" className="space-y-4">
              <div className="dhara-rpt-toolbar-head">
                <p className="dhara-rpt-note" style={{ margin: 0 }}>
                  Total:{' '}
                  <span className="dhara-rpt-amt is-out">{formatCurrency(expensesQuery.data.totalAmount)}</span>
                </p>
                <ReportExportBar
                  reportId="report-export-expenses"
                  reportTitle={`Expense-Report-${expensesQuery.data.period.dateFrom}`}
                  headers={['Date', 'Category', 'Description', 'Staff', 'Booking', 'Amount']}
                  rows={expenseRows}
                />
              </div>
              <ReportTable
                headers={['Date', 'Category', 'Description', 'Staff', 'Booking', 'Amount']}
                rows={expenseRows.map((r) => [
                  r[0] as string,
                  r[1] as string,
                  r[2] as string,
                  r[3] as string,
                  r[4] as string,
                  formatCurrency(r[5] as number),
                ])}
                emptyMessage="No expenses for this period."
              />
            </div>
          )}

          {tab === 'profit' && profitQuery.data && (
            <div id="report-export-profit" className="space-y-4">
              <ReportExportBar
                reportId="report-export-profit"
                reportTitle={`Profit-Loss-${profitQuery.data.period.dateFrom}`}
                headers={['Metric', 'Value']}
                rows={[
                  ['Cash Received', profitQuery.data.cashReceived],
                  ['Total Expenses', profitQuery.data.totalExpenses],
                  ['Net Profit / Loss', profitQuery.data.netProfit],
                  ['Profit Margin %', profitQuery.data.profitMarginPercent],
                  ['Invoice Revenue (info)', profitQuery.data.invoiceRevenue],
                ]}
              />
              <div className="dhara-rpt-kpis is-3">
                <KpiCard
                  label="Cash Received"
                  value={profitQuery.data.cashReceived}
                  icon={ArrowDownLeft}
                  tone="is-green"
                />
                <KpiCard
                  label="Total Expenses"
                  value={profitQuery.data.totalExpenses}
                  icon={ArrowUpRight}
                  tone="is-rose"
                />
                <KpiCard
                  label="Net Profit / Loss"
                  value={profitQuery.data.netProfit}
                  icon={profitQuery.data.netProfit >= 0 ? TrendingUp : TrendingDown}
                  tone={profitQuery.data.netProfit >= 0 ? 'is-green' : 'is-rose'}
                />
                <KpiCard
                  label="Profit Margin"
                  value={profitQuery.data.profitMarginPercent}
                  icon={BarChart3}
                  tone="is-gold"
                  isPercent
                />
                <KpiCard
                  label="Invoice Revenue (info)"
                  value={profitQuery.data.invoiceRevenue}
                  icon={Wallet}
                  tone="is-cyan"
                />
              </div>
              <p className="dhara-rpt-note">
                Net Profit = Cash Received − Total Expenses. Staff payments are included in expenses (not
                double-counted).
              </p>
            </div>
          )}

          {tab === 'profit' && !profitQuery.data && !profitQuery.isLoading && !profitQuery.error && (
            <ReportEmptyState message="No profit & loss data for this period." />
          )}

          {tab === 'bookings' && (
            <div id="report-export-bookings" className="space-y-4">
              <ReportExportBar
                reportId="report-export-bookings"
                reportTitle={`Booking-Profit-${bookingsQuery.data?.period.dateFrom ?? 'report'}`}
                headers={['Booking', 'Client', 'Event', 'Amount', 'Received', 'Outstanding', 'Expenses', 'Profit']}
                rows={bookingRows}
              />
              <ReportTable
                headers={['Booking', 'Client', 'Event', 'Amount', 'Received', 'Outstanding', 'Expenses', 'Profit']}
                rows={(bookingsQuery.data?.items ?? []).map((row) => [
                  row.bookingNumber,
                  row.clientName,
                  row.eventDate ?? '—',
                  formatCurrency(row.totalAmount),
                  formatCurrency(row.received),
                  formatCurrency(row.outstanding),
                  formatCurrency(row.expenses),
                  formatCurrency(row.profit),
                ])}
                emptyMessage="No bookings for this period."
                onRowClick={(index) => {
                  const item = bookingsQuery.data?.items[index];
                  if (item) setSelectedBookingId(item.bookingId);
                }}
              />
            </div>
          )}

          {tab === 'staff' && (
            <div id="report-export-staff" className="space-y-4">
              <p className="dhara-rpt-note" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <UserCog />
                Staff costs are part of total expenses — not added separately to avoid double-counting.
              </p>
              <ReportExportBar
                reportId="report-export-staff"
                reportTitle={`Staff-Report-${staffQuery.data?.period.dateFrom ?? 'report'}`}
                headers={['Staff', 'Code', 'Assignments', 'Total Payments', 'Monthly Cost']}
                rows={staffRows}
              />
              <ReportTable
                headers={['Staff', 'Code', 'Assignments', 'Total Payments', 'Monthly Cost']}
                rows={(staffQuery.data?.items ?? []).map((row) => [
                  row.staffName,
                  row.staffCode,
                  String(row.assignmentsCount),
                  formatCurrency(row.totalPayments),
                  formatCurrency(row.monthlyCost),
                ])}
                emptyMessage="No staff payments for this period."
              />
            </div>
          )}

          {tab === 'monthly' && (
            <div id="report-export-monthly" className="space-y-4">
              <ReportExportBar
                reportId="report-export-monthly"
                reportTitle={`Monthly-Report-${monthlyYear}`}
                headers={[
                  'Month',
                  'Bookings',
                  'Invoice',
                  'Received',
                  'Expenses',
                  'Staff Payments',
                  'Profit',
                  'Outstanding',
                ]}
                rows={monthlyRows}
              />
              <ReportTable
                headers={[
                  'Month',
                  'Bookings',
                  'Invoice',
                  'Received',
                  'Expenses',
                  'Staff Payments',
                  'Profit',
                  'Outstanding',
                ]}
                rows={(monthlyQuery.data ?? []).map((row) => [
                  row.label,
                  String(row.bookingsCount),
                  formatCurrency(row.revenue),
                  formatCurrency(row.received),
                  formatCurrency(row.expenses),
                  formatCurrency(row.staffPayments ?? 0),
                  formatCurrency(row.profit),
                  formatCurrency(row.outstanding),
                ])}
                emptyMessage="No monthly data available."
              />
            </div>
          )}

          {tab === 'transactions' && transactionsQuery.data && (
            <div id="report-export-transactions" className="space-y-4">
              <div className="dhara-rpt-toolbar-head">
                <p className="dhara-rpt-note" style={{ margin: 0 }}>
                  Income:{' '}
                  <span className="dhara-rpt-amt is-in">
                    {formatCurrency(transactionsQuery.data.totalIncome)}
                  </span>
                  {' · '}
                  Expenses:{' '}
                  <span className="dhara-rpt-amt is-out">
                    {formatCurrency(transactionsQuery.data.totalExpense)}
                  </span>
                </p>
                <ReportExportBar
                  reportId="report-export-transactions"
                  reportTitle={`Transactions-${transactionsQuery.data.period.dateFrom}`}
                  headers={[
                    'Date',
                    'Type',
                    'Description',
                    'Client',
                    'Booking',
                    'Method',
                    'Income',
                    'Expense',
                    'Balance',
                  ]}
                  rows={txnRows}
                />
              </div>
              <ReportTable
                headers={[
                  'Date',
                  'Type',
                  'Description',
                  'Client',
                  'Booking',
                  'Method',
                  'Income',
                  'Expense',
                  'Balance',
                ]}
                rows={transactionItems.map((row) => [
                  row.date,
                  row.type,
                  row.description,
                  row.clientName ?? '—',
                  row.bookingNumber ?? '—',
                  row.paymentMethod ?? '—',
                  row.income > 0 ? formatCurrency(row.income) : '—',
                  row.expense > 0 ? formatCurrency(row.expense) : '—',
                  formatCurrency(row.runningBalance),
                ])}
                emptyMessage="No transactions for this period."
              />
            </div>
          )}
        </>
      )}
    </div>

      <BookingProfitabilityModal
        open={Boolean(selectedBookingId)}
        data={bookingDetailQuery.data ?? null}
        loading={bookingDetailQuery.isLoading}
        onClose={() => setSelectedBookingId(null)}
      />
    </>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  isCount,
  isPercent,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone: KpiTone;
  isCount?: boolean;
  isPercent?: boolean;
}) {
  return (
    <article className={cn('dhara-rpt-kpi', tone)}>
      <div className="dhara-rpt-kpi-top">
        <div>
          <h3>{label}</h3>
        </div>
        <span className="dhara-rpt-icon">
          <Icon />
        </span>
      </div>
      <strong>
        <ReportsCountUp
          value={value}
          mode={isCount ? 'integer' : isPercent ? 'percent' : 'currency'}
        />
      </strong>
    </article>
  );
}

function ReportSummaryCards({
  cards,
  loading,
}: {
  cards: Array<{
    label: string;
    value: number;
    icon: ComponentType<{ className?: string }>;
    tone: KpiTone;
    isCount?: boolean;
  }>;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="dhara-rpt-kpis is-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dhara-rpt-skeleton" style={{ minHeight: '8.5rem' }} />
        ))}
      </div>
    );
  }

  if (cards.length === 0) return null;

  return (
    <div className="dhara-rpt-kpis is-3">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}

function ReportEmptyState({ message }: { message: string }) {
  return (
    <div className="dhara-rpt-empty">
      <BarChart3 />
      <h3>{message}</h3>
    </div>
  );
}

function ReportTable({
  headers,
  rows,
  emptyMessage,
  onRowClick,
}: {
  headers: string[];
  rows: string[][];
  emptyMessage: string;
  onRowClick?: (index: number) => void;
}) {
  if (rows.length === 0) {
    return <ReportEmptyState message={emptyMessage} />;
  }

  return (
    <div className="dhara-rpt-card">
      <div className="dhara-rpt-table-wrap">
        <table className="dhara-rpt-table">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(index)}
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
