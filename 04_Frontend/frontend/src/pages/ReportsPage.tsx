import { useMemo, useState } from 'react';
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
import { BookingProfitabilityModal } from '@/components/reports/BookingProfitabilityModal';
import { ReportChartsSection } from '@/components/reports/ReportChartsSection';
import { ReportExportBar } from '@/components/reports/ReportExportBar';
import { formatCurrency } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { firstOfMonthIso, getStudioDateParts, todayIso } from '@/utils/studio-date';
import { cn } from '@/utils/cn';

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

  const coreSummaryCards = dashboard
    ? [
        { label: 'Total Invoice Value', value: dashboard.totalInvoiceValue, icon: TrendingUp, color: 'text-gold' },
        { label: 'Total Received', value: dashboard.totalPaymentsReceived, icon: ArrowDownLeft, color: 'text-green-400' },
        { label: 'Total Expenses', value: dashboard.totalExpenses, icon: ArrowUpRight, color: 'text-red-400' },
        { label: 'Outstanding (period invoices)', value: dashboard.totalOutstanding, icon: Wallet, color: 'text-orange-400' },
        {
          label: 'Net Profit',
          value: dashboard.netProfit,
          icon: dashboard.netProfit >= 0 ? TrendingUp : TrendingDown,
          color: dashboard.netProfit >= 0 ? 'text-green-400' : 'text-red-400',
        },
        { label: 'Bookings', value: dashboard.bookingsCount, icon: BookOpen, color: 'text-gold', isCount: true },
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
        color:
          metric.key === 'albumVendorCost'
            ? 'text-red-400'
            : metric.key === 'albumProfit'
              ? metric.value >= 0
                ? 'text-green-400'
                : 'text-red-400'
              : 'text-gold',
      }))
    : [];

  const dashboardCards = dashboard
    ? [
        { label: 'Total Invoice Value', value: dashboard.totalInvoiceValue, icon: TrendingUp, color: 'text-gold' },
        { label: 'Payments Received', value: dashboard.totalPaymentsReceived, icon: ArrowDownLeft, color: 'text-green-400' },
        { label: 'Outstanding (period invoices)', value: dashboard.totalOutstanding, icon: Wallet, color: 'text-orange-400' },
        { label: 'Total Expenses', value: dashboard.totalExpenses, icon: ArrowUpRight, color: 'text-red-400' },
        {
          label: 'Net Profit / Loss',
          value: dashboard.netProfit,
          icon: dashboard.netProfit >= 0 ? TrendingUp : TrendingDown,
          color: dashboard.netProfit >= 0 ? 'text-green-400' : 'text-red-400',
        },
        { label: 'Bookings', value: dashboard.bookingsCount, icon: BookOpen, color: 'text-gold', isCount: true },
        { label: 'Paid Invoices', value: dashboard.paidInvoicesCount, icon: TrendingUp, color: 'text-green-400', isCount: true },
        { label: 'Unpaid Invoices', value: dashboard.unpaidInvoicesCount, icon: TrendingDown, color: 'text-orange-400', isCount: true },
        { label: 'Avg Booking Value', value: dashboard.averageBookingValue, icon: BarChart3, color: 'text-gold' },
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

  const txnRows = (transactionsQuery.data?.items ?? []).map((row) => [
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-gold">Reports & BI</h1>
          <p className="text-sm text-gray-400">
            Business intelligence — income, expenses, profitability and trends
          </p>
          {periodLabel && tab !== 'monthly' && (
            <p className="mt-1 text-xs text-gray-500">
              <CalendarRange className="mr-1 inline h-3.5 w-3.5" />
              Period: {periodLabel}
            </p>
          )}
        </div>
      </div>

      {tab !== 'monthly' && (
        <div className="card space-y-4">
          <div className="flex flex-wrap gap-2">
            {REPORT_DATE_PRESETS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  preset === item.value
                    ? 'bg-gold/15 text-gold ring-1 ring-gold/30'
                    : 'bg-surface-elevated text-gray-400 hover:text-gray-200',
                )}
                onClick={() => selectPreset(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs text-gray-500">From</label>
                <input type="date" className="input-field" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-gray-500">To</label>
                <input type="date" className="input-field" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          )}

          <button type="button" className="btn-primary" onClick={() => applyFilters()}>
            Apply Filters
          </button>
          {filterError && <p className="text-sm text-red-400">{filterError}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-surface-border pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              'rounded-t-lg px-4 py-2 text-sm font-medium transition',
              tab === item.id ? 'bg-gold/15 text-gold' : 'text-gray-500 hover:text-gray-300',
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {(tab === 'income' || tab === 'payments' || tab === 'expenses' || tab === 'transactions') && (
        <div className="card flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              className="input-field pl-9"
              placeholder="Search reports…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
            />
          </div>
          <button type="button" className="btn-secondary" onClick={() => setSearch(searchInput)}>
            Search
          </button>
          {tab === 'transactions' && (
            <div className="flex gap-2">
              {(['all', 'income', 'expense'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs capitalize',
                    txnType === type ? 'bg-gold/15 text-gold' : 'bg-surface-elevated text-gray-400',
                  )}
                  onClick={() => setTxnType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'monthly' && (
        <div className="card flex items-center gap-3">
          <label className="text-sm text-gray-400">Year</label>
          <select
            className="input-field w-32"
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
      )}

      {activeError && (
        <div className="card border-red-500/30 text-red-400">
          {getApiErrorMessage(activeError, 'Failed to load report data.')}
        </div>
      )}

      {tab !== 'monthly' && tab !== 'dashboard' && (
        <ReportSummaryCards cards={coreSummaryCards} loading={dashboardQuery.isLoading} />
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-surface-elevated" />
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dashboardCards.map((card) => (
                  <div key={card.label} className="card border-gold/10 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wider text-gray-500">{card.label}</p>
                      <card.icon className={cn('h-4 w-4', card.color)} />
                    </div>
                    <p className={cn('mt-2 font-display text-xl font-bold', card.color)}>
                      {'isCount' in card && card.isCount ? card.value : formatCurrency(card.value as number)}
                    </p>
                  </div>
                ))}
              </div>
              <ReportChartsSection charts={chartsQuery.data} />
            </div>
          )}

          {tab === 'income' && incomeQuery.data && (
            <div id="report-export-income" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Total: <span className="font-semibold text-gold">{formatCurrency(incomeQuery.data.totalAmount)}</span>
                  {' '}({incomeQuery.data.total} payments)
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
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Total: <span className="font-semibold text-gold">{formatCurrency(paymentsQuery.data.totalAmount)}</span>
                  {' '}({paymentsQuery.data.total} payments)
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
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Total: <span className="font-semibold text-red-400">{formatCurrency(expensesQuery.data.totalAmount)}</span>
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: 'Cash Received', value: profitQuery.data.cashReceived, color: 'text-green-400' },
                  { label: 'Total Expenses', value: profitQuery.data.totalExpenses, color: 'text-red-400' },
                  {
                    label: 'Net Profit / Loss',
                    value: profitQuery.data.netProfit,
                    color: profitQuery.data.netProfit >= 0 ? 'text-green-400' : 'text-red-400',
                  },
                  { label: 'Profit Margin', value: `${profitQuery.data.profitMarginPercent}%`, color: 'text-gold', isText: true },
                  { label: 'Invoice Revenue (info)', value: profitQuery.data.invoiceRevenue, color: 'text-gray-400' },
                ].map((card) => (
                  <div key={card.label} className="card border-gold/10 p-5">
                    <p className="text-xs uppercase tracking-wider text-gray-500">{card.label}</p>
                    <p className={cn('mt-2 font-display text-2xl font-bold', card.color)}>
                      {'isText' in card && card.isText ? card.value : formatCurrency(card.value as number)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Net Profit = Cash Received − Total Expenses. Staff payments are included in expenses (not double-counted).
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
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <UserCog className="h-4 w-4" />
                Staff costs are part of total expenses — not added separately to avoid double-counting.
              </div>
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
                headers={['Month', 'Bookings', 'Invoice', 'Received', 'Expenses', 'Staff Payments', 'Profit', 'Outstanding']}
                rows={monthlyRows}
              />
              <ReportTable
                headers={['Month', 'Bookings', 'Invoice', 'Received', 'Expenses', 'Staff Payments', 'Profit', 'Outstanding']}
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
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Income: <span className="text-green-400">{formatCurrency(transactionsQuery.data.totalIncome)}</span>
                  {' · '}
                  Expenses: <span className="text-red-400">{formatCurrency(transactionsQuery.data.totalExpense)}</span>
                </p>
                <ReportExportBar
                  reportId="report-export-transactions"
                  reportTitle={`Transactions-${transactionsQuery.data.period.dateFrom}`}
                  headers={['Date', 'Type', 'Description', 'Client', 'Booking', 'Method', 'Income', 'Expense', 'Balance']}
                  rows={txnRows}
                />
              </div>
              <ReportTable
                headers={['Date', 'Type', 'Description', 'Client', 'Booking', 'Method', 'Income', 'Expense', 'Balance']}
                rows={(transactionsQuery.data.items ?? []).map((row) => [
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

      <BookingProfitabilityModal
        open={Boolean(selectedBookingId)}
        data={bookingDetailQuery.data ?? null}
        loading={bookingDetailQuery.isLoading}
        onClose={() => setSelectedBookingId(null)}
      />
    </div>
  );
}

function ReportSummaryCards({
  cards,
  loading,
}: {
  cards: Array<{
    label: string;
    value: number;
    icon: typeof TrendingUp;
    color: string;
    isCount?: boolean;
  }>;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-24 animate-pulse bg-surface-elevated" />
        ))}
      </div>
    );
  }

  if (cards.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="card border-gold/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-gray-500">{card.label}</p>
            <card.icon className={cn('h-4 w-4', card.color)} />
          </div>
          <p className={cn('mt-2 font-display text-lg font-bold', card.color)}>
            {card.isCount ? card.value : formatCurrency(card.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function ReportEmptyState({ message }: { message: string }) {
  return (
    <div className="card flex min-h-48 flex-col items-center justify-center text-center">
      <BarChart3 className="h-12 w-12 text-gray-600" />
      <p className="mt-3 text-gray-400">{message}</p>
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
    <div className="card overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-3 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className={cn(
                'border-b border-surface-border/60 text-gray-300',
                onRowClick && 'cursor-pointer hover:bg-gold/5',
              )}
              onClick={() => onRowClick?.(index)}
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="whitespace-nowrap px-3 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
